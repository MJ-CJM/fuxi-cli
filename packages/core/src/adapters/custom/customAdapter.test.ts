/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { CustomAdapter } from './customAdapter.js';
import { MessageRole } from '../base/index.js';
import { ModelAuthType } from '../base/types.js';
import type { ModelConfig, UnifiedRequest } from '../base/types.js';

describe('CustomAdapter', () => {
  describe('convertRequest', () => {
    it('should merge options.requestBody without overriding existing fields', () => {
      const config: ModelConfig = {
        provider: 'custom',
        model: 'glm-4.6',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        authType: ModelAuthType.API_KEY,
        apiKey: 'test-key',
        capabilities: {
          supportsFunctionCalling: true,
          supportsMultimodal: true,
          maxOutputTokens: 65536,
        },
        options: {
          completionEndpoint: '/chat/completions',
          requestBody: {
            thinking: {
              type: 'enabled',
            },
            max_tokens: 42,
          },
        },
      };

      const adapter = new CustomAdapter(config);

      const request: UnifiedRequest = {
        model: 'glm-4.6',
        messages: [
          {
            role: MessageRole.USER,
            content: [{ type: 'text', text: 'hello' }],
          },
        ],
        maxTokens: 512,
      };

      const converted = (adapter as any).convertRequest(request);

      expect(converted).toMatchObject({
        model: 'glm-4.6',
        max_tokens: 512,
        thinking: {
          type: 'enabled',
        },
      });

      // The extra max_tokens from requestBody should not override the request value.
      expect(converted.max_tokens).toBe(512);
    });
  });
});

