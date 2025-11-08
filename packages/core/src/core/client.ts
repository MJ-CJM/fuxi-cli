/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  GenerateContentConfig,
  PartListUnion,
  Content,
  Tool,
  GenerateContentResponse,
  FunctionDeclaration,
} from '@google/genai';
import { createUserContent, FinishReason } from '@google/genai';
import {
  getDirectoryContextString,
  getEnvironmentContext,
} from '../utils/environmentContext.js';
import type {
  ServerGeminiStreamEvent,
  ChatCompressionInfo,
  StructuredError,
} from './turn.js';
import { CompressionStatus } from './turn.js';
import { Turn, GeminiEventType } from './turn.js';
import type { Config } from '../config/config.js';
import { getCoreSystemPrompt, getCompressionPrompt, getPlanModeSystemPrompt } from './prompts.js';
import { getResponseText } from '../utils/partUtils.js';
import { checkNextSpeaker } from '../utils/nextSpeakerChecker.js';
import { reportError } from '../utils/errorReporting.js';
import { GeminiChat } from './geminiChat.js';
import { retryWithBackoff } from '../utils/retry.js';
import { getErrorMessage } from '../utils/errors.js';
import { ModelService } from '../services/modelService.js';
import type { UnifiedRequest, ContentPart, ToolDefinition } from '../adapters/base/types.js';
import { MessageRole } from '../adapters/base/types.js';
import { APITranslator } from '../adapters/utils/apiTranslator.js';
import { isFunctionResponse } from '../utils/messageInspectors.js';
import { tokenLimit } from './tokenLimits.js';
import type { ChatRecordingService } from '../services/chatRecordingService.js';
import type { ContentGenerator } from './contentGenerator.js';
import {
  DEFAULT_GEMINI_FLASH_MODEL,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GEMINI_MODEL_AUTO,
  DEFAULT_THINKING_MODE,
  getEffectiveModel,
  getMaxOutputTokens,
  getModelConfig,
} from '../config/models.js';
import { LoopDetectionService } from '../services/loopDetectionService.js';
import { logger } from '../utils/logger.js';
import { ideContextStore } from '../ide/ideContext.js';
import {
  logChatCompression,
  logNextSpeakerCheck,
  logMalformedJsonResponse,
} from '../telemetry/loggers.js';
import {
  makeChatCompressionEvent,
  MalformedJsonResponseEvent,
  NextSpeakerCheckEvent,
} from '../telemetry/types.js';
import type { IdeContext, File } from '../ide/types.js';
import { handleFallback } from '../fallback/handler.js';
import type { RoutingContext } from '../routing/routingStrategy.js';

export function isThinkingSupported(model: string) {
  return model.startsWith('gemini-2.5') || model === DEFAULT_GEMINI_MODEL_AUTO;
}

export function isThinkingDefault(model: string) {
  if (model.startsWith('gemini-2.5-flash-lite')) {
    return false;
  }
  return model.startsWith('gemini-2.5') || model === DEFAULT_GEMINI_MODEL_AUTO;
}

/**
 * Returns the index of the content after the fraction of the total characters in the history.
 *
 * Exported for testing purposes.
 */
export function findIndexAfterFraction(
  history: Content[],
  fraction: number,
): number {
  if (fraction <= 0 || fraction >= 1) {
    throw new Error('Fraction must be between 0 and 1');
  }

  const contentLengths = history.map(
    (content) => JSON.stringify(content).length,
  );

  const totalCharacters = contentLengths.reduce(
    (sum, length) => sum + length,
    0,
  );
  const targetCharacters = totalCharacters * fraction;

  let charactersSoFar = 0;
  for (let i = 0; i < contentLengths.length; i++) {
    if (charactersSoFar >= targetCharacters) {
      return i;
    }
    charactersSoFar += contentLengths[i];
  }
  return contentLengths.length;
}

const MAX_TURNS = 100;

/**
 * Threshold for compression token count as a fraction of the model's token limit.
 * If the chat history exceeds this threshold, it will be compressed.
 */
const COMPRESSION_TOKEN_THRESHOLD = 0.7;

/**
 * The fraction of the latest chat history to keep. A value of 0.3
 * means that only the last 30% of the chat history will be kept after compression.
 */
const COMPRESSION_PRESERVE_THRESHOLD = 0.3;

export class GeminiClient {
  private chat?: GeminiChat;
  private readonly generateContentConfig: GenerateContentConfig = {
    temperature: 0,
    topP: 1,
  };
  private sessionTurnCount = 0;

  private readonly loopDetector: LoopDetectionService;
  private lastPromptId: string;
  private currentSequenceModel: string | null = null;
  private lastSentIdeContext: IdeContext | undefined;
  private forceFullIdeContext = true;

  /**
   * At any point in this conversation, was compression triggered without
   * being forced and did it fail?
   */
  private hasFailedCompressionAttempt = false;

  /**
   * Plan mode active - when true, only read-only tools + create_plan are available
   */
  private planModeActive = false;

  constructor(private readonly config: Config) {
    this.loopDetector = new LoopDetectionService(config);
    this.lastPromptId = this.config.getSessionId();
  }

  async initialize() {
    this.chat = await this.startChat();
  }

  private getContentGeneratorOrFail(): ContentGenerator {
    if (!this.config.getContentGenerator()) {
      throw new Error('Content generator not initialized');
    }
    return this.config.getContentGenerator();
  }

  async addHistory(content: Content) {
    this.getChat().addHistory(content);
  }

  getChat(): GeminiChat {
    if (!this.chat) {
      throw new Error('Chat not initialized');
    }
    return this.chat;
  }

  isInitialized(): boolean {
    return this.chat !== undefined;
  }

  getHistory(): Content[] {
    return this.getChat().getHistory();
  }

  stripThoughtsFromHistory() {
    this.getChat().stripThoughtsFromHistory();
  }

  setHistory(history: Content[]) {
    this.getChat().setHistory(history);
    this.forceFullIdeContext = true;
  }

  async setTools(): Promise<void> {
    const toolRegistry = this.config.getToolRegistry();
    const toolDeclarations = toolRegistry.getFunctionDeclarations();
    const tools: Tool[] = [{ functionDeclarations: toolDeclarations }];
    this.getChat().setTools(tools);
  }

  async resetChat(): Promise<void> {
    this.chat = await this.startChat();
  }

  getChatRecordingService(): ChatRecordingService | undefined {
    return this.chat?.getChatRecordingService();
  }

  getLoopDetectionService(): LoopDetectionService {
    return this.loopDetector;
  }

  /**
   * Set Plan mode state
   * When Plan mode is active, only read-only tools + create_plan are available
   */
  setPlanModeActive(active: boolean): void {
    this.planModeActive = active;
  }

  /**
   * Get Plan mode state
   */
  getPlanModeActive(): boolean {
    return this.planModeActive;
  }

  async addDirectoryContext(): Promise<void> {
    if (!this.chat) {
      return;
    }

    this.getChat().addHistory({
      role: 'user',
      parts: [{ text: await getDirectoryContextString(this.config) }],
    });
  }

  async startChat(extraHistory?: Content[]): Promise<GeminiChat> {
    this.forceFullIdeContext = true;
    this.hasFailedCompressionAttempt = false;
    const envParts = await getEnvironmentContext(this.config);

    const toolRegistry = this.config.getToolRegistry();
    const toolDeclarations = toolRegistry.getFunctionDeclarations();
    const tools: Tool[] = [{ functionDeclarations: toolDeclarations }];

    const history: Content[] = [
      {
        role: 'user',
        parts: envParts,
      },
      {
        role: 'model',
        parts: [{ text: 'Got it. Thanks for the context!' }],
      },
      ...(extraHistory ?? []),
    ];
    try {
      const userMemory = this.config.getUserMemory();
      const model = this.config.getModel();
      const modelConfig = this.config.getModelConfig();
      const providerName = modelConfig?.metadata?.providerName || modelConfig?.provider;
      const systemInstruction = getCoreSystemPrompt(userMemory, model, providerName);

      const config: GenerateContentConfig = { ...this.generateContentConfig };

      if (isThinkingSupported(model)) {
        config.thinkingConfig = {
          includeThoughts: true,
          thinkingBudget: DEFAULT_THINKING_MODE,
        };
      }

      return new GeminiChat(
        this.config,
        {
          systemInstruction,
          ...config,
          tools,
        },
        history,
      );
    } catch (error) {
      await reportError(
        error,
        'Error initializing Gemini chat session.',
        history,
        'startChat',
      );
      throw new Error(`Failed to initialize chat: ${getErrorMessage(error)}`);
    }
  }

  private getIdeContextParts(forceFullContext: boolean): {
    contextParts: string[];
    newIdeContext: IdeContext | undefined;
  } {
    const currentIdeContext = ideContextStore.get();
    if (!currentIdeContext) {
      return { contextParts: [], newIdeContext: undefined };
    }

    if (forceFullContext || !this.lastSentIdeContext) {
      // Send full context as JSON
      const openFiles = currentIdeContext.workspaceState?.openFiles || [];
      const activeFile = openFiles.find((f) => f.isActive);
      const otherOpenFiles = openFiles
        .filter((f) => !f.isActive)
        .map((f) => f.path);

      const contextData: Record<string, unknown> = {};

      if (activeFile) {
        contextData['activeFile'] = {
          path: activeFile.path,
          cursor: activeFile.cursor
            ? {
                line: activeFile.cursor.line,
                character: activeFile.cursor.character,
              }
            : undefined,
          selectedText: activeFile.selectedText || undefined,
        };
      }

      if (otherOpenFiles.length > 0) {
        contextData['otherOpenFiles'] = otherOpenFiles;
      }

      if (Object.keys(contextData).length === 0) {
        return { contextParts: [], newIdeContext: currentIdeContext };
      }

      const jsonString = JSON.stringify(contextData, null, 2);
      const contextParts = [
        "Here is the user's editor context as a JSON object. This is for your information only.",
        '```json',
        jsonString,
        '```',
      ];

      if (this.config.getDebugMode()) {
        console.log(contextParts.join('\n'));
      }
      return {
        contextParts,
        newIdeContext: currentIdeContext,
      };
    } else {
      // Calculate and send delta as JSON
      const delta: Record<string, unknown> = {};
      const changes: Record<string, unknown> = {};

      const lastFiles = new Map(
        (this.lastSentIdeContext.workspaceState?.openFiles || []).map(
          (f: File) => [f.path, f],
        ),
      );
      const currentFiles = new Map(
        (currentIdeContext.workspaceState?.openFiles || []).map((f: File) => [
          f.path,
          f,
        ]),
      );

      const openedFiles: string[] = [];
      for (const [path] of currentFiles.entries()) {
        if (!lastFiles.has(path)) {
          openedFiles.push(path);
        }
      }
      if (openedFiles.length > 0) {
        changes['filesOpened'] = openedFiles;
      }

      const closedFiles: string[] = [];
      for (const [path] of lastFiles.entries()) {
        if (!currentFiles.has(path)) {
          closedFiles.push(path);
        }
      }
      if (closedFiles.length > 0) {
        changes['filesClosed'] = closedFiles;
      }

      const lastActiveFile = (
        this.lastSentIdeContext.workspaceState?.openFiles || []
      ).find((f: File) => f.isActive);
      const currentActiveFile = (
        currentIdeContext.workspaceState?.openFiles || []
      ).find((f: File) => f.isActive);

      if (currentActiveFile) {
        if (!lastActiveFile || lastActiveFile.path !== currentActiveFile.path) {
          changes['activeFileChanged'] = {
            path: currentActiveFile.path,
            cursor: currentActiveFile.cursor
              ? {
                  line: currentActiveFile.cursor.line,
                  character: currentActiveFile.cursor.character,
                }
              : undefined,
            selectedText: currentActiveFile.selectedText || undefined,
          };
        } else {
          const lastCursor = lastActiveFile.cursor;
          const currentCursor = currentActiveFile.cursor;
          if (
            currentCursor &&
            (!lastCursor ||
              lastCursor.line !== currentCursor.line ||
              lastCursor.character !== currentCursor.character)
          ) {
            changes['cursorMoved'] = {
              path: currentActiveFile.path,
              cursor: {
                line: currentCursor.line,
                character: currentCursor.character,
              },
            };
          }

          const lastSelectedText = lastActiveFile.selectedText || '';
          const currentSelectedText = currentActiveFile.selectedText || '';
          if (lastSelectedText !== currentSelectedText) {
            changes['selectionChanged'] = {
              path: currentActiveFile.path,
              selectedText: currentSelectedText,
            };
          }
        }
      } else if (lastActiveFile) {
        changes['activeFileChanged'] = {
          path: null,
          previousPath: lastActiveFile.path,
        };
      }

      if (Object.keys(changes).length === 0) {
        return { contextParts: [], newIdeContext: currentIdeContext };
      }

      delta['changes'] = changes;
      const jsonString = JSON.stringify(delta, null, 2);
      const contextParts = [
        "Here is a summary of changes in the user's editor context, in JSON format. This is for your information only.",
        '```json',
        jsonString,
        '```',
      ];

      if (this.config.getDebugMode()) {
        console.log(contextParts.join('\n'));
      }
      return {
        contextParts,
        newIdeContext: currentIdeContext,
      };
    }
  }

  async *sendMessageStream(
    request: PartListUnion,
    signal: AbortSignal,
    prompt_id: string,
    turns: number = MAX_TURNS,
  ): AsyncGenerator<ServerGeminiStreamEvent, Turn> {
    // If model router is enabled, use ModelService instead of Gemini API
    if (this.config.getUseModelRouter()) {
      yield* this.sendMessageStreamWithModelRouter(request, signal, prompt_id, turns);
      return new Turn(this.getChat(), prompt_id);
    }
    if (this.lastPromptId !== prompt_id) {
      this.loopDetector.reset(prompt_id);
      this.lastPromptId = prompt_id;
      this.currentSequenceModel = null;
    }
    this.sessionTurnCount++;
    if (
      this.config.getMaxSessionTurns() > 0 &&
      this.sessionTurnCount > this.config.getMaxSessionTurns()
    ) {
      yield { type: GeminiEventType.MaxSessionTurns };
      return new Turn(this.getChat(), prompt_id);
    }
    // Ensure turns never exceeds MAX_TURNS to prevent infinite loops
    const boundedTurns = Math.min(turns, MAX_TURNS);
    if (!boundedTurns) {
      return new Turn(this.getChat(), prompt_id);
    }

    const compressed = await this.tryCompressChat(prompt_id, false, request);

    if (compressed.compressionStatus === CompressionStatus.COMPRESSED) {
      yield { type: GeminiEventType.ChatCompressed, value: compressed };
    }

    // Prevent context updates from being sent while a tool call is
    // waiting for a response. The Gemini API requires that a functionResponse
    // part from the user immediately follows a functionCall part from the model
    // in the conversation history . The IDE context is not discarded; it will
    // be included in the next regular message sent to the model.
    const history = this.getHistory();
    const lastMessage =
      history.length > 0 ? history[history.length - 1] : undefined;
    const hasPendingToolCall =
      !!lastMessage &&
      lastMessage.role === 'model' &&
      (lastMessage.parts?.some((p) => 'functionCall' in p) || false);

    if (this.config.getIdeMode() && !hasPendingToolCall) {
      const { contextParts, newIdeContext } = this.getIdeContextParts(
        this.forceFullIdeContext || history.length === 0,
      );
      if (contextParts.length > 0) {
        this.getChat().addHistory({
          role: 'user',
          parts: [{ text: contextParts.join('\n') }],
        });
      }
      this.lastSentIdeContext = newIdeContext;
      this.forceFullIdeContext = false;
    }

    const turn = new Turn(this.getChat(), prompt_id);

    const controller = new AbortController();
    const linkedSignal = AbortSignal.any([signal, controller.signal]);

    const loopDetected = await this.loopDetector.turnStarted(signal);
    if (loopDetected) {
      yield { type: GeminiEventType.LoopDetected };
      return turn;
    }

    const routingContext: RoutingContext = {
      history: this.getChat().getHistory(/*curated=*/ true),
      request,
      signal,
    };

    let modelToUse: string;

    // Determine Model (Stickiness vs. Routing)
    if (this.currentSequenceModel) {
      modelToUse = this.currentSequenceModel;
    } else {
      const router = await this.config.getModelRouterService();
      const decision = await router.route(routingContext);
      modelToUse = decision.model;
      // Lock the model for the rest of the sequence
      this.currentSequenceModel = modelToUse;
    }

    const resultStream = turn.run(modelToUse, request, linkedSignal);
    for await (const event of resultStream) {
      if (this.loopDetector.addAndCheck(event)) {
        yield { type: GeminiEventType.LoopDetected };
        controller.abort();
        return turn;
      }
      yield event;
      if (event.type === GeminiEventType.Error) {
        return turn;
      }
    }
    if (!turn.pendingToolCalls.length && signal && !signal.aborted) {
      // Check if next speaker check is needed
      if (this.config.getQuotaErrorOccurred()) {
        return turn;
      }

      if (this.config.getSkipNextSpeakerCheck()) {
        return turn;
      }

      const nextSpeakerCheck = await checkNextSpeaker(
        this.getChat(),
        this.config.getBaseLlmClient(),
        signal,
        prompt_id,
      );
      logNextSpeakerCheck(
        this.config,
        new NextSpeakerCheckEvent(
          prompt_id,
          turn.finishReason?.toString() || '',
          nextSpeakerCheck?.next_speaker || '',
        ),
      );
      if (nextSpeakerCheck?.next_speaker === 'model') {
        const nextRequest = [{ text: 'Please continue.' }];
        // This recursive call's events will be yielded out, but the final
        // turn object will be from the top-level call.
        yield* this.sendMessageStream(
          nextRequest,
          signal,
          prompt_id,
          boundedTurns - 1,
        );
      }
    }
    return turn;
  }

  async generateJson(
    contents: Content[],
    schema: Record<string, unknown>,
    abortSignal: AbortSignal,
    model: string,
    config: GenerateContentConfig = {},
  ): Promise<Record<string, unknown>> {
    let currentAttemptModel: string = model;

    try {
      const userMemory = this.config.getUserMemory();
      const model = this.config.getModel();
      const modelConfig = this.config.getModelConfig();
      const providerName = modelConfig?.metadata?.providerName || modelConfig?.provider;
      const systemInstruction = getCoreSystemPrompt(userMemory, model, providerName);
      const requestConfig = {
        abortSignal,
        ...this.generateContentConfig,
        ...config,
      };

      const apiCall = () => {
        const modelToUse = this.config.isInFallbackMode()
          ? DEFAULT_GEMINI_FLASH_MODEL
          : model;
        currentAttemptModel = modelToUse;

        return this.getContentGeneratorOrFail().generateContent(
          {
            model: modelToUse,
            config: {
              ...requestConfig,
              systemInstruction,
              responseJsonSchema: schema,
              responseMimeType: 'application/json',
            },
            contents,
          },
          this.lastPromptId,
        );
      };

      const onPersistent429Callback = async (
        authType?: string,
        error?: unknown,
      ) =>
        // Pass the captured model to the centralized handler.
        await handleFallback(this.config, currentAttemptModel, authType, error);

      const result = await retryWithBackoff(apiCall, {
        onPersistent429: onPersistent429Callback,
        authType: this.config.getContentGeneratorConfig()?.authType,
      });

      let text = getResponseText(result);
      if (!text) {
        const error = new Error(
          'API returned an empty response for generateJson.',
        );
        await reportError(
          error,
          'Error in generateJson: API returned an empty response.',
          contents,
          'generateJson-empty-response',
        );
        throw error;
      }

      const prefix = '```json';
      const suffix = '```';
      if (text.startsWith(prefix) && text.endsWith(suffix)) {
        logMalformedJsonResponse(
          this.config,
          new MalformedJsonResponseEvent(currentAttemptModel),
        );
        text = text
          .substring(prefix.length, text.length - suffix.length)
          .trim();
      }

      try {
        return JSON.parse(text);
      } catch (parseError) {
        await reportError(
          parseError,
          'Failed to parse JSON response from generateJson.',
          {
            responseTextFailedToParse: text,
            originalRequestContents: contents,
          },
          'generateJson-parse',
        );
        throw new Error(
          `Failed to parse API response as JSON: ${getErrorMessage(
            parseError,
          )}`,
        );
      }
    } catch (error) {
      if (abortSignal.aborted) {
        throw error;
      }

      // Avoid double reporting for the empty response case handled above
      if (
        error instanceof Error &&
        error.message === 'API returned an empty response for generateJson.'
      ) {
        throw error;
      }

      await reportError(
        error,
        'Error generating JSON content via API.',
        contents,
        'generateJson-api',
      );
      throw new Error(
        `Failed to generate JSON content: ${getErrorMessage(error)}`,
      );
    }
  }

  async generateContent(
    contents: Content[],
    generationConfig: GenerateContentConfig,
    abortSignal: AbortSignal,
    model: string,
  ): Promise<GenerateContentResponse> {
    let currentAttemptModel: string = model;

    const configToUse: GenerateContentConfig = {
      ...this.generateContentConfig,
      ...generationConfig,
    };

    try {
      const userMemory = this.config.getUserMemory();
      const model = this.config.getModel();
      const modelConfig = this.config.getModelConfig();
      const providerName = modelConfig?.metadata?.providerName || modelConfig?.provider;
      const systemInstruction = getCoreSystemPrompt(userMemory, model, providerName);

      const requestConfig: GenerateContentConfig = {
        abortSignal,
        ...configToUse,
        systemInstruction,
      };

      const apiCall = () => {
        const modelToUse = this.config.isInFallbackMode()
          ? DEFAULT_GEMINI_FLASH_MODEL
          : model;
        currentAttemptModel = modelToUse;

        return this.getContentGeneratorOrFail().generateContent(
          {
            model: modelToUse,
            config: requestConfig,
            contents,
          },
          this.lastPromptId,
        );
      };
      const onPersistent429Callback = async (
        authType?: string,
        error?: unknown,
      ) =>
        // Pass the captured model to the centralized handler.
        await handleFallback(this.config, currentAttemptModel, authType, error);

      const result = await retryWithBackoff(apiCall, {
        onPersistent429: onPersistent429Callback,
        authType: this.config.getContentGeneratorConfig()?.authType,
      });
      return result;
    } catch (error: unknown) {
      if (abortSignal.aborted) {
        throw error;
      }

      await reportError(
        error,
        `Error generating content via API with model ${currentAttemptModel}.`,
        {
          requestContents: contents,
          requestConfig: configToUse,
        },
        'generateContent-api',
      );
      throw new Error(
        `Failed to generate content with model ${currentAttemptModel}: ${getErrorMessage(error)}`,
      );
    }
  }

  async tryCompressChat(
    prompt_id: string,
    force: boolean = false,
    request?: PartListUnion,
  ): Promise<ChatCompressionInfo> {
    // If the model is 'auto', we will use a placeholder model to check.
    // Compression occurs before we choose a model, so calling `count_tokens`
    // before the model is chosen would result in an error.
    const configModel = this.config.getModel();
    let model: string =
      configModel === DEFAULT_GEMINI_MODEL_AUTO
        ? DEFAULT_GEMINI_MODEL
        : configModel;

    // Check if the model needs to be a fallback
    model = getEffectiveModel(this.config.isInFallbackMode(), model);

    const curatedHistory = this.getChat().getHistory(true);

    if (request) {
      curatedHistory.push(createUserContent(request));
    }

    // Regardless of `force`, don't do anything if the history is empty.
    if (
      curatedHistory.length === 0 ||
      (this.hasFailedCompressionAttempt && !force)
    ) {
      return {
        originalTokenCount: 0,
        newTokenCount: 0,
        compressionStatus: CompressionStatus.NOOP,
      };
    }

    // NOTE: Token counting now enabled for all models including custom ones
    // The customAdapter provides a universal token estimation algorithm
    // TODO: Future enhancement - use model-specific token counting APIs when available

    let originalTokenCount: number;

    // Use different token counting method based on model router status
    if (this.config.getUseModelRouter()) {
      // Model router enabled: use ModelService for token counting
      const modelService = new ModelService(this.config);
      const historyMessages = curatedHistory.map((content) =>
        APITranslator.geminiContentToUnified(content),
      );

      const unifiedRequest: UnifiedRequest = {
        messages: historyMessages,
        model,
      };

      const tokenResponse = await modelService.countTokens(unifiedRequest, model);
      originalTokenCount = tokenResponse.tokenCount || 0;
    } else {
      // Traditional Gemini API: use contentGenerator
      const tokenResponse = await this.getContentGeneratorOrFail().countTokens({
        model,
        contents: curatedHistory,
      });
      originalTokenCount = tokenResponse.totalTokens || 0;
    }

    if (originalTokenCount === undefined || originalTokenCount === 0) {
      console.warn(`Could not determine token count for model ${model}.`);
      this.hasFailedCompressionAttempt = !force && true;
      return {
        originalTokenCount: 0,
        newTokenCount: 0,
        compressionStatus:
          CompressionStatus.COMPRESSION_FAILED_TOKEN_COUNT_ERROR,
      };
    }

    const contextPercentageThreshold =
      this.config.getChatCompression()?.contextPercentageThreshold;

    // Don't compress if not forced and we are under the limit.
    if (!force) {
      const threshold =
        contextPercentageThreshold ?? COMPRESSION_TOKEN_THRESHOLD;
      if (originalTokenCount < threshold * tokenLimit(model)) {
        return {
          originalTokenCount,
          newTokenCount: originalTokenCount,
          compressionStatus: CompressionStatus.NOOP,
        };
      }
    }

    let compressBeforeIndex = findIndexAfterFraction(
      curatedHistory,
      1 - COMPRESSION_PRESERVE_THRESHOLD,
    );
    // Find the first user message after the index. This is the start of the next turn.
    while (
      compressBeforeIndex < curatedHistory.length &&
      (curatedHistory[compressBeforeIndex]?.role === 'model' ||
        isFunctionResponse(curatedHistory[compressBeforeIndex]))
    ) {
      compressBeforeIndex++;
    }

    const historyToCompress = curatedHistory.slice(0, compressBeforeIndex);
    const historyToKeep = curatedHistory.slice(compressBeforeIndex);

    // Generate compression summary using appropriate method
    let summary: string;

    if (this.config.getUseModelRouter()) {
      // Model router enabled: use ModelService for summary generation
      const modelService = new ModelService(this.config);

      // Convert history to unified format
      const historyMessages = historyToCompress.map((content) =>
        APITranslator.geminiContentToUnified(content),
      );

      // Add the compression instruction as the last message
      const compressionMessages = [
        ...historyMessages,
        {
          role: MessageRole.USER,
          content: [
            {
              type: 'text' as const,
              text: 'First, reason in your scratchpad. Then, generate the <state_snapshot>.',
            },
          ],
        },
      ];

      const unifiedRequest: UnifiedRequest = {
        messages: compressionMessages,
        model,
        systemMessage: getCompressionPrompt(),
        temperature: 0.1,
      };

      const response = await modelService.generateContent(unifiedRequest, model);
      // Extract text from ContentPart array
      summary = response.content
        .filter(part => part.type === 'text')
        .map(part => part.text || '')
        .join('') || '';
    } else {
      // Traditional Gemini API: use contentGenerator
      const summaryResponse = await this.config
        .getContentGenerator()
        .generateContent(
          {
            model,
            contents: [
              ...historyToCompress,
              {
                role: 'user',
                parts: [
                  {
                    text: 'First, reason in your scratchpad. Then, generate the <state_snapshot>.',
                  },
                ],
              },
            ],
            config: {
              systemInstruction: { text: getCompressionPrompt() },
            },
          },
          prompt_id,
        );
      summary = getResponseText(summaryResponse) ?? '';
    }

    const chat = await this.startChat([
      {
        role: 'user',
        parts: [{ text: summary }],
      },
      {
        role: 'model',
        parts: [{ text: 'Got it. Thanks for the additional context!' }],
      },
      ...historyToKeep,
    ]);
    this.forceFullIdeContext = true;

    // Count tokens in the compressed history using the same method
    let newTokenCount: number;
    const compressedHistory = chat.getHistory();
    const currentModel = this.config.getModel();

    if (this.config.getUseModelRouter()) {
      // Model router enabled: use ModelService for token counting
      const modelService = new ModelService(this.config);
      const compressedMessages = compressedHistory.map((content) =>
        APITranslator.geminiContentToUnified(content),
      );

      const unifiedRequest: UnifiedRequest = {
        messages: compressedMessages,
        model: currentModel,
      };

      const tokenResponse = await modelService.countTokens(unifiedRequest, currentModel);
      newTokenCount = tokenResponse.tokenCount || 0;
    } else {
      // Traditional Gemini API: use contentGenerator
      const tokenResponse = await this.getContentGeneratorOrFail().countTokens({
        model: currentModel,
        contents: compressedHistory,
      });
      newTokenCount = tokenResponse.totalTokens || 0;
    }

    if (newTokenCount === undefined || newTokenCount === 0) {
      console.warn('Could not determine compressed history token count.');
      this.hasFailedCompressionAttempt = !force && true;
      return {
        originalTokenCount,
        newTokenCount: originalTokenCount,
        compressionStatus:
          CompressionStatus.COMPRESSION_FAILED_TOKEN_COUNT_ERROR,
      };
    }

    logChatCompression(
      this.config,
      makeChatCompressionEvent({
        tokens_before: originalTokenCount,
        tokens_after: newTokenCount,
      }),
    );

    if (newTokenCount > originalTokenCount) {
      this.getChat().setHistory(curatedHistory);
      this.hasFailedCompressionAttempt = !force && true;
      return {
        originalTokenCount,
        newTokenCount,
        compressionStatus:
          CompressionStatus.COMPRESSION_FAILED_INFLATED_TOKEN_COUNT,
      };
    } else {
      this.chat = chat; // Chat compression successful, set new state.
    }

    return {
      originalTokenCount,
      newTokenCount,
      compressionStatus: CompressionStatus.COMPRESSED,
    };
  }

  /**
   * Handle sending message through ModelService when model router is enabled
   */
  private async *sendMessageStreamWithModelRouter(
    request: PartListUnion,
    signal: AbortSignal,
    prompt_id: string,
    _turns: number
  ): AsyncGenerator<ServerGeminiStreamEvent, void> {
    try {
      const modelService = new ModelService(this.config);

      const history = this.getChat().getHistory(true);
      const userContent = createUserContent(request);
      const historyMessages = history.map((content) =>
        APITranslator.geminiContentToUnified(content),
      );
      const userMessage = APITranslator.geminiContentToUnified(userContent);

      // Get model configuration from the config system
      const modelConfig = this.config.getModelConfig();
      let actualModelName: string;
      let maxTokens: number;

      if (modelConfig) {
        // Use ModelRouter configuration (provider:model)
        actualModelName = modelConfig.model;
        maxTokens = getMaxOutputTokens(modelConfig);
        logger.info('Using ModelRouter configuration', {
          provider: modelConfig.provider,
          model: modelConfig.model,
          baseUrl: modelConfig.baseUrl,
          maxTokens
        });
      } else {
        // Fallback to traditional model configuration
        actualModelName = this.config.getModel();
        // Get a temporary model config for determining maxTokens
        const tempConfig = getModelConfig(actualModelName);
        maxTokens = getMaxOutputTokens(tempConfig);
        logger.info('Using traditional model configuration', {
          model: actualModelName,
          maxTokens
        });
      }

      // Get system instruction for all model types
      const userMemory = this.config.getUserMemory();
      const providerName = modelConfig?.metadata?.providerName || modelConfig?.provider;
      let systemInstruction = getCoreSystemPrompt(userMemory, actualModelName, providerName);

      // In Plan mode, append Plan-specific system prompt
      if (this.planModeActive) {
        systemInstruction += '\n\n' + getPlanModeSystemPrompt();
      }

      const unifiedRequest: UnifiedRequest = {
        messages: [...historyMessages, userMessage],
        model: actualModelName,
        maxTokens,
        temperature: 0.1,
        systemMessage: systemInstruction,  // Add system instruction
      };

      const tools = this.getUnifiedTools();
      if (tools.length > 0) {
        unifiedRequest.tools = tools;
      }

      const response = await modelService.generateContent(
        unifiedRequest,
        actualModelName,
      );

      if (signal.aborted) {
        yield { type: GeminiEventType.UserCancelled };
        return;
      }

      this.getChat().addHistory(userContent);

      const enrichedContent: ContentPart[] = [];
      let pendingText = '';

      const rawContent = response.content ?? [];
      for (const part of rawContent) {
        if (part.type === 'text') {
          enrichedContent.push(part);
          pendingText += part.text || '';
          continue;
        }

        if (part.type === 'function_call' && part.functionCall) {
          if (pendingText) {
            yield {
              type: GeminiEventType.Content,
              value: pendingText,
            };
            pendingText = '';
          }

          const callId =
            part.functionCall.id ??
            this.generateToolCallId(part.functionCall.name);

          const functionCall = {
            ...part.functionCall,
            id: callId,
          };

          const functionCallPart: ContentPart = {
            type: 'function_call',
            functionCall,
          };

          enrichedContent.push(functionCallPart);

          yield {
            type: GeminiEventType.ToolCallRequest,
            value: {
              callId,
              name: functionCall.name || 'undefined_tool_name',
              args: functionCall.args || {},
              isClientInitiated: false,
              prompt_id,
            },
          };
          continue;
        }

        if (pendingText) {
          yield {
            type: GeminiEventType.Content,
            value: pendingText,
          };
          pendingText = '';
        }

        enrichedContent.push(part);
      }

      if (pendingText) {
        yield {
          type: GeminiEventType.Content,
          value: pendingText,
        };
      }

      const assistantUnifiedMessage = {
        role: MessageRole.ASSISTANT,
        content: enrichedContent,
      };

      const geminiAssistantContent =
        APITranslator.unifiedToGeminiContent(assistantUnifiedMessage);

      const modelResponse = {
        role: 'model' as const,
        parts: geminiAssistantContent.parts ?? [],
      };
      this.getChat().addHistory(modelResponse);

      const finishReason = this.mapFinishReason(response.finishReason);
      yield {
        type: GeminiEventType.Finished,
        value: {
          reason: finishReason,
          usageMetadata: response.usage
            ? {
                promptTokenCount: response.usage.promptTokens,
                totalTokenCount: response.usage.totalTokens,
                candidatesTokenCount: response.usage.completionTokens,
              }
            : undefined,
        },
      };

    } catch (error) {
      logger.error('Error in sendMessageStreamWithModelRouter', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      const structuredError: StructuredError = {
        message: getErrorMessage(error as Error),
        status:
          (error as { statusCode?: number }).statusCode ??
          (error as { status?: number }).status ??
          500,
      };
      yield {
        type: GeminiEventType.Error,
        value: {
          error: structuredError,
        },
      };
    }
  }

  private getUnifiedTools(): ToolDefinition[] {
    const toolRegistry = this.config.getToolRegistry();
    const declarations =
      typeof toolRegistry.getFunctionDeclarations === 'function'
        ? toolRegistry.getFunctionDeclarations()
        : [];

    // Define read-only tools allowed in Plan mode
    const readOnlyTools = [
      'read_file',
      'read_many_files',
      'ls',
      'glob',
      'grep',
      'rg',
      'web_fetch',
      'web_search',
      'create_plan', // Special: Plan creation tool
    ];

    const tools: ToolDefinition[] = [];
    for (const declaration of declarations as FunctionDeclaration[]) {
      if (!declaration?.name) {
        continue;
      }

      // In Plan mode, only include read-only tools
      if (this.planModeActive && !readOnlyTools.includes(declaration.name)) {
        continue;
      }

      tools.push({
        name: declaration.name,
        description: declaration.description ?? '',
        parameters: this.extractParametersSchema(declaration),
      });
    }

    return tools;
  }

  private extractParametersSchema(
    declaration: FunctionDeclaration,
  ): { type: 'object'; properties: Record<string, any>; required?: string[] } {
    const parameterSchema = declaration.parametersJsonSchema;

    if (
      parameterSchema &&
      typeof parameterSchema === 'object' &&
      !Array.isArray(parameterSchema)
    ) {
      return this.ensureObjectSchema(parameterSchema as Record<string, any>);
    }

    if (declaration.parameters && typeof declaration.parameters === 'object') {
      try {
        const parsed = JSON.parse(JSON.stringify(declaration.parameters));
        return this.ensureObjectSchema(parsed);
      } catch {
        // fall through to default schema
      }
    }

    return { type: 'object', properties: {} };
  }

  private mapFinishReason(reason?: string): FinishReason {
    switch (reason) {
      case 'length':
        return FinishReason.MAX_TOKENS;
      case 'function_call':
        return FinishReason.OTHER;
      case 'content_filter':
        return FinishReason.SAFETY;
      case 'stop':
      default:
        return FinishReason.STOP;
    }
  }

  private generateToolCallId(toolName?: string): string {
    const safeName =
      (toolName && toolName.replace(/[^a-zA-Z0-9_-]/g, '')) || 'tool';
    return `${safeName}-${Date.now().toString(16)}-${Math.random()
      .toString(16)
      .slice(2, 10)}`;
  }

  private ensureObjectSchema(
    schema: Record<string, any>,
  ): { type: 'object'; properties: Record<string, any>; required?: string[] } {
    const normalized = { ...schema };
    if (normalized['type'] !== 'object') {
      normalized['type'] = 'object';
    }
    if (
      !normalized['properties'] ||
      typeof normalized['properties'] !== 'object' ||
      Array.isArray(normalized['properties'])
    ) {
      normalized['properties'] = {};
    }
    return normalized as {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  }
}

export const TEST_ONLY = {
  COMPRESSION_PRESERVE_THRESHOLD,
  COMPRESSION_TOKEN_THRESHOLD,
};
