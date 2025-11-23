/**
 * @license
 * Copyright 2025 Gemini CLI
 * SPDX-License-Identifier: MIT
 */

import type { TiangongAgentDefinition } from './types.js';
import type { Config } from '../config/config.js';
import type { ModelService } from '../services/modelService.js';
import type { ToolRegistry } from '../tools/tool-registry.js';
import type {
  UnifiedRequest,
  UnifiedMessage,
} from '../adapters/base/types.js';
import { MessageRole } from '../adapters/base/types.js';
import { AgentManager } from './AgentManager.js';
import { ContextManager } from './ContextManager.js';
import { ToolFilter } from './ToolFilter.js';
import { MCPRegistry } from './MCPRegistry.js';
import { Router } from './Router.js';
import { HandoffManager } from './HandoffManager.js';
import type {
  AgentExecuteOptions,
  AgentExecuteResponse,
  AgentRuntime,
  HandoffContext,
  RoutingConfig,
  AgentContext,
} from './types.js';
import { HandoffError } from './types.js';

/**
 * Executes Agent conversations with isolated contexts and tool filtering
 */

export class AgentExecutor {
  private agentManager: AgentManager;
  private contextManager: ContextManager;
  private toolFilter: ToolFilter;
  private mcpRegistry: MCPRegistry;
  private router: Router | null = null;
  private handoffManager: HandoffManager | null = null;

  constructor(
    private config: Config,
    private modelService: ModelService,
    private toolRegistry: ToolRegistry,
  ) {
    this.agentManager = new AgentManager();
    this.contextManager = new ContextManager();
    this.toolFilter = new ToolFilter();
    this.mcpRegistry = new MCPRegistry();
  }

  /**
   * Initialize the executor by loading agents and MCP servers
   */

  async initialize(routingConfig?: Partial<RoutingConfig>): Promise<void> {
    // Load agents
    await this.agentManager.loadAgents();

    // Register MCP servers
    const mcpServers = this.config.getMcpServers();
    if (mcpServers) {
      this.mcpRegistry.registerServers(mcpServers);
    }

    // Initialize router
    this.router = new Router(
      this.config,
      this.agentManager,
      this.modelService,
      routingConfig
    );

    // Initialize handoff manager
    this.handoffManager = new HandoffManager(this.agentManager);

    console.log('[AgentExecutor] Initialized with routing and handoff support');
  }

  /**
   * Execute an agent with a prompt
   *
   * @param agentName - Name of the agent to execute
   * @param prompt - User prompt
   * @param options - Execution options
   * @returns Agent response
   */

  async execute(
    agentName: string,
    prompt: string,
    options: AgentExecuteOptions = {}
  ): Promise<AgentExecuteResponse> {
    const startTime = Date.now();

    // Get agent definition
    const agent = this.agentManager.getAgent(agentName);
    if (!agent) {
      throw new Error(`Agent '${agentName}' not found`);
    }

    // Build runtime (validate agent configuration)
    const runtime = await this.buildRuntime(agent);

    // Determine context mode (priority: runtime > agent definition > default)
    const contextMode =
      options.contextMode ||        // Runtime parameter (highest priority)
      agent.contextMode ||           // Agent definition
      'isolated';                    // Default

    // For hybrid mode, execute internally with isolated mode
    // (Agent will use isolated context during execution)
    const internalMode = contextMode === 'hybrid' ? 'isolated' : contextMode;

    // Get or create context with internal mode
    const context = this.contextManager.getContext(agentName, internalMode);

    // Add user message to history
    const userMessage: UnifiedMessage = {
      role: MessageRole.USER,
      content: [
        {
          type: 'text',
          text: prompt,
        },
      ],
    };

    this.contextManager.addMessage(agentName, userMessage, internalMode);

    // Track tool calls for hybrid mode
    const toolCallsTracking: Array<{ name: string; success: boolean; error?: string }> = [];

    // Get filtered tools for agent
    const toolDefinitions = this.getToolDefinitions(runtime.availableTools);

    // Add handoff tools (transfer_to_* functions)
    const handoffTools = this.buildHandoffTools(agent);
    toolDefinitions.push(...handoffTools);

    // Execute with tool calling loop
    let totalTokensUsed = 0;
    const maxIterations = 30; // Increased from 10 to allow more complex tasks
    let iteration = 0;
    let finalText = '';

    while (iteration < maxIterations) {
      iteration++;

      // Prepare request
      const model = agent.model || this.config.getModel() || 'gemini-2.0-flash';

      // Build system message with context mode instructions
      const systemMessage = this.buildSystemMessage(agent, internalMode, context);

      // Sanitize conversation history for custom models (especially in shared mode)
      const sanitizedMessages = this.sanitizeMessagesForAgent(
        context.conversationHistory,
        internalMode,
        agent.model
      );

      // Debug: Log sanitized messages for troubleshooting (when DEBUG env var is set)
      if (process.env['DEBUG_AGENT_MESSAGES'] || process.env['DEBUG']) {
        console.log(`[AgentExecutor] Sanitized messages for ${agentName}:`, {
          count: sanitizedMessages.length,
          contextMode: internalMode,
          messages: sanitizedMessages.map((m, i) => ({
            index: i,
            role: m.role,
            contentParts: m.content.length,
            contentTypes: m.content.map(p => p.type),
            preview: m.content
              .filter(p => p.type === 'text')
              .map(p => p.text?.substring(0, 80))
              .join(' | ')
          }))
        });
      }

      const request: UnifiedRequest = {
        model,
        messages: sanitizedMessages,
        systemMessage,
        tools: toolDefinitions.length > 0 ? toolDefinitions : undefined,
        maxTokens: options.maxTokens,
        temperature: options.temperature,
        stream: options.stream || false,
      };

      // Execute via model service
      const response = await this.modelService.generateContent(request);

      // Track token usage
      if (response.usage) {
        totalTokensUsed += response.usage.totalTokens;
      }

      // Check for function calls
      const functionCalls = response.content.filter(
        part => part.type === 'function_call'
      );

      // Add assistant message to history
      const assistantMessage: UnifiedMessage = {
        role: MessageRole.ASSISTANT,
        content: response.content,
      };
      this.contextManager.addMessage(agentName, assistantMessage, internalMode);

      // If no function calls, we're done
      if (functionCalls.length === 0) {
        finalText = response.content
          .filter(part => part.type === 'text')
          .map(part => part.text || '')
          .join('\n');
        break;
      }

      // Execute function calls
      const functionResponses: UnifiedMessage[] = [];

      for (const call of functionCalls) {
        if (!call.functionCall) continue;

        const { name, args, id } = call.functionCall;

        // Check if this is a handoff tool call
        if (this.isHandoffTool(name)) {
          try {
            // Extract target agent from tool name
            const targetAgent = this.extractHandoffTarget(name);

            // Validate handoff
            if (!this.handoffManager) {
              throw new Error('HandoffManager not initialized');
            }

            // Get conversation history for handoff context
            const conversationHistory = this.contextManager.getContext(agentName, internalMode)
              .conversationHistory;

            // Create handoff context
            const handoffContext = await this.handoffManager.initiateHandoff(
              agentName,
              targetAgent,
              args['reason'] || 'Agent requested handoff',
              args['context'],
              conversationHistory
            );

            // Execute handoff
            const handoffResponse = await this.executeWithHandoff(
              targetAgent,
              handoffContext,
              options
            );

            // Add handoff response
            functionResponses.push({
              role: MessageRole.FUNCTION,
              content: [
                {
                  type: 'function_response',
                  functionResponse: {
                    name,
                    content: {
                      success: true,
                      target_agent: targetAgent,
                      response: handoffResponse.text,
                    },
                    id,
                  },
                },
              ],
            });

            // After handoff, we can optionally return the handoff response directly
            // For now, continue the loop to let the original agent acknowledge the handoff
          } catch (error) {
            console.error(`[AgentExecutor] Handoff error:`, error);

            // Add error response
            functionResponses.push({
              role: MessageRole.FUNCTION,
              content: [
                {
                  type: 'function_response',
                  functionResponse: {
                    name,
                    content: {
                      error:
                        error instanceof HandoffError
                          ? `Handoff failed: ${error.message} (${error.code})`
                          : error instanceof Error
                            ? error.message
                            : String(error),
                    },
                    id,
                  },
                },
              ],
            });
          }
        } else {
          // Regular tool call
          try {
            // Track tool call for hybrid mode
            if (contextMode === 'hybrid') {
              toolCallsTracking.push({ name, success: false });
            }

            // Notify tool call start
            if (options.onToolCall) {
              options.onToolCall(name, args);
            }

            // Get tool and build invocation
            const tool = this.toolRegistry.getTool(name);
            if (!tool) {
              throw new Error(`Tool '${name}' not found`);
            }

            const invocation = tool.build(args);

            // Execute tool invocation with AbortController
            const abortController = new AbortController();
            const result = await invocation.execute(abortController.signal);

            // Mark tool call as successful for hybrid mode
            if (contextMode === 'hybrid') {
              const lastCall = toolCallsTracking[toolCallsTracking.length - 1];
              if (lastCall && lastCall.name === name) {
                lastCall.success = true;
              }
            }

            // Notify tool call result
            if (options.onToolResult) {
              options.onToolResult(name, result);
            }

            // Add function response
            functionResponses.push({
              role: MessageRole.FUNCTION,
              content: [
                {
                  type: 'function_response',
                  functionResponse: {
                    name,
                    content: result.llmContent,
                    id,
                  },
                },
              ],
            });
          } catch (error) {
            // Track error for hybrid mode
            if (contextMode === 'hybrid') {
              const lastCall = toolCallsTracking[toolCallsTracking.length - 1];
              if (lastCall && lastCall.name === name) {
                lastCall.success = false;
                lastCall.error = error instanceof Error ? error.message : String(error);
              }
            }

            // Notify tool call error
            if (options.onToolResult) {
              options.onToolResult(name, null, error as Error);
            }

            // Add error response
            functionResponses.push({
              role: MessageRole.FUNCTION,
              content: [
                {
                  type: 'function_response',
                  functionResponse: {
                    name,
                    content: {
                      error: error instanceof Error ? error.message : String(error),
                    },
                    id,
                  },
                },
              ],
            });
          }
        }
      }

      // Add function responses to context
      for (const funcResp of functionResponses) {
        this.contextManager.addMessage(agentName, funcResp, internalMode);
      }

      // Continue loop to get final response
    }

    // Check if we exited due to max iterations
    if (iteration >= maxIterations) {
      console.warn(`[AgentExecutor] WARNING: Agent '${agentName}' reached max iterations (${maxIterations}) without final text response`);
      console.warn(`[AgentExecutor] This may indicate an infinite tool calling loop. Check agent prompt and contextMode configuration.`);

      // Try to extract any text from the last response in context
      if (finalText.length === 0) {
        const lastMessages = context.conversationHistory.slice(-3);
        for (const msg of lastMessages.reverse()) {
          if (msg.role === MessageRole.ASSISTANT) {
            const textFromMsg = msg.content
              .filter(part => part.type === 'text')
              .map(part => part.text || '')
              .join('\n');

            if (textFromMsg.length > 0) {
              finalText = textFromMsg;
              break;
            }
          }
        }
      }
    }

    // Build response
    const executeResponse: AgentExecuteResponse = {
      agentName,
      text: finalText,
      context: this.contextManager.getContext(agentName, internalMode),
      metadata: {
        model: agent.model || this.config.getModel() || 'gemini-2.0-flash',
        tokensUsed: totalTokensUsed,
        durationMs: Date.now() - startTime,
        iterations: iteration,
        contextMode,
        toolCallsTracking: contextMode === 'hybrid' ? toolCallsTracking : undefined,
      },
    };

    // For hybrid mode, write summary to main session
    if (contextMode === 'hybrid') {
      // console.error(`[HybridMode] Detected hybrid context mode for agent: ${agentName}`);
      const summaryMessage = this.buildHybridSummary(
        agentName,
        prompt,
        executeResponse,
        options.hybridOptions
      );

      this.contextManager.addHybridSummary(agentName, summaryMessage);
    }

    return executeResponse;
  }

  /**
   * Auto-route user input to the best matching agent and execute
   *
   * @param prompt - User prompt
   * @param options - Execution options
   * @returns Agent response with routing info
   */

  async executeWithRouting(
    prompt: string,
    options: AgentExecuteOptions = {}
  ): Promise<AgentExecuteResponse & { routedAgent?: string }> {
    if (!this.router) {
      throw new Error('Router not initialized. Call initialize() first.');
    }

    // Route to best agent
    const routingResult = await this.router.route(prompt);

    if (!routingResult) {
      throw new Error('No suitable agent found for this request');
    }

    // Execute with routed agent
    const response = await this.execute(routingResult.agent.name, prompt, options);

    return {
      ...response,
      routedAgent: routingResult.agent.name,
    };
  }

  /**
   * Execute agent with handoff context (internal method for handoff chains)
   *
   * @param agentName - Target agent name
   * @param handoffContext - Handoff context from previous agent
   * @param options - Execution options
   * @returns Agent response
   */

  async executeWithHandoff(
    agentName: string,
    handoffContext: HandoffContext,
    options: AgentExecuteOptions = {}
  ): Promise<AgentExecuteResponse> {
    if (!this.handoffManager) {
      throw new Error('HandoffManager not initialized. Call initialize() first.');
    }

    // Notify about handoff via callback
    if (options.onHandoff) {
      options.onHandoff(handoffContext.from_agent, agentName, handoffContext.reason);
    }

    // Build prompt with handoff context
    const handoffPrompt = this.buildHandoffPrompt(handoffContext);

    // Execute target agent with handoff context
    const response = await this.execute(agentName, handoffPrompt, options);

    // Complete handoff
    this.handoffManager.completeHandoff(handoffContext);

    return response;
  }

  /**
   * Build prompt for handoff including context from previous agent
   */

  private buildHandoffPrompt(handoffContext: HandoffContext): string {
    let prompt = `[Handoff from ${handoffContext.from_agent}]\n\n`;
    prompt += `Reason: ${handoffContext.reason}\n\n`;

    if (handoffContext.summary) {
      prompt += `Summary: ${handoffContext.summary}\n\n`;
    }

    if (handoffContext.context) {
      prompt += `Context: ${handoffContext.context}\n\n`;
    }

    if (handoffContext.conversation_history && handoffContext.conversation_history.length > 0) {
      prompt += `Previous conversation:\n`;
      for (const msg of handoffContext.conversation_history.slice(-5)) {
        // Last 5 messages
        const role = msg.role.toUpperCase();
        const text = msg.content
          .filter(p => p.type === 'text')
          .map(p => p.text)
          .join(' ');
        prompt += `[${role}]: ${text}\n`;
      }
      prompt += '\n';
    }

    prompt += 'Please continue from here.';

    return prompt;
  }

  /**
   * Build hybrid mode summary message
   *
   * @param agentName - Agent name
   * @param prompt - Original user prompt
   * @param response - Agent execution response
   * @param options - Hybrid mode options
   * @returns Summary message to add to main session
   */
  private buildHybridSummary(
    agentName: string,
    prompt: string,
    response: AgentExecuteResponse,
    options?: import('./types.js').HybridContextOptions
  ): UnifiedMessage {
    const opts = {
      includeSummary: true,
      includeToolCalls: false,
      includeErrors: true,
      includeMetadata: true,
      ...options
    };

    // Use custom summary if provided
    if (opts.customSummary) {
      const customText = opts.customSummary(response);
      console.error(`[HybridMode] Building custom summary (agent: ${agentName}, length: ${customText.length} chars)`);
      return {
        role: MessageRole.ASSISTANT,
        content: [{ type: 'text', text: customText }]
      };
    }

    // Build default summary
    let summaryText = `[Agent: ${agentName}]\n\n`;
    summaryText += response.text;

    // Add metadata section if requested
    if (opts.includeMetadata || opts.includeToolCalls || opts.includeErrors) {
      summaryText += '\n\n---\n\n';
      summaryText += `*Execution Summary*\n`;
      summaryText += `- Duration: ${response.metadata.durationMs}ms\n`;
      summaryText += `- Iterations: ${response.metadata.iterations || 0}\n`;

      if (opts.includeToolCalls && response.metadata.toolCallsTracking) {
        const tools = response.metadata.toolCallsTracking;
        summaryText += `- Tools called: ${tools.length}\n`;

        if (opts.includeErrors) {
          const errors = tools.filter(t => !t.success);
          if (errors.length > 0) {
            summaryText += `- Errors: ${errors.map(e => `${e.name}: ${e.error}`).join('; ')}\n`;
          }
        }
      }
    }

    // console.error(`[HybridMode] Built summary (agent: ${agentName}, length: ${summaryText.length} chars, metadata: ${opts.includeMetadata})`);

    return {
      role: MessageRole.ASSISTANT,
      content: [{ type: 'text', text: summaryText }]
    };
  }

  /**
   * Build handoff tools for an agent (transfer_to_* functions)
   */

  private buildHandoffTools(agent: TiangongAgentDefinition): import('../adapters/base/types.js').ToolDefinition[] {
    if (!agent.handoffs || agent.handoffs.length === 0) {
      return [];
    }

    const handoffTools: import('../adapters/base/types.js').ToolDefinition[] = [];

    for (const handoff of agent.handoffs) {
      handoffTools.push({
        name: `transfer_to_${handoff.to}`,
        description:
          handoff.description ||
          `Transfer this conversation to ${handoff.to} agent. ${handoff.when === 'auto' ? 'This handoff happens automatically when appropriate.' : 'Use this when you need specialized help from this agent.'}`,
        parameters: {
          type: 'object',
          properties: {
            reason: {
              type: 'string',
              description: 'Reason for transferring to this agent',
            },
            context: {
              type: 'string',
              description: 'Additional context to pass to the next agent',
            },
          },
          required: ['reason'],
        },
      });
    }

    return handoffTools;
  }

  /**
   * Check if a tool call is a handoff (transfer_to_*)
   */

  private isHandoffTool(toolName: string): boolean {
    return toolName.startsWith('transfer_to_');
  }

  /**
   * Extract target agent name from handoff tool name
   */

  private extractHandoffTarget(toolName: string): string {
    return toolName.replace('transfer_to_', '');
  }

  /**
   * Get router instance (for CLI commands)
   */

  getRouter(): Router | null {
    return this.router;
  }

  /**
   * Get handoff manager instance (for CLI commands)
   */

  getHandoffManager(): HandoffManager | null {
    return this.handoffManager;
  }

  /**
   * Convert tool names to ToolDefinition format
   */

  private getToolDefinitions(toolNames: string[]): import('../adapters/base/types.js').ToolDefinition[] {
    const definitions: import('../adapters/base/types.js').ToolDefinition[] = [];

    for (const toolName of toolNames) {
      const tool = this.toolRegistry.getTool(toolName);
      if (tool) {
        const schema = tool.parameterSchema as any;
        definitions.push({
          name: tool.name,
          description: tool.description || '',
          parameters: schema || {
            type: 'object',
            properties: {},
            required: [],
          },
        });
      }
    }

    return definitions;
  }

  /**
   * Build runtime state for an agent
   */

  private async buildRuntime(agent: TiangongAgentDefinition): Promise<AgentRuntime> {
    // Get all available tools
    const allToolNames = this.toolRegistry.getAllToolNames();

    // Get agent's allowed MCP servers
    const mcpServers = this.mcpRegistry.getServersForAgent(agent);

    // Filter out MCP tools from servers the agent is not allowed to use
    const toolsWithMCPFilter = this.filterMCPTools(allToolNames, mcpServers);

    // Filter tools based on agent's allow/deny lists
    const filteredTools = this.toolFilter.filterTools(toolsWithMCPFilter, agent);

    return {
      definition: agent,
      context: this.contextManager.getContext(agent.name),
      availableTools: filteredTools,
      mcpServers,
    };
  }

  /**
   * Filter MCP tools based on agent's allowed MCP servers
   *
   * MCP tools are named like "<server-name>__<tool-name>" (e.g., "context7__get-library-docs")
   * This method removes MCP tools from servers not in the agent's mcp.servers list
   *
   * @param allTools - All available tool names
   * @param allowedServers - Server names the agent is allowed to use
   * @returns Filtered tool names
   */

  private filterMCPTools(allTools: string[], allowedServers: string[]): string[] {
    // If no MCP servers configured, allow all non-MCP tools
    if (allowedServers.length === 0) {
      return allTools.filter(tool => {
        // Check if this looks like an MCP tool (has "__" separator)
        // MCP tools are namespaced as "server__tool"
        const parts = tool.split('__');
        if (parts.length >= 2) {
          // Check if this matches MCP server pattern
          const firstPart = parts[0];
          if (firstPart && /^[a-z][a-z0-9_-]*$/.test(firstPart)) {
            // This looks like an MCP tool, exclude it
            return false;
          }
        }
        return true;
      });
    }

    // Filter tools: keep non-MCP tools and MCP tools from allowed servers
    return allTools.filter(tool => {
      const parts = tool.split('__');
      if (parts.length >= 2) {
        const serverName = parts[0];
        // If this looks like an MCP tool, only allow if server is in allowed list
        if (serverName && /^[a-z][a-z0-9_-]*$/.test(serverName)) {
          return allowedServers.includes(serverName);
        }
      }
      // Not an MCP tool, allow it
      return true;
    });
  }

  /**
   * Get agent manager (for CLI commands)
   */

  getAgentManager(): AgentManager {
    return this.agentManager;
  }

  /**
   * Get context manager (for debugging/inspection)
   */

  getContextManager(): ContextManager {
    return this.contextManager;
  }

  /**
   * Clear context for an agent
   *
   * @param agentName - Agent name
   */

  clearContext(agentName: string): void {
    this.contextManager.clearHistory(agentName);
  }

  /**
   * Validate an agent before execution
   *
   * @param agentName - Agent name
   * @returns Validation result with errors/warnings
   */

  validateAgent(agentName: string): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const agent = this.agentManager.getAgent(agentName);
    if (!agent) {
      return {
        valid: false,
        errors: [`Agent '${agentName}' not found`],
        warnings: [],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate tools
    const allTools = this.toolRegistry.getAllToolNames();
    const toolValidation = this.toolFilter.validateToolConfig(agent, allTools);
    warnings.push(...toolValidation.warnings);

    // Validate MCP servers
    const mcpValidation = this.mcpRegistry.validateAgentServers(agent);
    warnings.push(...mcpValidation.warnings);

    // Check if agent has at least one tool
    const availableTools = this.toolFilter.filterTools(allTools, agent);
    if (availableTools.length === 0 && (!agent.mcp?.servers || agent.mcp.servers.length === 0)) {
      warnings.push('Agent has no available tools (all filtered out)');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get runtime information for an agent
   *
   * @param agentName - Agent name
   * @returns Runtime info or null
   */

  async getRuntimeInfo(agentName: string): Promise<AgentRuntime | null> {
    const agent = this.agentManager.getAgent(agentName);
    if (!agent) {
      return null;
    }

    return this.buildRuntime(agent);
  }

  /**
   * Build system message with context mode instructions
   *
   * @param agent - Agent definition
   * @param contextMode - Context mode (isolated or shared)
   * @param context - Agent context
   * @returns Enhanced system message
   */

  private buildSystemMessage(
    agent: TiangongAgentDefinition,
    contextMode: 'isolated' | 'shared',
    context: AgentContext
  ): string {
    let systemMessage = agent.systemPrompt || '';

    // Add handoff instructions if agent has configured handoffs
    if (agent.handoffs && agent.handoffs.length > 0) {
      systemMessage += '\n\n**Available Agent Handoffs**\n\n';
      systemMessage += 'You have access to the following specialized agents through handoff tools:\n\n';

      for (const handoff of agent.handoffs) {
        const toolName = `transfer_to_${handoff.to}`;
        const description = handoff.description || `Transfer to ${handoff.to} agent`;

        systemMessage += `- **${toolName}**: ${description}\n`;
      }

      systemMessage += '\n**When to use handoff tools:**\n';
      systemMessage += '- When the user\'s request falls outside your area of expertise or responsibility\n';
      systemMessage += '- When you recognize keywords or patterns that match another agent\'s specialty\n';
      systemMessage += '- When you identify that the task requires capabilities you don\'t have\n';
      systemMessage += '- **IMPORTANT**: Call the handoff tool IMMEDIATELY when you recognize the need to transfer. Do NOT attempt to handle tasks that should be transferred to another agent.\n\n';
    }

    // Add context mode instructions
    if (contextMode === 'isolated') {
      // Check if this is the first message (empty history besides current user message)
      const hasHistory = context.conversationHistory.length > 1;

      if (!hasHistory) {
        systemMessage += `\n\n**IMPORTANT - Context Mode: Isolated**

You are running in ISOLATED context mode. You do NOT have access to the main conversation history or other agents' conversations. Your conversation history only includes messages directly exchanged with the user in your isolated context.

When the user asks you to reference "previous content", "above discussion", "上述内容", or similar:
- If you don't see it in your conversation history, clearly state: "I'm running in isolated context mode and don't have access to previous conversations. Could you please provide the specific content you'd like me to work with?"
- Do NOT attempt to summarize, reference, or infer content that's not explicitly in your conversation history.
- Do NOT use your tool descriptions or role definition as a substitute for missing context.`;
      } else {
        systemMessage += `\n\n**Context Mode**: You are running in isolated context mode. You can reference your own conversation history with this user, but not the main session or other agents' conversations.`;
      }
    } else if (contextMode === 'shared') {
      systemMessage += `\n\n**Context Mode**: You are running in SHARED context mode. You have access to the main conversation history and can reference previous discussions from the main session.`;
    }

    return systemMessage;
  }

  /**
   * Sanitize conversation messages for agent execution
   *
   * This method cleans up the conversation history to ensure API compatibility,
   * especially for custom models that may have stricter message format requirements.
   *
   * @param messages - Original conversation history
   * @param contextMode - Context mode (isolated or shared)
   * @param agentModel - Agent's model identifier
   * @returns Sanitized message array
   */
  private sanitizeMessagesForAgent(
    messages: UnifiedMessage[],
    contextMode: 'isolated' | 'shared',
    agentModel?: string
  ): UnifiedMessage[] {
    // In isolated mode, messages are already clean (agent-specific only)
    if (contextMode === 'isolated') {
      return messages;
    }

    // In shared mode, we need to sanitize the main session history
    // which may contain incompatible structures from different models

    const sanitized: UnifiedMessage[] = [];

    for (const msg of messages) {
      // Skip messages with empty content
      if (!msg.content || msg.content.length === 0) {
        // console.warn('[AgentExecutor] Skipping message with empty content');
        continue;
      }

      // Filter out empty content parts
      const validContent = msg.content.filter(part => {
        if (part.type === 'text') {
          return typeof part.text === 'string' && part.text.trim().length > 0;
        }
        // Keep function calls and responses
        if (part.type === 'function_call' || part.type === 'function_response') {
          return true;
        }
        // Skip other types (images, etc.) for now to avoid compatibility issues
        return false;
      });

      if (validContent.length === 0) {
        console.warn('[AgentExecutor] Skipping message with no valid content parts');
        continue;
      }

      // Create sanitized message
      sanitized.push({
        role: msg.role,
        content: validContent,
      });
    }

    // Limit history to last N messages to avoid overwhelming the API
    // and reduce chances of format incompatibilities
    const MAX_HISTORY = 50; // Configurable limit
    let limitedMessages = sanitized;

    if (sanitized.length > MAX_HISTORY) {
      // Keep the most recent messages, but ensure we don't break conversation flow
      // Always start with a user message if possible
      limitedMessages = sanitized.slice(-MAX_HISTORY);

      // If first message is not from user, prepend a context message
      if (limitedMessages[0]?.role !== MessageRole.USER) {
        console.log(`[AgentExecutor] Prepending context message to truncated history`);
        limitedMessages.unshift({
          role: MessageRole.USER,
          content: [{
            type: 'text',
            text: '[Earlier conversation history truncated for API compatibility]'
          }]
        });
      }

      console.log(`[AgentExecutor] Limited message history: ${sanitized.length} → ${limitedMessages.length} messages`);
    }

    // CRITICAL: Enforce strict message ordering for OpenAI-compatible APIs
    // Many providers require: user → assistant → tool → user pattern
    const orderedMessages = this.enforceMessageOrdering(limitedMessages);

    // Log sanitization results for debugging
    // if (messages.length !== orderedMessages.length) {
    //   console.log(`[AgentExecutor] Message sanitization: ${messages.length} → ${orderedMessages.length} messages (contextMode: ${contextMode})`);
    // }

    return orderedMessages;
  }

  /**
   * Enforce strict message ordering required by OpenAI-compatible APIs
   *
   * Rules:
   * - Must start with USER message
   * - No consecutive messages with same role (except FUNCTION)
   * - Remove orphaned FUNCTION messages (without preceding ASSISTANT with tool_calls)
   *
   * @param messages - Messages to validate and reorder
   * @returns Properly ordered messages
   */
  private enforceMessageOrdering(messages: UnifiedMessage[]): UnifiedMessage[] {
    if (messages.length === 0) {
      return messages;
    }

    const ordered: UnifiedMessage[] = [];
    let lastRole: MessageRole | null = null;

    for (const msg of messages) {
      // Skip consecutive messages with the same role (merge or skip)
      if (msg.role === lastRole && msg.role !== MessageRole.FUNCTION) {
        // For USER or ASSISTANT, merge content with previous message
        if (ordered.length > 0) {
          const lastMsg = ordered[ordered.length - 1];
          // Append content to last message
          lastMsg.content.push(...msg.content);
          // console.log(`[AgentExecutor] Merged consecutive ${msg.role} messages`);
        }
        continue;
      }

      // Skip orphaned FUNCTION messages
      if (msg.role === MessageRole.FUNCTION) {
        // Check if previous message was ASSISTANT with function_call
        if (lastRole !== MessageRole.ASSISTANT) {
          // console.warn('[AgentExecutor] Skipping orphaned FUNCTION message');
          continue;
        }
      }

      ordered.push(msg);
      lastRole = msg.role;
    }

    // Ensure first message is USER
    if (ordered.length > 0 && ordered[0].role !== MessageRole.USER) {
      // console.log('[AgentExecutor] Prepending USER message to fix ordering');
      ordered.unshift({
        role: MessageRole.USER,
        content: [{
          type: 'text',
          text: '[Context from previous conversation]'
        }]
      });
    }

    return ordered;
  }
}
