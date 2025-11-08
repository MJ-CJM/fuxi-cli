/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ModelConfig, ModelProvider, AuthType } from '../adapters/base/index.js';

// Legacy Gemini constants for backward compatibility
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-pro';
export const DEFAULT_GEMINI_FLASH_MODEL = 'gemini-2.5-flash';
export const DEFAULT_GEMINI_FLASH_LITE_MODEL = 'gemini-2.5-flash-lite';
export const DEFAULT_GEMINI_MODEL_AUTO = 'auto';
export const DEFAULT_GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';
export const DEFAULT_THINKING_MODE = -1;

// Multi-provider model configurations
export const DEFAULT_MODEL_CONFIGS: Record<string, ModelConfig> = {
  // Gemini models
  'gemini-2.5-pro': {
    provider: 'gemini' as ModelProvider,
    model: 'gemini-2.5-pro',
    authType: 'api-key' as AuthType,
    maxOutputTokens: 65536
  },
  'gemini-2.5-flash': {
    provider: 'gemini' as ModelProvider,
    model: 'gemini-2.5-flash',
    authType: 'api-key' as AuthType,
    maxOutputTokens: 65536
  },
  'gemini-2.5-flash-lite': {
    provider: 'gemini' as ModelProvider,
    model: 'gemini-2.5-flash-lite',
    authType: 'api-key' as AuthType,
    maxOutputTokens: 65536
  },

  // OpenAI models
  'gpt-4o': {
    provider: 'openai' as ModelProvider,
    model: 'gpt-4o',
    authType: 'api-key' as AuthType,
    baseUrl: 'https://api.openai.com/v1',
    maxOutputTokens: 16384
  },
  'gpt-4o-mini': {
    provider: 'openai' as ModelProvider,
    model: 'gpt-4o-mini',
    authType: 'api-key' as AuthType,
    baseUrl: 'https://api.openai.com/v1',
    maxOutputTokens: 16384
  },
  'gpt-4-turbo': {
    provider: 'openai' as ModelProvider,
    model: 'gpt-4-turbo',
    authType: 'api-key' as AuthType,
    baseUrl: 'https://api.openai.com/v1',
    maxOutputTokens: 4096
  },

  // Claude models
  'claude-3-5-sonnet': {
    provider: 'claude' as ModelProvider,
    model: 'claude-3-5-sonnet-20241022',
    authType: 'api-key' as AuthType,
    baseUrl: 'https://api.anthropic.com/v1',
    maxOutputTokens: 8192
  },
  'claude-3-5-haiku': {
    provider: 'claude' as ModelProvider,
    model: 'claude-3-5-haiku-20241022',
    authType: 'api-key' as AuthType,
    baseUrl: 'https://api.anthropic.com/v1',
    maxOutputTokens: 8192
  }
};

// Default model alias
export const DEFAULT_MODEL = 'gemini-2.5-flash';

/**
 * Parse a model string in format "provider:model" or just "model"
 */
export function parseModelString(modelString: string): { provider?: ModelProvider; model: string } {
  if (modelString.includes(':')) {
    const [provider, model] = modelString.split(':', 2);
    return {
      provider: provider as ModelProvider,
      model
    };
  }

  return { model: modelString };
}

/**
 * Get model configuration for a given model string
 */
export function getModelConfig(modelString: string, customConfigs?: Record<string, ModelConfig>): ModelConfig {
  const { provider, model } = parseModelString(modelString);

  // Check custom configurations first
  if (customConfigs?.[modelString]) {
    return customConfigs[modelString];
  }

  // Check predefined configurations
  if (DEFAULT_MODEL_CONFIGS[modelString]) {
    return DEFAULT_MODEL_CONFIGS[modelString];
  }

  if (DEFAULT_MODEL_CONFIGS[model]) {
    return DEFAULT_MODEL_CONFIGS[model];
  }

  // If provider is specified, create a config
  if (provider) {
    return {
      provider,
      model,
      authType: 'api-key' as AuthType
    };
  }

  // For unknown models, try to detect provider or default to custom
  // If model contains known provider patterns, use custom provider
  if (modelString.includes('qwen') || modelString.includes('coder') || modelString.includes('flash')) {
    const config = {
      provider: 'custom' as ModelProvider,
      model: modelString,
      authType: 'api-key' as AuthType
    };
    console.log(`Detected custom model configuration for ${modelString}:`, config);
    return config;
  }

  // Default to Gemini for unknown models (backward compatibility)
  const config = {
    provider: 'gemini' as ModelProvider,
    model: modelString,
    authType: 'api-key' as AuthType
  };
  console.log(`Using default Gemini configuration for ${modelString}:`, config);
  return config;
}

/**
 * Legacy function - determines the effective model to use for Gemini models
 */
export function getEffectiveModel(
  isInFallbackMode: boolean,
  requestedModel: string,
): string {
  // If we are not in fallback mode, simply use the requested model.
  if (!isInFallbackMode) {
    return requestedModel;
  }

  // If a "lite" model is requested, honor it. This allows for variations of
  // lite models without needing to list them all as constants.
  if (requestedModel.includes('lite')) {
    return requestedModel;
  }

  // Default fallback for Gemini CLI.
  return DEFAULT_GEMINI_FLASH_MODEL;
}

/**
 * Get fallback configurations for a given model
 */
export function getFallbackConfigs(modelConfig: ModelConfig): ModelConfig[] {
  // Disable automatic fallbacks—if the primary model fails, surface the error directly.
  return [];
}

/**
 * Get available providers
 */
export function getAvailableProviders(): ModelProvider[] {
  return ['gemini', 'openai', 'claude', 'custom'] as ModelProvider[];
}

/**
 * Get models for a specific provider
 */
export function getModelsForProvider(provider: ModelProvider): string[] {
  return Object.entries(DEFAULT_MODEL_CONFIGS)
    .filter(([_, config]) => config.provider === provider)
    .map(([modelName]) => modelName);
}

/**
 * Get max output tokens for a model, with provider-specific defaults
 */
export function getMaxOutputTokens(modelConfig: ModelConfig): number {
  // 1. Highest priority: capabilities.maxOutputTokens
  if (modelConfig.capabilities?.maxOutputTokens !== undefined) {
    return modelConfig.capabilities.maxOutputTokens;
  }

  // 2. Second priority: deprecated maxOutputTokens
  if (modelConfig.maxOutputTokens !== undefined) {
    return modelConfig.maxOutputTokens;
  }

  // 3. Third priority: options.maxTokens (from config.json)
  if (modelConfig.options?.['maxTokens'] !== undefined) {
    return modelConfig.options['maxTokens'];
  }

  // 4. Fourth priority: provider-specific defaults (more specific than adapter type)
  const providerDefault = getProviderDefaultMaxTokens(modelConfig.provider);
  if (providerDefault) {
    return providerDefault;
  }

  // 5. Final fallback: infer from adapter type
  const adapterType = modelConfig.adapterType || inferAdapterType(modelConfig.provider);

  const adapterDefaults: Record<string, number> = {
    'openai': 16384,
    'claude': 8192,
    'gemini': 65536,
    'custom': 4096
  };

  return adapterDefaults[adapterType] || 4096;
}

/**
 * Infer adapter type from provider
 */
function inferAdapterType(provider: ModelProvider | string): string {
  const map: Record<string, string> = {
    'gemini': 'gemini',
    'openai': 'openai',
    'claude': 'claude',
    'qwen': 'openai',        // Qwen is OpenAI-compatible
    'deepseek': 'openai',    // DeepSeek is OpenAI-compatible
    'custom': 'custom'
  };
  return map[provider] || 'custom';
}

/**
 * Get provider-specific default maxOutputTokens
 */
function getProviderDefaultMaxTokens(provider: ModelProvider | string): number {
  const providerDefaults: Record<string, number> = {
    'gemini': 65536,
    'openai': 16384,
    'claude': 8192,
    'qwen': 8192,
    'deepseek': 8192,  // DeepSeek has a limit of 8192
    'custom': 4096
  };
  return providerDefaults[provider] || 4096;
}
