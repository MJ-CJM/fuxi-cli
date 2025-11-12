/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type {
  ModelConfig,
  UnifiedRequest,
  UnifiedResponse,
  TokenCountResponse,
  EmbeddingResponse,
  StreamChunk
} from '../base/index.js';

import {
  AbstractModelClient,
  AuthenticationError,
  ServiceUnavailableError,
  createErrorFromResponse
} from '../base/index.js';

import { APITranslator } from '../utils/apiTranslator.js';

/**
 * OpenAI model adapter implementing the BaseModelClient interface
 * Supports OpenAI and all OpenAI-compatible providers (Qwen, DeepSeek, etc.)
 */
export class OpenAIAdapter extends AbstractModelClient {
  private readonly defaultBaseUrl = 'https://api.openai.com/v1';

  constructor(config: ModelConfig) {
    super(config);

    // Note: Removed COMPATIBLE_PROVIDERS validation
    // Now accepts any provider='openai' configuration with custom baseUrl and metadata
    // This allows supporting any OpenAI-compatible API without code changes
  }

  /**
   * Get the effective base URL for OpenAI API
   */
  protected override getBaseUrl(): string {
    return this.config.baseUrl || this.defaultBaseUrl;
  }

  /**
   * Get the effective API key for OpenAI-compatible providers
   * Supports metadata.envKeyNames for custom environment variable discovery
   */
  protected override getApiKey(): string {
    if (this.config.apiKey) {
      return this.config.apiKey;
    }

    // 1. Priority: Use metadata.envKeyNames if provided
    const customEnvKeys = this.config.metadata?.envKeyNames;
    if (customEnvKeys && Array.isArray(customEnvKeys) && customEnvKeys.length > 0) {
      for (const keyName of customEnvKeys) {
        const value = process.env[keyName];
        if (value) {
          return value;
        }
      }
    }

    // 2. Fallback: Use metadata.providerName or provider to lookup default env vars
    const providerName = this.config.metadata?.providerName || this.config.provider;
    const defaultEnvKeyMap: Record<string, string[]> = {
      'openai': ['OPENAI_API_KEY'],
      'qwen': ['QWEN_API_KEY', 'QWEN_CODER_API_KEY', 'DASHSCOPE_API_KEY'],
      'deepseek': ['DEEPSEEK_API_KEY'],
      'moonshot': ['MOONSHOT_API_KEY', 'KIMI_API_KEY'],
      'zhipu': ['ZHIPU_API_KEY', 'GLM_API_KEY'],
      'minimax': ['MINIMAX_API_KEY'],
    };

    const possibleKeys = defaultEnvKeyMap[providerName as string] || ['OPENAI_API_KEY'];

    for (const keyName of possibleKeys) {
      const value = process.env[keyName];
      if (value) {
        return value;
      }
    }

    // Build helpful error message
    const envKeyHints = customEnvKeys && customEnvKeys.length > 0
      ? customEnvKeys.join(', ')
      : possibleKeys.join(', ');

    throw new AuthenticationError(
      this.config.provider,
      `No API key found. Set apiKey in config or environment variable: ${envKeyHints}`
    );
  }

  /**
   * Make an HTTP request to OpenAI API
   */
  private async makeRequest(endpoint: string, body: any, options: { stream?: boolean } = {}): Promise<any> {
    const url = `${this.getBaseUrl()}${endpoint}`;
    const headers = this.getHeaders();

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = errorText;

      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorData.message || errorText;
      } catch {
        // Use raw text if JSON parsing fails
      }

      throw createErrorFromResponse(
        this.config.provider,
        response.status,
        errorMessage
      );
    }

    if (options.stream) {
      return response; // Return the response object for streaming
    }

    return response.json();
  }

  /**
   * Validate the adapter configuration
   */
  override async validate(): Promise<boolean> {
    try {
      // Simple validation: check if API key exists
      // Actual validation will happen on first request
      this.getApiKey();
      return true;
    } catch (error) {
      throw new AuthenticationError(
        this.config.provider,
        'No API key found for OpenAI. Set OPENAI_API_KEY environment variable.',
        error as Error
      );
    }
  }

  /**
   * Generate content using OpenAI
   */
  async generateContent(request: UnifiedRequest): Promise<UnifiedResponse> {
    try {
      // Check if model supports multimodal format (default true for OpenAI)
      const supportsMultimodal = this.config.capabilities?.supportsMultimodal ?? true;
      const supportsFunctionCalling = this.config.capabilities?.supportsFunctionCalling ?? true;

      if (process.env['DEBUG_MESSAGE_FORMAT']) {
        console.log('[DEBUG] OpenAIAdapter.generateContent:', {
          provider: this.config.provider,
          model: this.config.model,
          supportsMultimodal,
          supportsFunctionCalling,
          capabilities: this.config.capabilities,
          messageCount: request.messages.length,
          hasTools: !!request.tools
        });
      }

      // Filter out tools if model doesn't support function calling
      const cleanedRequest: UnifiedRequest = supportsFunctionCalling ? request : {
        ...request,
        tools: undefined,
        toolChoice: undefined
      };

      const openaiRequest = APITranslator.unifiedToOpenaiRequest(cleanedRequest, supportsMultimodal);
      openaiRequest.model = this.config.model;

      // stream_options only works with stream: true
      // For non-streaming requests, token usage is available in response.usage
      // No need to set stream_options here

      const extraParams = this.config.options?.['requestBody'];
      if (extraParams && typeof extraParams === 'object' && !Array.isArray(extraParams)) {
        Object.assign(openaiRequest, extraParams);
      }

      const debugRequests =
        Boolean(process.env['DEBUG_CUSTOM_MODEL_REQUESTS']) ||
        Boolean(process.env['DEBUG_MODEL_REQUESTS']) ||
        Boolean(process.env['DEBUG']);

      if (debugRequests) {
        try {
          console.log('[OpenAIAdapter] Sending request', {
            provider: this.config.provider,
            model: this.config.model,
            endpoint: '/chat/completions',
            body: openaiRequest,
          });
        } catch (error) {
          console.warn(
            '[OpenAIAdapter] Failed to log request payload for debugging:',
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      // Debug: Log the system message being sent
      if (process.env['DEBUG_MODEL_REQUESTS']) {
        const systemMsg = openaiRequest.messages?.find((m: any) => m.role === 'system');
        if (systemMsg) {
          console.log('[DEBUG] System message preview:', systemMsg.content?.substring(0, 200));
        }
        console.log('[DEBUG] Sending to:', this.getBaseUrl(), 'Model:', openaiRequest.model);
      }

      const response = await this.makeRequest('/chat/completions', openaiRequest);

      // Debug: Log response usage to help diagnose token count issues
      if (process.env['DEBUG_TOKEN_COUNT']) {
        console.log('[OpenAIAdapter] Response usage:', {
          hasUsage: !!response.usage,
          usage: response.usage,
          model: response.model
        });
      }

      return APITranslator.openaiResponseToUnified(response);
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error; // Re-throw adapter errors
      }

      throw new ServiceUnavailableError(
        this.config.provider,
        `OpenAI request failed: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  /**
   * Generate content with streaming
   */
  async* generateContentStream(request: UnifiedRequest): AsyncGenerator<StreamChunk> {
    try {
      // Check if model supports multimodal format (default true for OpenAI)
      const supportsMultimodal = this.config.capabilities?.supportsMultimodal ?? true;
      const supportsFunctionCalling = this.config.capabilities?.supportsFunctionCalling ?? true;

      // Filter out tools if model doesn't support function calling
      const cleanedRequest: UnifiedRequest = supportsFunctionCalling ? request : {
        ...request,
        tools: undefined,
        toolChoice: undefined
      };

      const openaiRequest = APITranslator.unifiedToOpenaiRequest(cleanedRequest, supportsMultimodal);
      openaiRequest.model = this.config.model;
      openaiRequest.stream = true;

      // IMPORTANT: Request usage information in streaming responses
      // Some OpenAI-compatible APIs (like Qwen) require this to get token counts
      if (!openaiRequest.stream_options) {
        openaiRequest.stream_options = { include_usage: true };
      }

      const extraParams = this.config.options?.['requestBody'];
      if (extraParams && typeof extraParams === 'object' && !Array.isArray(extraParams)) {
        Object.assign(openaiRequest, extraParams);
      }

      const debugRequests =
        Boolean(process.env['DEBUG_CUSTOM_MODEL_REQUESTS']) ||
        Boolean(process.env['DEBUG_MODEL_REQUESTS']) ||
        Boolean(process.env['DEBUG']);

      if (debugRequests) {
        try {
          console.log('[OpenAIAdapter] Sending stream request', {
            provider: this.config.provider,
            model: this.config.model,
            endpoint: '/chat/completions',
            body: openaiRequest,
          });
        } catch (error) {
          console.warn(
            '[OpenAIAdapter] Failed to log streaming payload for debugging:',
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      const response = await this.makeRequest('/chat/completions', openaiRequest, { stream: true });

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            yield {
              delta: {},
              done: true
            };
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep the last incomplete line in buffer

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed === '') continue;
            if (trimmed === 'data: [DONE]') {
              yield {
                delta: {},
                done: true
              };
              return;
            }

            if (trimmed.startsWith('data: ')) {
              try {
                const jsonStr = trimmed.substring(6);
                const chunk = JSON.parse(jsonStr);

                const unifiedResponse = APITranslator.openaiResponseToUnified(chunk);

                yield {
                  delta: unifiedResponse,
                  done: false
                };
              } catch (_parseError) {
                // Skip malformed chunks
                continue;
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error; // Re-throw adapter errors
      }

      throw new ServiceUnavailableError(
        this.config.provider,
        `OpenAI streaming request failed: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  /**
   * Count tokens for the request (approximate, as OpenAI doesn't provide exact token counting)
   */
  async countTokens(request: UnifiedRequest): Promise<TokenCountResponse> {
    // Universal token estimation algorithm
    // Supports mixed Chinese and English content
    const textContent = request.messages
      .flatMap(msg => msg.content)
      .filter(part => part.type === 'text')
      .map(part => part.text || '')
      .join(' ');

    // Improved estimation:
    // - Chinese characters: ~1.5 chars per token (CJK tokenizers are more efficient)
    // - English/other: ~4 chars per token (standard GPT tokenizer ratio)
    const chineseRegex = /[\u4e00-\u9fa5]/g;
    const chineseMatches = textContent.match(chineseRegex);
    const chineseChars = chineseMatches ? chineseMatches.length : 0;
    const otherChars = textContent.length - chineseChars;

    const estimatedTokens = Math.ceil(chineseChars / 1.5 + otherChars / 4);

    return {
      tokenCount: estimatedTokens
    };
  }

  /**
   * Generate embeddings using OpenAI
   */
  override async embedContent(request: { text: string }): Promise<EmbeddingResponse> {
    try {
      const embeddingRequest = {
        model: this.config.options?.['embeddingModel'] || 'text-embedding-3-small',
        input: request.text
      };

      const response = await this.makeRequest('/embeddings', embeddingRequest);

      const embeddings = response.data?.map((item: any) => item.embedding) || [];

      return {
        embeddings,
        usage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: 0,
          totalTokens: response.usage.total_tokens
        } : undefined
      };
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error; // Re-throw adapter errors
      }

      throw new ServiceUnavailableError(
        this.config.provider,
        `OpenAI embedding request failed: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  /**
   * Get available models from OpenAI
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await this.makeRequest('/models', {});

      const models = response.data?.map((model: any) => model.id) || [];

      // Filter to only chat completion models
      return models.filter((model: string) =>
        model.includes('gpt') ||
        model.includes('o1') ||
        model.includes('claude') // In case using OpenAI-compatible endpoint
      );
    } catch (_error) {
      // Return common models if API call fails
      return [
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4-turbo',
        'gpt-4',
        'gpt-3.5-turbo',
        'o1-preview',
        'o1-mini'
      ];
    }
  }
}