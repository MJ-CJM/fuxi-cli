/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type {
  Config,
  EditorType,
  GeminiClient,
  ServerGeminiChatCompressedEvent,
  ServerGeminiContentEvent as ContentEvent,
  ServerGeminiFinishedEvent,
  ServerGeminiStreamEvent as GeminiEvent,
  ThoughtSummary,
  ToolCallRequestInfo,
  GeminiErrorEventValue,
} from '@google/gemini-cli-core';
import {
  GeminiEventType as ServerGeminiEventType,
  getErrorMessage,
  isNodeError,
  MessageSenderType,
  logUserPrompt,
  GitService,
  UnauthorizedError,
  UserPromptEvent,
  DEFAULT_GEMINI_FLASH_MODEL,
  logConversationFinishedEvent,
  ConversationFinishedEvent,
  ApprovalMode,
  parseAndFormatApiError,
  ToolConfirmationOutcome,
  promptIdContext,
  WRITE_FILE_TOOL_NAME,
  tokenLimit,
} from '@google/gemini-cli-core';
import { type Part, type PartListUnion, FinishReason } from '@google/genai';
import type {
  HistoryItem,
  HistoryItemWithoutId,
  HistoryItemToolGroup,
  SlashCommandProcessorResult,
} from '../types.js';
import { StreamingState, MessageType, ToolCallStatus } from '../types.js';
import { isAtCommand, isSlashCommand } from '../utils/commandUtils.js';
import { useShellCommandProcessor } from './shellCommandProcessor.js';
import { handleAtCommand } from './atCommandProcessor.js';
import { detectAgentCommand, isAgentCommand } from './agentCommandProcessor.js';
import { findLastSafeSplitPoint } from '../utils/markdownUtilities.js';
import { useStateAndRef } from './useStateAndRef.js';
import type { UseHistoryManagerReturn } from './useHistoryManager.js';
import { useLogger } from './useLogger.js';
import {
  useReactToolScheduler,
  mapToDisplay as mapTrackedToolCallsToDisplay,
  type TrackedToolCall,
  type TrackedCompletedToolCall,
  type TrackedCancelledToolCall,
  type TrackedWaitingToolCall,
} from './useReactToolScheduler.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { useSessionStats } from '../contexts/SessionContext.js';
import { useKeypress } from './useKeypress.js';
import type { LoadedSettings } from '../../config/settings.js';

enum StreamProcessingStatus {
  Completed,
  UserCancelled,
  Error,
}

const EDIT_TOOL_NAMES = new Set(['replace', WRITE_FILE_TOOL_NAME]);

function showCitations(settings: LoadedSettings): boolean {
  const enabled = settings?.merged?.ui?.showCitations;
  if (enabled !== undefined) {
    return enabled;
  }
  return true;
}

/**
 * Manages the Gemini stream, including user input, command processing,
 * API interaction, and tool call lifecycle.
 */
export const useGeminiStream = (
  geminiClient: GeminiClient,
  history: HistoryItem[],
  addItem: UseHistoryManagerReturn['addItem'],
  config: Config,
  settings: LoadedSettings,
  onDebugMessage: (message: string) => void,
  handleSlashCommand: (
    cmd: PartListUnion,
  ) => Promise<SlashCommandProcessorResult | false>,
  shellModeActive: boolean,
  getPreferredEditor: () => EditorType | undefined,
  onAuthError: (error: string) => void,
  performMemoryRefresh: () => Promise<void>,
  modelSwitchedFromQuotaError: boolean,
  setModelSwitchedFromQuotaError: React.Dispatch<React.SetStateAction<boolean>>,
  onEditorClose: () => void,
  onCancelSubmit: () => void,
  setShellInputFocused: (value: boolean) => void,
  terminalWidth: number,
  terminalHeight: number,
  isShellFocused?: boolean,
  planModeActive?: boolean,
  setCurrentPlan?: (plan: any) => void,
  executionQueue?: {
    active: boolean;
    mode: 'default' | 'auto_edit';
    currentIndex: number;
    totalCount: number;
    executingTodoId: string | null;
  } | null,
  todos?: any[],
  updateTodo?: (id: string, updates: any) => void,
  setExecutionQueue?: (queue: any) => void,
) => {
  const [initError, setInitError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const turnCancelledRef = useRef(false);
  const [isResponding, setIsResponding] = useState<boolean>(false);
  const [thought, setThought] = useState<ThoughtSummary | null>(null);
  
  // Refs to store functions and state to avoid circular dependency and closure issues
  const submitQueryRef = useRef<((query: string) => void) | null>(null);
  const executionQueueRef = useRef(executionQueue);
  const todosRef = useRef(todos);
  const updateTodoRef = useRef(updateTodo);
  const setExecutionQueueRef = useRef(setExecutionQueue);
  
  // Keep refs in sync with props
  useEffect(() => {
    executionQueueRef.current = executionQueue;
  }, [executionQueue]);
  
  useEffect(() => {
    todosRef.current = todos;
  }, [todos]);
  
  useEffect(() => {
    updateTodoRef.current = updateTodo;
  }, [updateTodo]);
  
  useEffect(() => {
    setExecutionQueueRef.current = setExecutionQueue;
  }, [setExecutionQueue]);

  // Sync Plan mode state to GeminiClient
  useEffect(() => {
    if (planModeActive !== undefined) {
      geminiClient.setPlanModeActive(planModeActive);
    }
  }, [planModeActive, geminiClient]);

  // Auto-continuation for batch todo execution
  // Returns the prompt to execute next, or null if done
  const handleNextTodo = useCallback(async (): Promise<string | null> => {
    // Use refs to get the latest values
    const currentQueue = executionQueueRef.current;
    const currentTodos = todosRef.current;
    const currentUpdateTodo = updateTodoRef.current;
    const currentSetExecutionQueue = setExecutionQueueRef.current;
    
    console.log('[handleNextTodo] Starting', {
      hasExecutionQueue: !!currentQueue,
      isActive: currentQueue?.active,
      hasTodos: !!currentTodos,
      hasUpdateTodo: !!currentUpdateTodo,
      hasSetExecutionQueue: !!currentSetExecutionQueue,
      executingTodoId: currentQueue?.executingTodoId,
    });
    
    if (!currentQueue || !currentQueue.active || !currentTodos || !currentUpdateTodo || !currentSetExecutionQueue) {
      console.log('[handleNextTodo] Early return - missing required dependencies');
      return null;
    }

    // Mark current todo as completed
    if (currentQueue.executingTodoId) {
      console.log('[handleNextTodo] Marking todo as completed:', currentQueue.executingTodoId);
      currentUpdateTodo(currentQueue.executingTodoId, { 
        status: 'completed',
        completedAt: new Date(),
      });
    }

    // Import utility function
    const { getNextExecutableTodo } = await import('../../utils/todoUtils.js');
    
    // Find next executable todo
    const nextTodo = getNextExecutableTodo(currentTodos);
    console.log('[handleNextTodo] Next executable todo:', nextTodo ? nextTodo.id : 'null');
    
    if (!nextTodo) {
      // No more todos to execute - batch complete
      console.log('[handleNextTodo] Batch execution complete');
      addItem(
        {
          type: 'info',
          text: 
            `✅ **Batch Execution Complete!**\n\n` +
            `📊 Executed ${currentQueue.currentIndex}/${currentQueue.totalCount} todos\n\n` +
            `Use /todos list to see final status`,
        },
        Date.now(),
      );
      
      // Clear execution queue
      currentSetExecutionQueue(null);
      
      // Restore original approval mode (if it was changed)
      const { ApprovalMode } = await import('@google/gemini-cli-core');
      config.setApprovalMode(ApprovalMode.DEFAULT);
      
      return null;
    }

    // Update execution queue with next todo
    const newIndex = currentQueue.currentIndex + 1;
    console.log('[handleNextTodo] Updating execution queue:', { newIndex, nextTodoId: nextTodo.id });
    currentSetExecutionQueue({
      ...currentQueue,
      currentIndex: newIndex,
      executingTodoId: nextTodo.id,
    });

    // Mark next todo as in_progress
    console.log('[handleNextTodo] Marking next todo as in_progress:', nextTodo.id);
    currentUpdateTodo(nextTodo.id, { status: 'in_progress' });

    // Display progress
    addItem(
      {
        type: 'info',
        text: 
          `▶️  **[${newIndex}/${currentQueue.totalCount}]** ${nextTodo.description}\n` +
          (nextTodo.module ? `📦 Module: ${nextTodo.module}\n` : '') +
          (nextTodo.estimatedTime ? `⏱️  Estimated: ${nextTodo.estimatedTime}\n` : ''),
      },
      Date.now(),
    );

    // Build execution prompt for next todo
    let prompt = `[Batch Execution ${newIndex}/${currentQueue.totalCount}] ${nextTodo.description}\n\n`;
    
    if (nextTodo.risks && nextTodo.risks.length > 0) {
      prompt += `⚠️ Risks to consider:\n${nextTodo.risks.map((r: string) => `- ${r}`).join('\n')}\n\n`;
    }
    
    prompt += `Complete this task thoroughly and report when done.`;

    return prompt;
  }, [addItem, config]); // Only stable dependencies - use refs for dynamic values
  const [pendingHistoryItem, pendingHistoryItemRef, setPendingHistoryItem] =
    useStateAndRef<HistoryItemWithoutId | null>(null);
  const processedMemoryToolsRef = useRef<Set<string>>(new Set());
  const { startNewPrompt, getPromptCount } = useSessionStats();
  const storage = config.storage;
  const logger = useLogger(storage);
  const gitService = useMemo(() => {
    if (!config.getProjectRoot()) {
      return;
    }
    return new GitService(config.getProjectRoot(), storage);
  }, [config, storage]);

  const [toolCalls, scheduleToolCalls, markToolsAsSubmitted] =
    useReactToolScheduler(
      async (completedToolCallsFromScheduler) => {
        // This onComplete is called when ALL scheduled tools for a given batch are done.
        if (completedToolCallsFromScheduler.length > 0) {
          // Check for create_plan tool and save plan data
          for (const toolCall of completedToolCallsFromScheduler) {
            if (toolCall.request.name === 'create_plan' && setCurrentPlan) {
              try {
                const args = toolCall.request.args;
                const planData = {
                  title: args['title'],
                  overview: args['overview'],
                  steps: args['steps'] || [],
                  risks: args['risks'],
                  testingStrategy: args['testingStrategy'],
                  estimatedDuration: args['estimatedDuration'],
                  createdAt: new Date(),
                };
                setCurrentPlan(planData);
              } catch (error) {
                console.error('Error saving plan data:', error);
              }
            }
          }

          // Add the final state of these tools to the history for display.
          addItem(
            mapTrackedToolCallsToDisplay(
              completedToolCallsFromScheduler as TrackedToolCall[],
            ),
            Date.now(),
          );

          // Record tool calls with full metadata before sending responses.
          try {
            // Note: getCurrentSequenceModel() is not yet implemented
            const currentModel = config.getModel();
            config
              .getGeminiClient()
              .getChat()
              .recordCompletedToolCalls(
                currentModel,
                completedToolCallsFromScheduler,
              );
          } catch (error) {
            console.error(
              `Error recording completed tool call information: ${error}`,
            );
          }

          // Handle tool response submission immediately when tools complete
          await handleCompletedTools(
            completedToolCallsFromScheduler as TrackedToolCall[],
          );
        }
      },
      config,
      getPreferredEditor,
      onEditorClose,
    );

  const pendingToolCallGroupDisplay = useMemo(
    () =>
      toolCalls.length ? mapTrackedToolCallsToDisplay(toolCalls) : undefined,
    [toolCalls],
  );

  const activeToolPtyId = useMemo(() => {
    const executingShellTool = toolCalls?.find(
      (tc) =>
        tc.status === 'executing' && tc.request.name === 'run_shell_command',
    );
    if (executingShellTool) {
      return (executingShellTool as { pid?: number }).pid;
    }
    return undefined;
  }, [toolCalls]);

  const loopDetectedRef = useRef(false);
  const [
    loopDetectionConfirmationRequest,
    setLoopDetectionConfirmationRequest,
  ] = useState<{
    onComplete: (result: { userSelection: 'disable' | 'keep' }) => void;
  } | null>(null);

  const onExec = useCallback(async (done: Promise<void>) => {
    setIsResponding(true);
    await done;
    setIsResponding(false);
  }, []);
  const { handleShellCommand, activeShellPtyId } = useShellCommandProcessor(
    addItem,
    setPendingHistoryItem,
    onExec,
    onDebugMessage,
    config,
    geminiClient,
    setShellInputFocused,
    terminalWidth,
    terminalHeight,
  );

  const activePtyId = activeShellPtyId || activeToolPtyId;

  useEffect(() => {
    if (!activePtyId) {
      setShellInputFocused(false);
    }
  }, [activePtyId, setShellInputFocused]);

  const streamingState = useMemo(() => {
    if (toolCalls.some((tc) => tc.status === 'awaiting_approval')) {
      return StreamingState.WaitingForConfirmation;
    }
    if (
      isResponding ||
      toolCalls.some(
        (tc) =>
          tc.status === 'executing' ||
          tc.status === 'scheduled' ||
          tc.status === 'validating' ||
          ((tc.status === 'success' ||
            tc.status === 'error' ||
            tc.status === 'cancelled') &&
            !(tc as TrackedCompletedToolCall | TrackedCancelledToolCall)
              .responseSubmittedToGemini),
      )
    ) {
      return StreamingState.Responding;
    }
    return StreamingState.Idle;
  }, [isResponding, toolCalls]);

  useEffect(() => {
    if (
      config.getApprovalMode() === ApprovalMode.YOLO &&
      streamingState === StreamingState.Idle
    ) {
      const lastUserMessageIndex = history.findLastIndex(
        (item: HistoryItem) => item.type === MessageType.USER,
      );

      const turnCount =
        lastUserMessageIndex === -1 ? 0 : history.length - lastUserMessageIndex;

      if (turnCount > 0) {
        logConversationFinishedEvent(
          config,
          new ConversationFinishedEvent(config.getApprovalMode(), turnCount),
        );
      }
    }
  }, [streamingState, config, history]);

  const cancelOngoingRequest = useCallback(() => {
    if (streamingState !== StreamingState.Responding) {
      return;
    }
    if (turnCancelledRef.current) {
      return;
    }
    turnCancelledRef.current = true;
    abortControllerRef.current?.abort();
    if (pendingHistoryItemRef.current) {
      addItem(pendingHistoryItemRef.current, Date.now());
    }
    addItem(
      {
        type: MessageType.INFO,
        text: 'Request cancelled.',
      },
      Date.now(),
    );
    setPendingHistoryItem(null);
    onCancelSubmit();
    setIsResponding(false);
    setShellInputFocused(false);
  }, [
    streamingState,
    addItem,
    setPendingHistoryItem,
    onCancelSubmit,
    pendingHistoryItemRef,
    setShellInputFocused,
  ]);

  useKeypress(
    (key) => {
      if (key.name === 'escape' && !isShellFocused) {
        cancelOngoingRequest();
      }
    },
    { isActive: streamingState === StreamingState.Responding },
  );

  const prepareQueryForGemini = useCallback(
    async (
      query: PartListUnion,
      userMessageTimestamp: number,
      abortSignal: AbortSignal,
      prompt_id: string,
    ): Promise<{
      queryToSend: PartListUnion | null;
      shouldProceed: boolean;
    }> => {
      if (turnCancelledRef.current) {
        return { queryToSend: null, shouldProceed: false };
      }
      if (typeof query === 'string' && query.trim().length === 0) {
        return { queryToSend: null, shouldProceed: false };
      }

      let localQueryToSendToGemini: PartListUnion | null = null;

      if (typeof query === 'string') {
        const trimmedQuery = query.trim();
        onDebugMessage(`User query: '${trimmedQuery}'`);
        await logger?.logMessage(MessageSenderType.USER, trimmedQuery);

        // Handle UI-only commands first
        const slashCommandResult = isSlashCommand(trimmedQuery)
          ? await handleSlashCommand(trimmedQuery)
          : false;

        if (slashCommandResult) {
          switch (slashCommandResult.type) {
            case 'schedule_tool': {
              const { toolName, toolArgs } = slashCommandResult;
              const toolCallRequest: ToolCallRequestInfo = {
                callId: `${toolName}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                name: toolName,
                args: toolArgs,
                isClientInitiated: true,
                prompt_id,
              };
              scheduleToolCalls([toolCallRequest], abortSignal);
              return { queryToSend: null, shouldProceed: false };
            }
            case 'submit_prompt': {
              localQueryToSendToGemini = slashCommandResult.content;

              return {
                queryToSend: localQueryToSendToGemini,
                shouldProceed: true,
              };
            }
            case 'handled': {
              return { queryToSend: null, shouldProceed: false };
            }
            default: {
              const unreachable: never = slashCommandResult;
              throw new Error(
                `Unhandled slash command result type: ${unreachable}`,
              );
            }
          }
        }

        if (shellModeActive && handleShellCommand(trimmedQuery, abortSignal)) {
          return { queryToSend: null, shouldProceed: false };
        }

        // Handle agent commands (natural language agent invocation)
        if (isAgentCommand(trimmedQuery)) {
          onDebugMessage(`[AGENT] Detected agent command pattern: ${trimmedQuery}`);
          const agentMatch = detectAgentCommand(trimmedQuery);
          if (agentMatch) {
            onDebugMessage(`[AGENT] Matched agent: ${agentMatch.agentName}, prompt: ${agentMatch.prompt}`);

            // Show user's original query
            addItem(
              { type: MessageType.USER, text: trimmedQuery },
              userMessageTimestamp,
            );

            // Execute agent command by invoking the slash command
            const agentCommand = `/agents run ${agentMatch.agentName} ${agentMatch.prompt}`;
            onDebugMessage(`[AGENT] Executing: ${agentCommand}`);

            // Process as slash command (same pattern as regular slash commands)
            await handleSlashCommand(agentCommand);

            // The /agents run command returns 'handled' type
            // We're done processing after executing the agent command
            return { queryToSend: null, shouldProceed: false };
          }
        }

        // Handle @-commands (which might involve tool calls)
        if (isAtCommand(trimmedQuery)) {
          const atCommandResult = await handleAtCommand({
            query: trimmedQuery,
            config,
            addItem,
            onDebugMessage,
            messageId: userMessageTimestamp,
            signal: abortSignal,
          });

          // Add user's turn after @ command processing is done.
          addItem(
            { type: MessageType.USER, text: trimmedQuery },
            userMessageTimestamp,
          );

          if (!atCommandResult.shouldProceed) {
            return { queryToSend: null, shouldProceed: false };
          }
          localQueryToSendToGemini = atCommandResult.processedQuery;
        } else {
          // Normal query for Gemini
          addItem(
            { type: MessageType.USER, text: trimmedQuery },
            userMessageTimestamp,
          );
          localQueryToSendToGemini = trimmedQuery;
        }
      } else {
        // It's a function response (PartListUnion that isn't a string)
        localQueryToSendToGemini = query;
      }

      if (localQueryToSendToGemini === null) {
        onDebugMessage(
          'Query processing resulted in null, not sending to Gemini.',
        );
        return { queryToSend: null, shouldProceed: false };
      }
      return { queryToSend: localQueryToSendToGemini, shouldProceed: true };
    },
    [
      config,
      addItem,
      onDebugMessage,
      handleShellCommand,
      handleSlashCommand,
      logger,
      shellModeActive,
      scheduleToolCalls,
    ],
  );

  // --- Stream Event Handlers ---

  /**
   * Detects and parses XML format tool calls from text (e.g., <function=read_file>...)
   * This is a fallback for models that output XML instead of standard function calls
   */
  const parseXmlToolCalls = useCallback(
    (text: string, prompt_id?: string): ToolCallRequestInfo[] => {
      const toolCalls: ToolCallRequestInfo[] = [];
      
      // Pattern to match XML-style tool calls like:
      // <function=read_file>
      //   <parameter=absolute_path>/path/to/file</parameter>
      // </function>
      const xmlToolCallPattern = /<function=(\w+)>([\s\S]*?)<\/function>/g;
      let match;
      
      while ((match = xmlToolCallPattern.exec(text)) !== null) {
        const toolName = match[1];
        const paramsText = match[2];
        const args: Record<string, any> = {};
        
        // Parse parameters from XML format
        // <parameter=param_name>value</parameter>
        const paramPattern = /<parameter=(\w+)>([\s\S]*?)<\/parameter>/g;
        let paramMatch;
        
        while ((paramMatch = paramPattern.exec(paramsText)) !== null) {
          const paramName = paramMatch[1];
          let paramValue = paramMatch[2].trim();
          
          // Try to parse as JSON if it looks like JSON
          try {
            if (paramValue.startsWith('[') || paramValue.startsWith('{')) {
              paramValue = JSON.parse(paramValue);
            }
          } catch {
            // Keep as string if not valid JSON
          }
          
          args[paramName] = paramValue;
        }
        
        // Create tool call request
        toolCalls.push({
          callId: `${toolName}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          name: toolName,
          args,
          isClientInitiated: false,
          prompt_id: prompt_id || '',
        });
      }
      
      return toolCalls;
    },
    [],
  );

  const handleContentEvent = useCallback(
    (
      eventValue: ContentEvent['value'],
      currentGeminiMessageBuffer: string,
      userMessageTimestamp: number,
    ): string => {
      if (turnCancelledRef.current) {
        // Prevents additional output after a user initiated cancel.
        return '';
      }
      let newGeminiMessageBuffer = currentGeminiMessageBuffer + eventValue;
      if (
        pendingHistoryItemRef.current?.type !== 'gemini' &&
        pendingHistoryItemRef.current?.type !== 'gemini_content'
      ) {
        if (pendingHistoryItemRef.current) {
          addItem(pendingHistoryItemRef.current, userMessageTimestamp);
        }
        setPendingHistoryItem({ type: 'gemini', text: '' });
        newGeminiMessageBuffer = eventValue;
      }
      // Split large messages for better rendering performance. Ideally,
      // we should maximize the amount of output sent to <Static />.
      const splitPoint = findLastSafeSplitPoint(newGeminiMessageBuffer);
      if (splitPoint === newGeminiMessageBuffer.length) {
        // Update the existing message with accumulated content
        setPendingHistoryItem((item) => ({
          type: item?.type as 'gemini' | 'gemini_content',
          text: newGeminiMessageBuffer,
        }));
      } else {
        // This indicates that we need to split up this Gemini Message.
        // Splitting a message is primarily a performance consideration. There is a
        // <Static> component at the root of App.tsx which takes care of rendering
        // content statically or dynamically. Everything but the last message is
        // treated as static in order to prevent re-rendering an entire message history
        // multiple times per-second (as streaming occurs). Prior to this change you'd
        // see heavy flickering of the terminal. This ensures that larger messages get
        // broken up so that there are more "statically" rendered.
        const beforeText = newGeminiMessageBuffer.substring(0, splitPoint);
        const afterText = newGeminiMessageBuffer.substring(splitPoint);
        addItem(
          {
            type: pendingHistoryItemRef.current?.type as
              | 'gemini'
              | 'gemini_content',
            text: beforeText,
          },
          userMessageTimestamp,
        );
        setPendingHistoryItem({ type: 'gemini_content', text: afterText });
        newGeminiMessageBuffer = afterText;
      }
      return newGeminiMessageBuffer;
    },
    [addItem, pendingHistoryItemRef, setPendingHistoryItem],
  );

  const handleUserCancelledEvent = useCallback(
    async (userMessageTimestamp: number) => {
      if (turnCancelledRef.current) {
        return;
      }
      if (pendingHistoryItemRef.current) {
        if (pendingHistoryItemRef.current.type === 'tool_group') {
          const updatedTools = pendingHistoryItemRef.current.tools.map(
            (tool) =>
              tool.status === ToolCallStatus.Pending ||
              tool.status === ToolCallStatus.Confirming ||
              tool.status === ToolCallStatus.Executing
                ? { ...tool, status: ToolCallStatus.Canceled }
                : tool,
          );
          const pendingItem: HistoryItemToolGroup = {
            ...pendingHistoryItemRef.current,
            tools: updatedTools,
          };
          addItem(pendingItem, userMessageTimestamp);
        } else {
          addItem(pendingHistoryItemRef.current, userMessageTimestamp);
        }
        setPendingHistoryItem(null);
      }
      addItem(
        { type: MessageType.INFO, text: 'User cancelled the request.' },
        userMessageTimestamp,
      );
      setIsResponding(false);
      setThought(null); // Reset thought when user cancels
      
      // Stop batch execution if active - use refs to get latest values
      const currentQueue = executionQueueRef.current;
      const currentSetExecutionQueue = setExecutionQueueRef.current;
      
      if (currentQueue && currentQueue.active && currentSetExecutionQueue) {
        const { ApprovalMode } = await import('@google/gemini-cli-core');
        
        addItem(
          {
            type: MessageType.INFO,
            text: 
              `⏸️  **Batch Execution Interrupted**\n\n` +
              `Completed: ${currentQueue.currentIndex - 1}/${currentQueue.totalCount} todos\n\n` +
              `Use /todos list to see current progress\n` +
              `Use /todos execute-all to resume remaining todos`,
          },
          Date.now(),
        );
        
        // Clear execution queue
        currentSetExecutionQueue(null);
        
        // Restore original approval mode
        config.setApprovalMode(ApprovalMode.DEFAULT);
      }
    },
    [addItem, pendingHistoryItemRef, setPendingHistoryItem, setThought, config],
  );

  const handleErrorEvent = useCallback(
    async (eventValue: GeminiErrorEventValue, userMessageTimestamp: number) => {
      if (pendingHistoryItemRef.current) {
        addItem(pendingHistoryItemRef.current, userMessageTimestamp);
        setPendingHistoryItem(null);
      }
      addItem(
        {
          type: MessageType.ERROR,
          text: parseAndFormatApiError(
            eventValue.error,
            config.getContentGeneratorConfig()?.authType,
            undefined,
            config.getModel(),
            DEFAULT_GEMINI_FLASH_MODEL,
          ),
        },
        userMessageTimestamp,
      );
      setThought(null); // Reset thought when there's an error
      
      // Stop batch execution on error - use refs to get latest values
      const currentQueue = executionQueueRef.current;
      const currentSetExecutionQueue = setExecutionQueueRef.current;
      const currentUpdateTodo = updateTodoRef.current;
      
      if (currentQueue && currentQueue.active && currentSetExecutionQueue && currentUpdateTodo) {
        const { ApprovalMode } = await import('@google/gemini-cli-core');
        
        // Mark current todo as cancelled (failed)
        if (currentQueue.executingTodoId) {
          currentUpdateTodo(currentQueue.executingTodoId, { 
            status: 'cancelled',
          });
        }
        
        addItem(
          {
            type: MessageType.ERROR,
            text: 
              `❌ **Batch Execution Failed**\n\n` +
              `Todo ${currentQueue.currentIndex}/${currentQueue.totalCount} encountered an error.\n\n` +
              `Progress: ${currentQueue.currentIndex - 1} completed, 1 failed\n\n` +
              `💡 Fix the issue and run /todos execute-all to continue with remaining todos`,
          },
          Date.now(),
        );
        
        // Clear execution queue
        currentSetExecutionQueue(null);
        
        // Restore original approval mode
        config.setApprovalMode(ApprovalMode.DEFAULT);
      }
    },
    [addItem, pendingHistoryItemRef, setPendingHistoryItem, config, setThought],
  );

  const handleCitationEvent = useCallback(
    (text: string, userMessageTimestamp: number) => {
      if (!showCitations(settings)) {
        return;
      }

      if (pendingHistoryItemRef.current) {
        addItem(pendingHistoryItemRef.current, userMessageTimestamp);
        setPendingHistoryItem(null);
      }
      addItem({ type: MessageType.INFO, text }, userMessageTimestamp);
    },
    [addItem, pendingHistoryItemRef, setPendingHistoryItem, settings],
  );

  const handleFinishedEvent = useCallback(
    (event: ServerGeminiFinishedEvent, userMessageTimestamp: number) => {
      const finishReason = event.value.reason;
      if (!finishReason) {
        return;
      }

      const finishReasonMessages: Record<FinishReason, string | undefined> = {
        [FinishReason.FINISH_REASON_UNSPECIFIED]: undefined,
        [FinishReason.STOP]: undefined,
        [FinishReason.MAX_TOKENS]: 'Response truncated due to token limits.',
        [FinishReason.SAFETY]: 'Response stopped due to safety reasons.',
        [FinishReason.RECITATION]: 'Response stopped due to recitation policy.',
        [FinishReason.LANGUAGE]:
          'Response stopped due to unsupported language.',
        [FinishReason.BLOCKLIST]: 'Response stopped due to forbidden terms.',
        [FinishReason.PROHIBITED_CONTENT]:
          'Response stopped due to prohibited content.',
        [FinishReason.SPII]:
          'Response stopped due to sensitive personally identifiable information.',
        [FinishReason.OTHER]: 'Response stopped for other reasons.',
        [FinishReason.MALFORMED_FUNCTION_CALL]:
          'Response stopped due to malformed function call.',
        [FinishReason.IMAGE_SAFETY]:
          'Response stopped due to image safety violations.',
        [FinishReason.UNEXPECTED_TOOL_CALL]:
          'Response stopped due to unexpected tool call.',
      };

      const message = finishReasonMessages[finishReason];
      if (message) {
        addItem(
          {
            type: 'info',
            text: `⚠️  ${message}`,
          },
          userMessageTimestamp,
        );
      }
    },
    [addItem],
  );

  const handleChatCompressionEvent = useCallback(
    (
      eventValue: ServerGeminiChatCompressedEvent['value'],
      userMessageTimestamp: number,
    ) => {
      if (pendingHistoryItemRef.current) {
        addItem(pendingHistoryItemRef.current, userMessageTimestamp);
        setPendingHistoryItem(null);
      }
      return addItem(
        {
          type: 'info',
          text:
            `IMPORTANT: This conversation approached the input token limit for ${config.getModel()}. ` +
            `A compressed context will be sent for future messages (compressed from: ` +
            `${eventValue?.originalTokenCount ?? 'unknown'} to ` +
            `${eventValue?.newTokenCount ?? 'unknown'} tokens).`,
        },
        Date.now(),
      );
    },
    [addItem, config, pendingHistoryItemRef, setPendingHistoryItem],
  );

  const handleMaxSessionTurnsEvent = useCallback(
    () =>
      addItem(
        {
          type: 'info',
          text:
            `The session has reached the maximum number of turns: ${config.getMaxSessionTurns()}. ` +
            `Please update this limit in your setting.json file.`,
        },
        Date.now(),
      ),
    [addItem, config],
  );

  const handleContextWindowWillOverflowEvent = useCallback(
    (estimatedRequestTokenCount: number, remainingTokenCount: number) => {
      onCancelSubmit();

      const limit = tokenLimit(config.getModel());

      const isLessThan75Percent =
        limit > 0 && remainingTokenCount < limit * 0.75;

      let text = `Sending this message (${estimatedRequestTokenCount} tokens) might exceed the remaining context window limit (${remainingTokenCount} tokens).`;

      if (isLessThan75Percent) {
        text +=
          ' Please try reducing the size of your message or use the `/compress` command to compress the chat history.';
      }

      addItem(
        {
          type: 'info',
          text,
        },
        Date.now(),
      );
    },
    [addItem, onCancelSubmit, config],
  );

  const handleLoopDetectionConfirmation = useCallback(
    (result: { userSelection: 'disable' | 'keep' }) => {
      setLoopDetectionConfirmationRequest(null);

      if (result.userSelection === 'disable') {
        config.getGeminiClient().getLoopDetectionService().disableForSession();
        addItem(
          {
            type: 'info',
            text: `Loop detection has been disabled for this session. Please try your request again.`,
          },
          Date.now(),
        );
      } else {
        addItem(
          {
            type: 'info',
            text: `A potential loop was detected. This can happen due to repetitive tool calls or other model behavior. The request has been halted.`,
          },
          Date.now(),
        );
      }
    },
    [config, addItem],
  );

  const handleLoopDetectedEvent = useCallback(() => {
    // Show the confirmation dialog to choose whether to disable loop detection
    setLoopDetectionConfirmationRequest({
      onComplete: handleLoopDetectionConfirmation,
    });
  }, [handleLoopDetectionConfirmation]);

  const processGeminiStreamEvents = useCallback(
    async (
      stream: AsyncIterable<GeminiEvent>,
      userMessageTimestamp: number,
      signal: AbortSignal,
      prompt_id?: string,
    ): Promise<StreamProcessingStatus> => {
      let geminiMessageBuffer = '';
      const toolCallRequests: ToolCallRequestInfo[] = [];
      for await (const event of stream) {
        switch (event.type) {
          case ServerGeminiEventType.Thought:
            setThought(event.value);
            break;
          case ServerGeminiEventType.Content:
            geminiMessageBuffer = handleContentEvent(
              event.value,
              geminiMessageBuffer,
              userMessageTimestamp,
            );
            break;
          case ServerGeminiEventType.ToolCallRequest:
            toolCallRequests.push(event.value);
            break;
          case ServerGeminiEventType.UserCancelled:
            handleUserCancelledEvent(userMessageTimestamp);
            break;
          case ServerGeminiEventType.Error:
            handleErrorEvent(event.value, userMessageTimestamp);
            break;
          case ServerGeminiEventType.ChatCompressed:
            handleChatCompressionEvent(event.value, userMessageTimestamp);
            break;
          case ServerGeminiEventType.ToolCallConfirmation:
          case ServerGeminiEventType.ToolCallResponse:
            // do nothing
            break;
          case ServerGeminiEventType.MaxSessionTurns:
            handleMaxSessionTurnsEvent();
            break;
          case ServerGeminiEventType.ContextWindowWillOverflow:
            handleContextWindowWillOverflowEvent(
              event.value.estimatedRequestTokenCount,
              event.value.remainingTokenCount,
            );
            break;
          case ServerGeminiEventType.Finished:
            handleFinishedEvent(
              event as ServerGeminiFinishedEvent,
              userMessageTimestamp,
            );
            break;
          case ServerGeminiEventType.Citation:
            handleCitationEvent(event.value, userMessageTimestamp);
            break;
          case ServerGeminiEventType.LoopDetected:
            // handle later because we want to move pending history to history
            // before we add loop detected message to history
            loopDetectedRef.current = true;
            break;
          case ServerGeminiEventType.Retry:
          case ServerGeminiEventType.InvalidStream:
            // Will add the missing logic later
            break;
          default: {
            // enforces exhaustive switch-case
            const unreachable: never = event;
            return unreachable;
          }
        }
      }
      
      // After stream processing, check for XML format tool calls in the final buffer
      // This handles cases where models output XML instead of standard function calls
      const finalBuffer = pendingHistoryItemRef.current?.text || geminiMessageBuffer;
      if (finalBuffer) {
        const xmlToolCalls = parseXmlToolCalls(finalBuffer, prompt_id);
        if (xmlToolCalls.length > 0) {
          // Remove XML tool calls from the displayed text
          // Match patterns like: <function=name>...</function></tool_call>
          let cleanedText = finalBuffer;
          cleanedText = cleanedText.replace(/✦\s*<function=[^>]*>[\s\S]*?<\/function>\s*<\/tool_call>/g, '');
          cleanedText = cleanedText.replace(/<function=[^>]*>[\s\S]*?<\/function>\s*<\/tool_call>/g, '');
          
          // Update the pending history item with cleaned text
          if (pendingHistoryItemRef.current) {
            setPendingHistoryItem({
              type: pendingHistoryItemRef.current.type as 'gemini' | 'gemini_content',
              text: cleanedText.trim(),
            });
          }
          
          // Add parsed tool calls to the request list
          toolCallRequests.push(...xmlToolCalls);
          
          // Show info message about XML tool call detection
          addItem(
            {
              type: MessageType.INFO,
              text: `⚠️  Detected ${xmlToolCalls.length} XML format tool call(s). Attempting to parse and execute...`,
            },
            userMessageTimestamp,
          );
        }
      }
      
      if (toolCallRequests.length > 0) {
        scheduleToolCalls(toolCallRequests, signal);
      }
      return StreamProcessingStatus.Completed;
    },
    [
      handleContentEvent,
      handleUserCancelledEvent,
      handleErrorEvent,
      scheduleToolCalls,
      handleChatCompressionEvent,
      handleFinishedEvent,
      handleMaxSessionTurnsEvent,
      handleContextWindowWillOverflowEvent,
      handleCitationEvent,
      parseXmlToolCalls,
      planModeActive,
      addItem,
      pendingHistoryItemRef,
      setPendingHistoryItem,
    ],
  );

  const submitQuery = useCallback(
    async (
      query: PartListUnion,
      options?: { isContinuation: boolean },
      prompt_id?: string,
    ) => {
      if (
        (streamingState === StreamingState.Responding ||
          streamingState === StreamingState.WaitingForConfirmation) &&
        !options?.isContinuation
      )
        return;

      const userMessageTimestamp = Date.now();

      // Reset quota error flag when starting a new query (not a continuation)
      if (!options?.isContinuation) {
        setModelSwitchedFromQuotaError(false);
        config.setQuotaErrorOccurred(false);
      }

      abortControllerRef.current = new AbortController();
      const abortSignal = abortControllerRef.current.signal;
      turnCancelledRef.current = false;

      if (!prompt_id) {
        prompt_id = config.getSessionId() + '########' + getPromptCount();
      }
      return promptIdContext.run(prompt_id, async () => {
        const { queryToSend, shouldProceed } = await prepareQueryForGemini(
          query,
          userMessageTimestamp,
          abortSignal,
          prompt_id,
        );

        if (!shouldProceed || queryToSend === null) {
          return;
        }

        if (!options?.isContinuation) {
          if (typeof queryToSend === 'string') {
            // logging the text prompts only for now
            const promptText = queryToSend;
            logUserPrompt(
              config,
              new UserPromptEvent(
                promptText.length,
                prompt_id,
                config.getContentGeneratorConfig()?.authType,
                promptText,
              ),
            );
          }
          startNewPrompt();
          setThought(null); // Reset thought when starting a new prompt
        }

        setIsResponding(true);
        setInitError(null);

        try {
          const stream = geminiClient.sendMessageStream(
            queryToSend,
            abortSignal,
            prompt_id,
          );
          const processingStatus = await processGeminiStreamEvents(
            stream,
            userMessageTimestamp,
            abortSignal,
            prompt_id,
          );

          if (processingStatus === StreamProcessingStatus.UserCancelled) {
            return;
          }

          if (pendingHistoryItemRef.current) {
            addItem(pendingHistoryItemRef.current, userMessageTimestamp);
            setPendingHistoryItem(null);
          }
          if (loopDetectedRef.current) {
            loopDetectedRef.current = false;
            handleLoopDetectedEvent();
          }
        } catch (error: unknown) {
          if (error instanceof UnauthorizedError) {
            onAuthError('Session expired or is unauthorized.');
          } else if (!isNodeError(error) || error.name !== 'AbortError') {
            addItem(
              {
                type: MessageType.ERROR,
                text: parseAndFormatApiError(
                  getErrorMessage(error) || 'Unknown error',
                  config.getContentGeneratorConfig()?.authType,
                  undefined,
                  config.getModel(),
                  DEFAULT_GEMINI_FLASH_MODEL,
                ),
              },
              userMessageTimestamp,
            );
          }
        } finally {
          setIsResponding(false);
          
          // Check if we should continue batch execution using refs to get latest values
          // Protection: Do not continue batch execution while in Plan mode
          if (planModeActive) {
            return;
          }
          const currentQueue = executionQueueRef.current;
          const currentSetExecutionQueue = setExecutionQueueRef.current;
          
          console.log('[Batch Execution] Finally block reached', {
            hasExecutionQueue: !!currentQueue,
            isActive: currentQueue?.active,
            hasSubmitQueryRef: !!submitQueryRef.current,
            executingTodoId: currentQueue?.executingTodoId,
          });
          
          if (currentQueue && currentQueue.active) {
            if (!submitQueryRef.current) {
              console.warn('[Batch Execution] submitQueryRef.current is null, will retry...');
              // Retry after a short delay in case ref is not yet set
              setTimeout(() => {
                const retryQueue = executionQueueRef.current;
                if (submitQueryRef.current && retryQueue && retryQueue.active) {
                  handleNextTodo().then(nextPrompt => {
                    if (nextPrompt && submitQueryRef.current) {
                      console.log('[Batch Execution] Submitting next todo prompt');
                      setTimeout(() => {
                        submitQueryRef.current?.(nextPrompt);
                      }, 500);
                    }
                  }).catch((error: Error) => {
                    console.error('[Batch Execution] Error in handleNextTodo:', error);
                    if (currentSetExecutionQueue) {
                      currentSetExecutionQueue(null);
                    }
                  });
                }
              }, 1000);
            } else {
              // Handle next todo asynchronously
              console.log('[Batch Execution] Calling handleNextTodo');
              handleNextTodo().then(nextPrompt => {
                console.log('[Batch Execution] handleNextTodo returned:', nextPrompt ? 'prompt' : 'null');
                if (nextPrompt && submitQueryRef.current) {
                  console.log('[Batch Execution] Submitting next todo');
                  // Submit the next todo's prompt
                  setTimeout(() => {
                    submitQueryRef.current?.(nextPrompt);
                  }, 500); // Small delay to ensure UI updates
                }
              }).catch((error: Error) => {
                console.error('[Batch Execution] Error in handleNextTodo:', error);
                // Clear execution queue on error
                if (currentSetExecutionQueue) {
                  currentSetExecutionQueue(null);
                }
              });
            }
          }
        }
      });
    },
    [
      streamingState,
      setModelSwitchedFromQuotaError,
      prepareQueryForGemini,
      processGeminiStreamEvents,
      pendingHistoryItemRef,
      addItem,
      setPendingHistoryItem,
      setInitError,
      geminiClient,
      onAuthError,
      config,
      startNewPrompt,
      getPromptCount,
      handleLoopDetectedEvent,
      handleNextTodo,
      // Note: executionQueue, todos, updateTodo, setExecutionQueue accessed via refs
    ],
  );

  const handleApprovalModeChange = useCallback(
    async (newApprovalMode: ApprovalMode) => {
      // Auto-approve pending tool calls when switching to auto-approval modes
      if (
        newApprovalMode === ApprovalMode.YOLO ||
        newApprovalMode === ApprovalMode.AUTO_EDIT
      ) {
        let awaitingApprovalCalls = toolCalls.filter(
          (call): call is TrackedWaitingToolCall =>
            call.status === 'awaiting_approval',
        );

        // For AUTO_EDIT mode, only approve edit tools (replace, write_file)
        if (newApprovalMode === ApprovalMode.AUTO_EDIT) {
          awaitingApprovalCalls = awaitingApprovalCalls.filter((call) =>
            EDIT_TOOL_NAMES.has(call.request.name),
          );
        }

        // Process pending tool calls sequentially to reduce UI chaos
        for (const call of awaitingApprovalCalls) {
          if (call.confirmationDetails?.onConfirm) {
            try {
              await call.confirmationDetails.onConfirm(
                ToolConfirmationOutcome.ProceedOnce,
              );
            } catch (error) {
              console.error(
                `Failed to auto-approve tool call ${call.request.callId}:`,
                error,
              );
            }
          }
        }
      }
    },
    [toolCalls],
  );

  const handleCompletedTools = useCallback(
    async (completedToolCallsFromScheduler: TrackedToolCall[]) => {
      if (isResponding) {
        return;
      }

      const completedAndReadyToSubmitTools =
        completedToolCallsFromScheduler.filter(
          (
            tc: TrackedToolCall,
          ): tc is TrackedCompletedToolCall | TrackedCancelledToolCall => {
            const isTerminalState =
              tc.status === 'success' ||
              tc.status === 'error' ||
              tc.status === 'cancelled';

            if (isTerminalState) {
              const completedOrCancelledCall = tc as
                | TrackedCompletedToolCall
                | TrackedCancelledToolCall;
              return (
                completedOrCancelledCall.response?.responseParts !== undefined
              );
            }
            return false;
          },
        );

      // Finalize any client-initiated tools as soon as they are done.
      const clientTools = completedAndReadyToSubmitTools.filter(
        (t) => t.request.isClientInitiated,
      );
      if (clientTools.length > 0) {
        markToolsAsSubmitted(clientTools.map((t) => t.request.callId));
      }

      // Identify new, successful save_memory calls that we haven't processed yet.
      const newSuccessfulMemorySaves = completedAndReadyToSubmitTools.filter(
        (t) =>
          t.request.name === 'save_memory' &&
          t.status === 'success' &&
          !processedMemoryToolsRef.current.has(t.request.callId),
      );

      if (newSuccessfulMemorySaves.length > 0) {
        // Perform the refresh only if there are new ones.
        void performMemoryRefresh();
        // Mark them as processed so we don't do this again on the next render.
        newSuccessfulMemorySaves.forEach((t) =>
          processedMemoryToolsRef.current.add(t.request.callId),
        );
      }

      const geminiTools = completedAndReadyToSubmitTools.filter(
        (t) => !t.request.isClientInitiated,
      );

      if (geminiTools.length === 0) {
        return;
      }

      // If all the tools were cancelled, don't submit a response to Gemini.
      const allToolsCancelled = geminiTools.every(
        (tc) => tc.status === 'cancelled',
      );

      if (allToolsCancelled) {
        if (geminiClient) {
          // We need to manually add the function responses to the history
          // so the model knows the tools were cancelled.
          const combinedParts = geminiTools.flatMap(
            (toolCall) => toolCall.response.responseParts,
          );
          geminiClient.addHistory({
            role: 'user',
            parts: combinedParts,
          });
        }

        const callIdsToMarkAsSubmitted = geminiTools.map(
          (toolCall) => toolCall.request.callId,
        );
        markToolsAsSubmitted(callIdsToMarkAsSubmitted);
        return;
      }

      const responsesToSend: Part[] = geminiTools.flatMap(
        (toolCall) => toolCall.response.responseParts,
      );
      const callIdsToMarkAsSubmitted = geminiTools.map(
        (toolCall) => toolCall.request.callId,
      );

      const prompt_ids = geminiTools.map(
        (toolCall) => toolCall.request.prompt_id,
      );

      markToolsAsSubmitted(callIdsToMarkAsSubmitted);

      // Don't continue if model was switched due to quota error
      if (modelSwitchedFromQuotaError) {
        return;
      }

      submitQuery(
        responsesToSend,
        {
          isContinuation: true,
        },
        prompt_ids[0],
      );
    },
    [
      isResponding,
      submitQuery,
      markToolsAsSubmitted,
      geminiClient,
      performMemoryRefresh,
      modelSwitchedFromQuotaError,
    ],
  );

  const pendingHistoryItems = useMemo(
    () =>
      [pendingHistoryItem, pendingToolCallGroupDisplay].filter(
        (i) => i !== undefined && i !== null,
      ),
    [pendingHistoryItem, pendingToolCallGroupDisplay],
  );

  useEffect(() => {
    const saveRestorableToolCalls = async () => {
      if (!config.getCheckpointingEnabled()) {
        return;
      }
      const restorableToolCalls = toolCalls.filter(
        (toolCall) =>
          EDIT_TOOL_NAMES.has(toolCall.request.name) &&
          toolCall.status === 'awaiting_approval',
      );

      if (restorableToolCalls.length > 0) {
        const checkpointDir = storage.getProjectTempCheckpointsDir();

        if (!checkpointDir) {
          return;
        }

        try {
          await fs.mkdir(checkpointDir, { recursive: true });
        } catch (error) {
          if (!isNodeError(error) || error.code !== 'EEXIST') {
            onDebugMessage(
              `Failed to create checkpoint directory: ${getErrorMessage(error)}`,
            );
            return;
          }
        }

        for (const toolCall of restorableToolCalls) {
          const filePath = toolCall.request.args['file_path'] as string;
          if (!filePath) {
            onDebugMessage(
              `Skipping restorable tool call due to missing file_path: ${toolCall.request.name}`,
            );
            continue;
          }

          try {
            if (!gitService) {
              onDebugMessage(
                `Checkpointing is enabled but Git service is not available. Failed to create snapshot for ${filePath}. Ensure Git is installed and working properly.`,
              );
              continue;
            }

            let commitHash: string | undefined;
            try {
              commitHash = await gitService.createFileSnapshot(
                `Snapshot for ${toolCall.request.name}`,
              );
            } catch (error) {
              onDebugMessage(
                `Failed to create new snapshot: ${getErrorMessage(error)}. Attempting to use current commit.`,
              );
            }

            if (!commitHash) {
              commitHash = await gitService.getCurrentCommitHash();
            }

            if (!commitHash) {
              onDebugMessage(
                `Failed to create snapshot for ${filePath}. Checkpointing may not be working properly. Ensure Git is installed and the project directory is accessible.`,
              );
              continue;
            }

            const timestamp = new Date()
              .toISOString()
              .replace(/:/g, '-')
              .replace(/\./g, '_');
            const toolName = toolCall.request.name;
            const fileName = path.basename(filePath);
            const toolCallWithSnapshotFileName = `${timestamp}-${fileName}-${toolName}.json`;
            const clientHistory = await geminiClient?.getHistory();
            const toolCallWithSnapshotFilePath = path.join(
              checkpointDir,
              toolCallWithSnapshotFileName,
            );

            await fs.writeFile(
              toolCallWithSnapshotFilePath,
              JSON.stringify(
                {
                  history,
                  clientHistory,
                  toolCall: {
                    name: toolCall.request.name,
                    args: toolCall.request.args,
                  },
                  commitHash,
                  filePath,
                },
                null,
                2,
              ),
            );
          } catch (error) {
            onDebugMessage(
              `Failed to create checkpoint for ${filePath}: ${getErrorMessage(
                error,
              )}. This may indicate a problem with Git or file system permissions.`,
            );
          }
        }
      }
    };
    saveRestorableToolCalls();
  }, [
    toolCalls,
    config,
    onDebugMessage,
    gitService,
    history,
    geminiClient,
    storage,
  ]);

  // Update submitQueryRef for batch execution
  useEffect(() => {
    submitQueryRef.current = submitQuery;
  }, [submitQuery]);

  return {
    streamingState,
    submitQuery,
    initError,
    pendingHistoryItems,
    thought,
    cancelOngoingRequest,
    pendingToolCalls: toolCalls,
    handleApprovalModeChange,
    activePtyId,
    loopDetectionConfirmationRequest,
  };
};
