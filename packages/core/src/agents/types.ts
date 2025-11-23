/**
 * @license
 * Copyright 2025 Gemini CLI
 * SPDX-License-Identifier: MIT
 */

import type { UnifiedMessage } from '../adapters/base/types.js';
import type { Content, FunctionDeclaration } from '@google/genai';
import type { AnyDeclarativeTool } from '../tools/tools.js';
import { type z } from 'zod';

/**
 * Agent definition loaded from .md files (Tiangong CLI custom agent system)
 * Note: This conflicts with upstream's AgentDefinition, so we temporarily use both names
 */
export interface TiangongAgentDefinition {
  /** Must be 'agent' */
  kind: 'agent';

  /** Unique identifier (file name without .md) */
  name: string;

  /** Human-readable title */
  title: string;

  /** Description (required) */
  description: string;

  /** Model to use (defaults to system model) */
  model?: string;

  /** Color for UI display (hex code) */
  color?: string;

  /** Scope: global (~/.gemini/agents) or project (.gemini/agents) */
  scope?: 'global' | 'project';

  /** Version string */
  version?: string;

  /** Context mode: isolated (default), shared, or hybrid */
  contextMode?: 'isolated' | 'shared' | 'hybrid';

  /** Tool access control */
  tools?: {
    /** Whitelist of allowed tools */
    allow?: string[];
    /** Blacklist of denied tools (takes precedence over allow) */
    deny?: string[];
  };

  /** MCP server integration */
  mcp?: {
    /** List of MCP server names to connect */
    servers?: string[];
  };

  /** Routing triggers */
  triggers?: {
    /** Keywords for rule-based routing */
    keywords?: string[];
    /** Regex patterns for rule-based routing */
    patterns?: string[];
    /** Priority (0-100, higher = more priority) */
    priority?: number;
  };

  /** Handoff configurations */
  handoffs?: Array<{
    /** Target agent name */
    to: string;
    /** When to trigger: manual (model decides), auto, conditional */
    when?: 'manual' | 'auto' | 'conditional';
    /** Description for the model */
    description?: string;
    /** Include conversation history in handoff */
    include_context?: boolean;
  }>;

  /** System prompt (from markdown body) */
  systemPrompt: string;

  /** Full path to the .md file */
  filePath: string;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Agent runtime context (isolated per agent)
 */
export interface AgentContext {
  /** Agent name */
  agentName: string;

  /** Conversation history (isolated from main session) */
  conversationHistory: UnifiedMessage[];

  /** Arbitrary metadata storage */
  metadata: Record<string, any>;

  /** Context creation time */
  createdAt: Date;

  /** Last interaction time */
  lastAccessedAt: Date;
}

/**
 * Agent runtime state (combines definition + context + resources)
 */
export interface AgentRuntime {
  /** Agent definition */
  definition: TiangongAgentDefinition;

  /** Isolated context */
  context: AgentContext;

  /** Filtered tool names (after allow/deny processing) */
  availableTools: string[];

  /** Connected MCP server names */
  mcpServers: string[];
}

/**
 * Agent validation result
 */
export interface AgentValidationResult {
  /** Validation passed */
  valid: boolean;

  /** Error messages (if validation failed) */
  errors: string[];

  /** Warning messages */
  warnings: string[];
}

/**
 * Hybrid context mode options
 */
export interface HybridContextOptions {
  /** Include summary in main session (default: true) */
  includeSummary?: boolean;

  /** Include tool calls list in summary (default: false) */
  includeToolCalls?: boolean;

  /** Include errors in summary (default: true) */
  includeErrors?: boolean;

  /** Include execution metadata (duration, iterations) in summary (default: true) */
  includeMetadata?: boolean;

  /** Custom summary formatter function */
  customSummary?: (response: AgentExecuteResponse) => string;
}

/**
 * Agent execution options
 */
export interface AgentExecuteOptions {
  /** Enable streaming responses */
  stream?: boolean;

  /** Maximum tokens for response */
  maxTokens?: number;

  /** Temperature (0-1) */
  temperature?: number;

  /** Interactive mode (continuous conversation) */
  interactive?: boolean;

  /** Force context mode (overrides agent definition) */
  contextMode?: 'isolated' | 'shared' | 'hybrid';

  /** Hybrid mode options (only used when contextMode is 'hybrid') */
  hybridOptions?: HybridContextOptions;

  /** Callback when a tool is about to be called */
  onToolCall?: (toolName: string, args: any) => void;

  /** Callback when a tool execution completes */
  onToolResult?: (toolName: string, result: any, error?: Error) => void;

  /** Callback when a handoff is initiated */
  onHandoff?: (fromAgent: string, toAgent: string, reason: string) => void;
}

/**
 * Agent execution response
 */
export interface AgentExecuteResponse {
  /** Agent name */
  agentName: string;

  /** Response text */
  text: string;

  /** Tool calls made during execution */
  toolCalls?: Array<{
    toolName: string;
    args: any;
    result: any;
  }>;

  /** Updated context after execution */
  context: AgentContext;

  /** Execution metadata */
  metadata: {
    /** Tokens used */
    tokensUsed?: number;
    /** Model used */
    model: string;
    /** Duration in ms */
    durationMs: number;
    /** Number of iterations (tool calling rounds) */
    iterations?: number;
    /** Context mode used */
    contextMode?: 'isolated' | 'shared' | 'hybrid';
    /** Tool calls tracking (for hybrid mode) */
    toolCallsTracking?: Array<{
      name: string;
      success: boolean;
      error?: string;
    }>;
  };
}

/**
 * Agent creation options
 */
export interface AgentCreateOptions {
  /** Agent name (required) */
  name: string;

  /** Human-readable title */
  title: string;

  /** Description (required) */
  description: string;

  /** Model to use */
  model?: string;

  /** Context mode */
  contextMode?: 'isolated' | 'shared' | 'hybrid';

  /** Scope (global or project) */
  scope?: 'global' | 'project';

  /** Template to use */
  template?: string;

  /** Custom system prompt (overrides template) */
  customSystemPrompt?: string;

  /** Tool allow list */
  allowTools?: string[];

  /** Tool deny list */
  denyTools?: string[];

  /** MCP servers */
  mcpServers?: string[];
}

/**
 * Agent list item (lightweight representation)
 */
export interface AgentListItem {
  name: string;
  title: string;
  description?: string;
  scope: 'global' | 'project';
  model?: string;
  filePath: string;
  updatedAt: Date;
}

/**
 * Front-matter structure from Agent .md files
 */
export interface AgentFrontMatter {
  kind: 'agent';
  name: string;
  title: string;
  description: string;
  model?: string;
  color?: string;
  scope?: 'global' | 'project';
  version?: string;
  contextMode?: 'isolated' | 'shared' | 'hybrid';
  tools?: {
    allow?: string[];
    deny?: string[];
  };
  mcp?: {
    servers?: string[];
  };
  triggers?: {
    keywords?: string[];
    patterns?: string[];
    priority?: number;
  };
  handoffs?: Array<{
    to: string;
    when?: 'manual' | 'auto' | 'conditional';
    description?: string;
    include_context?: boolean;
  }>;
}

/**
 * Routing configuration
 */
export interface RoutingConfig {
  /** Enable/disable routing */
  enabled: boolean;
  /** Routing strategy */
  strategy: 'rule' | 'llm' | 'hybrid';
  /** Rule-based routing configuration */
  rule: {
    confidence_threshold: number;
  };
  /** LLM-based routing configuration */
  llm: {
    model: string;
    timeout: number;
  };
  /** Fallback strategy when no match */
  fallback: 'none' | 'prompt_user' | 'default_agent';
}

/**
 * Routing score result
 */
export interface RoutingScore {
  /** Matched agent */
  agent: TiangongAgentDefinition;
  /** Score (0-100) */
  score: number;
  /** Confidence (0-100) */
  confidence: number;
  /** Matched keywords */
  matchedKeywords: string[];
  /** Matched patterns */
  matchedPatterns: string[];
}

/**
 * Handoff configuration
 */
export interface HandoffConfig {
  /** Target agent name */
  to: string;
  /** When to trigger handoff */
  when: 'manual' | 'auto' | 'conditional';
  /** Description for the model */
  description: string;
  /** Include conversation history */
  include_context?: boolean;
}

/**
 * Handoff context (passed between agents)
 */
export interface HandoffContext {
  /** Source agent */
  from_agent: string;
  /** Target agent */
  to_agent: string;
  /** Reason for handoff */
  reason: string;
  /** Additional context */
  context?: string;
  /** Work summary */
  summary?: string;
  /** Structured payload */
  payload?: Record<string, any>;
  /** Conversation history (optional) */
  conversation_history?: UnifiedMessage[];
  /** Metadata */
  metadata: {
    timestamp: number;
    handoff_chain: string[];
    chain_depth: number;
    correlation_id: string;
  };
}

/**
 * Handoff error
 */
export class HandoffError extends Error {
  constructor(
    message: string,
    public code: 'MAX_DEPTH_EXCEEDED' | 'CIRCULAR_HANDOFF' | 'PERMISSION_DENIED' | 'AGENT_NOT_FOUND'
  ) {
    super(message);
    this.name = 'HandoffError';
  }
}

// ============================================================================
// Workflow Types
// ============================================================================

/**
 * Workflow definition loaded from .yaml files
 */
export interface WorkflowDefinition {
  /** Must be 'workflow' */
  kind: 'workflow';

  /** Unique identifier (file name without .yaml) */
  name: string;

  /** Human-readable title */
  title: string;

  /** Optional description */
  description?: string;

  /** Scope: global (~/.gemini/workflows) or project (.gemini/workflows) */
  scope?: 'global' | 'project';

  /** Version string */
  version?: string;

  /** Routing triggers */
  triggers?: {
    /** Keywords for rule-based routing */
    keywords?: string[];
    /** Regex patterns for rule-based routing */
    patterns?: string[];
    /** Priority (0-100, higher = more priority) */
    priority?: number;
  };

  /** Execution steps */
  steps: WorkflowStep[];

  /** Error handling configuration */
  error_handling?: {
    /** What to do on error: continue to next step, stop, or retry */
    on_error: 'continue' | 'stop' | 'retry';
    /** Maximum retry attempts */
    max_retries?: number;
  };

  /** Timeout in milliseconds */
  timeout?: number;

  /** Full path to the .yaml file */
  filePath: string;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Workflow step definition
 */
export interface WorkflowStep {
  /** Unique step identifier */
  id: string;

  /** Step type: sequential (default) or parallel */
  type?: 'sequential' | 'parallel';

  /** Step description */
  description?: string;

  // ===== Sequential step fields (when type = 'sequential' or undefined) =====

  /** Agent to execute (required for sequential steps) */
  agent?: string;

  /** Input prompt (supports template variables like ${workflow.input}, ${stepId.output}) */
  input?: string;

  /** Condition to execute this step (JavaScript expression) */
  when?: string;

  /** Step timeout in milliseconds */
  timeout?: number;

  /** Number of retry attempts on failure */
  retry?: number;

  // ===== Parallel step fields (when type = 'parallel') =====

  /** Parallel substeps (required for parallel steps) */
  parallel?: WorkflowStep[];

  /** Error handling for parallel groups */
  error_handling?: {
    /** What to do when substeps fail */
    on_error: 'continue' | 'stop';
    /** Minimum number of successful substeps required */
    min_success?: number;
  };
}

/**
 * Workflow execution context
 */
export interface WorkflowContext {
  /** Workflow name */
  workflowName: string;

  /** Original user input */
  input: string;

  /** Results from completed steps */
  stepResults: Map<string, WorkflowStepResult>;

  /** Current step index */
  currentStepIndex: number;

  /** Execution start time */
  startTime: number;

  /** Arbitrary metadata */
  metadata: Record<string, any>;
}

/**
 * Workflow step execution result
 */
export interface WorkflowStepResult {
  /** Step ID */
  stepId: string;

  /** Agent name that executed (for sequential steps) */
  agentName?: string;

  /** Execution status */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

  /** Agent output (for sequential steps) */
  output: string;

  /** Error message if failed */
  error?: string;

  /** Start time */
  startTime: number;

  /** End time */
  endTime?: number;

  /** Extracted data for template variables */
  data?: Record<string, any>;

  /** Parallel substep results (for parallel steps) */
  parallelResults?: Map<string, WorkflowStepResult>;
}

/**
 * Workflow execution result
 */
export interface WorkflowExecutionResult {
  /** Workflow name */
  workflowName: string;

  /** Overall execution status */
  status: 'completed' | 'failed' | 'timeout';

  /** All step results */
  steps: WorkflowStepResult[];

  /** Final aggregated output */
  output: string;

  /** Error message if failed */
  error?: string;

  /** Total execution duration in milliseconds */
  duration: number;
}

/**
 * Workflow list item (for display)
 */
export interface WorkflowListItem {
  /** Workflow name */
  name: string;

  /** Workflow title */
  title: string;

  /** Scope */
  scope: 'global' | 'project';

  /** File path */
  filePath: string;

  /** Last update time */
  updatedAt: Date;

  /** Number of steps */
  stepCount: number;
}

/**
 * Workflow error
 */
export class WorkflowError extends Error {
  constructor(
    message: string,
    public code:
      | 'WORKFLOW_NOT_FOUND'
      | 'INVALID_DEFINITION'
      | 'STEP_FAILED'
      | 'TIMEOUT'
      | 'AGENT_NOT_FOUND'
      | 'TEMPLATE_ERROR'
      | 'CONDITION_ERROR'
  ) {
    super(message);
    this.name = 'WorkflowError';
  }
}

// ============================================================================
// Upstream Agent System Types (for compatibility with upstream code)
// ============================================================================

/**
 * Describes the possible termination modes for an agent.
 */
export enum AgentTerminateMode {
  ERROR = 'ERROR',
  TIMEOUT = 'TIMEOUT',
  GOAL = 'GOAL',
  MAX_TURNS = 'MAX_TURNS',
  ABORTED = 'ABORTED',
}

/**
 * Represents the output structure of an agent's execution.
 */
export interface OutputObject {
  result: string;
  terminate_reason: AgentTerminateMode;
}

/**
 * Represents the validated input parameters passed to an agent upon invocation.
 * Used primarily for templating the system prompt. (Replaces ContextState)
 */
export type AgentInputs = Record<string, unknown>;

/**
 * Structured events emitted during subagent execution for user observability.
 */
export interface SubagentActivityEvent {
  isSubagentActivityEvent: true;
  agentName: string;
  type: 'TOOL_CALL_START' | 'TOOL_CALL_END' | 'THOUGHT_CHUNK' | 'ERROR';
  data: Record<string, unknown>;
}

/**
 * Configures the initial prompt for the agent.
 */
export interface PromptConfig {
  /**
   * A single system prompt string. Supports templating using `${input_name}` syntax.
   */
  systemPrompt?: string;
  /**
   * An array of user/model content pairs for few-shot prompting.
   */
  initialMessages?: Content[];

  /**
   * The specific task or question to trigger the agent's execution loop.
   * This is sent as the first user message, distinct from the systemPrompt (identity/rules)
   * and initialMessages (history/few-shots). Supports templating.
   * If not provided, a generic "Get Started!" message is used.
   */
  query?: string;
}

/**
 * Configures the tools available to the agent during its execution.
 */
export interface ToolConfig {
  tools: Array<string | FunctionDeclaration | AnyDeclarativeTool>;
}

/**
 * Configures the expected inputs (parameters) for the agent.
 */
export interface InputConfig {
  /**
   * Defines the parameters the agent accepts.
   * This is vital for generating the tool wrapper schema.
   */
  inputs: Record<
    string,
    {
      description: string;
      type:
        | 'string'
        | 'number'
        | 'boolean'
        | 'integer'
        | 'string[]'
        | 'number[]';
      required: boolean;
    }
  >;
}

/**
 * Configures the expected outputs for the agent.
 */
export interface OutputConfig<T extends z.ZodTypeAny = z.ZodUnknown> {
  /**
   * The name of the final result parameter. This will be the name of the
   * argument in the `submit_final_output` tool (e.g., "report", "answer").
   */
  outputName: string;
  /**
   * A description of the expected output. This will be used as the description
   * for the tool argument.
   */
  description: string;
  /**
   * Optional JSON schema for the output. If provided, it will be used as the
   * schema for the tool's argument, allowing for structured output enforcement.
   * Defaults to { type: 'string' }.
   */
  schema: T;
}

/**
 * Configures the generative model parameters for the agent.
 */
export interface ModelConfig {
  model: string;
  temp: number;
  top_p: number;
  thinkingBudget?: number;
}

/**
 * Configures the execution environment and constraints for the agent.
 */
export interface RunConfig {
  /** The maximum execution time for the agent in minutes. */
  max_time_minutes: number;
  /** The maximum number of conversational turns. */
  max_turns?: number;
}

/**
 * The definition for an agent (Upstream generic version).
 * @template TOutput The specific Zod schema for the agent's final output object.
 */
export interface AgentDefinition<TOutput extends z.ZodTypeAny = z.ZodUnknown> {
  /** Unique identifier for the agent. */
  name: string;
  displayName?: string;
  description: string;
  promptConfig: PromptConfig;
  modelConfig: ModelConfig;
  runConfig: RunConfig;
  toolConfig?: ToolConfig;
  outputConfig?: OutputConfig<TOutput>;
  inputConfig: InputConfig;
  /**
   * An optional function to process the raw output from the agent's final tool
   * call into a string format.
   *
   * @param output The raw output value from the `complete_task` tool, now strongly typed with TOutput.
   * @returns A string representation of the final output.
   */
  processOutput?: (output: z.infer<TOutput>) => string;
}
