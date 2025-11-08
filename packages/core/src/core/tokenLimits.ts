/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

type Model = string;
type TokenCount = number;

// Conservative default for unknown models (most models support at least 32K)
export const DEFAULT_TOKEN_LIMIT = 32_000;

export function tokenLimit(model: Model): TokenCount {
  // Gemini models - from https://ai.google.dev/gemini-api/docs/models
  if (model.startsWith('gemini-1.5-pro')) {
    return 2_097_152;
  }
  if (model.startsWith('gemini-1.5-flash') ||
      model.startsWith('gemini-2.5') ||
      model.startsWith('gemini-2.0-flash')) {
    return 1_048_576;
  }
  if (model.includes('image-generation')) {
    return 32_000;
  }

  // Common Chinese models
  if (model.startsWith('glm-4-plus') || model.startsWith('glm-4-0520')) {
    return 128_000; // GLM-4-Plus supports 128K context
  }
  if (model.startsWith('glm-4') || model.startsWith('glm-3')) {
    return 32_000; // GLM-4 base models
  }

  if (model.startsWith('qwen-max') || model.startsWith('qwen-plus')) {
    return 32_000; // Qwen Max/Plus
  }
  if (model.startsWith('qwen-turbo')) {
    return 8_000; // Qwen Turbo
  }
  if (model.startsWith('qwen')) {
    return 32_000; // Other Qwen models default
  }

  if (model.startsWith('deepseek-chat') || model.startsWith('deepseek-coder')) {
    return 64_000; // DeepSeek supports 64K
  }

  if (model.startsWith('moonshot')) {
    return 128_000; // Moonshot/Kimi supports 128K
  }

  // OpenAI models
  if (model.startsWith('gpt-4') || model.startsWith('gpt-3.5')) {
    return 128_000; // GPT-4 Turbo and later support 128K
  }

  // Claude models
  if (model.startsWith('claude')) {
    return 200_000; // Claude 3 supports 200K
  }

  // Default for unknown models
  return DEFAULT_TOKEN_LIMIT;
}
