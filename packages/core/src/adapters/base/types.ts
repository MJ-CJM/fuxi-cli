/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Supported model providers
 */
export enum ModelProvider {
  GEMINI = 'gemini',
  OPENAI = 'openai',
  CLAUDE = 'claude',
  QWEN = 'qwen',
  CUSTOM = 'custom'
}

/**
 * Authentication types for model adapters
 * Note: Different from the core AuthType used for Gemini ContentGenerator
 */
export enum ModelAuthType {
  API_KEY = 'api-key',
  OAUTH = 'oauth',
  VERTEX_AI = 'vertex-ai',
  CUSTOM_AUTH = 'custom-auth'
}

// Keep AuthType as an alias for backwards compatibility
export { ModelAuthType as AuthType };

/**
 * Model capabilities description
 */
export interface ModelCapabilities {
  /** Maximum input tokens */
  maxInputTokens?: number;
  /** Maximum output tokens */
  maxOutputTokens?: number;
  /** Supports streaming responses */
  supportsStreaming?: boolean;
  /** Supports function calling */
  supportsFunctionCalling?: boolean;
  /** Supports vision/image inputs */
  supportsVision?: boolean;
  /** Supports tool calling */
  supportsTools?: boolean;
  /** Supports multimodal content (array format for messages) */
  supportsMultimodal?: boolean;
}

/**
 * Provider metadata for identity and environment variables
 */
export interface ProviderMetadata {
  /** Provider name for identity (e.g., 'qwen', 'deepseek', 'openai') */
  providerName?: string;
  /** Display name for the provider (e.g., '通义千问', 'DeepSeek') */
  displayName?: string;
  /** Environment variable names to search for API key */
  envKeyNames?: string[];
  /** Additional custom metadata */
  [key: string]: any;
}

/**
 * Configuration for a specific model provider
 */
export interface ModelConfig {
  /** The provider type */
  provider: ModelProvider | string;
  /** The specific model name */
  model: string;
  /** API key for authentication */
  apiKey?: string;
  /** Base URL for API endpoints */
  baseUrl?: string;
  /** Authentication type */
  authType?: ModelAuthType;
  /** Custom headers for requests */
  customHeaders?: Record<string, string>;

  /** Adapter type to use (overrides provider-based inference) */
  adapterType?: 'openai' | 'claude' | 'gemini' | 'custom';

  /** Model capabilities and limits */
  capabilities?: ModelCapabilities;

  /** Provider metadata for identity and configuration */
  metadata?: ProviderMetadata;

  /** @deprecated Use capabilities.maxOutputTokens instead */
  maxOutputTokens?: number;

  /** Additional provider-specific options */
  options?: Record<string, any>;
}

/**
 * Role types for conversation messages
 */
export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
  FUNCTION = 'function'
}

/**
 * Unified message content part
 */
export interface ContentPart {
  type: 'text' | 'image' | 'function_call' | 'function_response';
  text?: string;
  image?: {
    data: string;
    mimeType: string;
  };
  functionCall?: {
    name: string;
    args: Record<string, any>;
    id?: string;
  };
  functionResponse?: {
    name: string;
    content?: any;
    response?: any;
    id?: string;
  };
}

/**
 * Unified message format
 */
export interface UnifiedMessage {
  role: MessageRole;
  content: ContentPart[];
  metadata?: Record<string, any>; // Optional metadata for message annotations
}

/**
 * Function/tool definition
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * Unified request format
 */
export interface UnifiedRequest {
  messages: UnifiedMessage[];
  tools?: ToolDefinition[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  systemMessage?: string;
  toolChoice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };
}

/**
 * Usage statistics
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Unified response format
 */
export interface UnifiedResponse {
  content: ContentPart[];
  finishReason?: 'stop' | 'length' | 'function_call' | 'content_filter';
  usage?: TokenUsage;
  model?: string;
  metadata?: Record<string, any>;
}

/**
 * Token count response
 */
export interface TokenCountResponse {
  tokenCount: number;
}

/**
 * Embedding response
 */
export interface EmbeddingResponse {
  embeddings: number[][];
  usage?: TokenUsage;
}

/**
 * Streaming response chunk
 */
export interface StreamChunk {
  delta: Partial<UnifiedResponse>;
  done: boolean;
}
