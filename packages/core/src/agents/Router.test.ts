/**
 * @license
 * Copyright 2025 Gemini CLI
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Router } from './Router.js';
import type { Config } from '../config/config.js';
import type { AgentManager } from './AgentManager.js';
import type { ModelService } from '../services/modelService.js';

describe('Router', () => {
  let mockConfig: Config;
  let mockAgentManager: AgentManager;
  let mockModelService: ModelService;
  let router: Router;

  beforeEach(() => {
    mockConfig = {
      getTargetDir: vi.fn().mockReturnValue('/test'),
      getModel: vi.fn().mockReturnValue(null),
    } as any;

    mockAgentManager = {} as any;
    mockModelService = {} as any;
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env['GEMINI_ROUTING_ENABLED'];
    delete process.env['GEMINI_ROUTING_STRATEGY'];
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      router = new Router(mockConfig, mockAgentManager, mockModelService);
      const config = router.getConfig();

      expect(config.enabled).toBe(false);
      expect(config.strategy).toBe('hybrid');
      expect(config.rule.confidence_threshold).toBe(70);
      expect(config.llm.model).toBe('gemini-2.0-flash');
      expect(config.llm.timeout).toBe(5000);
    });

    it('should initialize with runtime config', () => {
      router = new Router(mockConfig, mockAgentManager, mockModelService, {
        enabled: true,
        strategy: 'rule',
      });
      const config = router.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.strategy).toBe('rule');
    });

    it('should load config from environment variables', () => {
      process.env['GEMINI_ROUTING_ENABLED'] = 'true';
      process.env['GEMINI_ROUTING_STRATEGY'] = 'llm';
      process.env['GEMINI_ROUTING_CONFIDENCE_THRESHOLD'] = '80';

      router = new Router(mockConfig, mockAgentManager, mockModelService);
      const config = router.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.strategy).toBe('llm');
      expect(config.rule.confidence_threshold).toBe(80);
    });

    it('should prioritize runtime config over environment', () => {
      process.env['GEMINI_ROUTING_ENABLED'] = 'false';
      process.env['GEMINI_ROUTING_STRATEGY'] = 'rule';

      router = new Router(mockConfig, mockAgentManager, mockModelService, {
        enabled: true,
        strategy: 'hybrid',
      });
      const config = router.getConfig();

      expect(config.enabled).toBe(true); // Runtime wins
      expect(config.strategy).toBe('hybrid'); // Runtime wins
    });
  });

  describe('enable/disable', () => {
    beforeEach(() => {
      router = new Router(mockConfig, mockAgentManager, mockModelService);
    });

    it('should enable routing', () => {
      router.enable();
      expect(router.isEnabled()).toBe(true);
    });

    it('should disable routing', () => {
      router.enable();
      router.disable();
      expect(router.isEnabled()).toBe(false);
    });
  });

  describe('updateConfig', () => {
    beforeEach(() => {
      router = new Router(mockConfig, mockAgentManager, mockModelService);
    });

    it('should update strategy', () => {
      router.updateConfig({ strategy: 'llm' });
      expect(router.getConfig().strategy).toBe('llm');
    });

    it('should update confidence threshold', () => {
      router.updateConfig({
        rule: { confidence_threshold: 85 },
      });
      expect(router.getConfig().rule.confidence_threshold).toBe(85);
    });

    it('should update LLM model', () => {
      router.updateConfig({
        llm: { model: 'gemini-1.5-pro', timeout: 10000 },
      });
      const config = router.getConfig();
      expect(config.llm.model).toBe('gemini-1.5-pro');
      expect(config.llm.timeout).toBe(10000);
    });

    it('should update fallback strategy', () => {
      router.updateConfig({ fallback: 'none' });
      expect(router.getConfig().fallback).toBe('none');
    });
  });

  describe('route', () => {
    beforeEach(() => {
      router = new Router(mockConfig, mockAgentManager, mockModelService);
    });

    it('should return null when routing is disabled', async () => {
      router.disable();
      const result = await router.route('test input');
      expect(result).toBeNull();
    });

    // Note: Full routing tests require mocking RuleRouter, LLMRouter, HybridRouter
    // which are tested separately. This tests the Router orchestration only.
  });

  describe('environment variable parsing', () => {
    it('should parse valid strategy values', () => {
      process.env['GEMINI_ROUTING_STRATEGY'] = 'rule';
      router = new Router(mockConfig, mockAgentManager, mockModelService);
      expect(router.getConfig().strategy).toBe('rule');

      delete process.env['GEMINI_ROUTING_STRATEGY'];
      process.env['GEMINI_ROUTING_STRATEGY'] = 'llm';
      router = new Router(mockConfig, mockAgentManager, mockModelService);
      expect(router.getConfig().strategy).toBe('llm');

      delete process.env['GEMINI_ROUTING_STRATEGY'];
      process.env['GEMINI_ROUTING_STRATEGY'] = 'hybrid';
      router = new Router(mockConfig, mockAgentManager, mockModelService);
      expect(router.getConfig().strategy).toBe('hybrid');
    });

    it('should ignore invalid strategy values', () => {
      process.env['GEMINI_ROUTING_STRATEGY'] = 'invalid';
      router = new Router(mockConfig, mockAgentManager, mockModelService);
      expect(router.getConfig().strategy).toBe('hybrid'); // Falls back to default
    });

    it('should parse valid threshold values', () => {
      process.env['GEMINI_ROUTING_CONFIDENCE_THRESHOLD'] = '90';
      router = new Router(mockConfig, mockAgentManager, mockModelService);
      expect(router.getConfig().rule.confidence_threshold).toBe(90);
    });

    it('should ignore invalid threshold values', () => {
      process.env['GEMINI_ROUTING_CONFIDENCE_THRESHOLD'] = 'invalid';
      router = new Router(mockConfig, mockAgentManager, mockModelService);
      expect(router.getConfig().rule.confidence_threshold).toBe(70); // Default

      delete process.env['GEMINI_ROUTING_CONFIDENCE_THRESHOLD'];
      process.env['GEMINI_ROUTING_CONFIDENCE_THRESHOLD'] = '150'; // Out of range
      router = new Router(mockConfig, mockAgentManager, mockModelService);
      expect(router.getConfig().rule.confidence_threshold).toBe(70); // Default
    });

    it('should parse LLM model and timeout', () => {
      process.env['GEMINI_ROUTING_LLM_MODEL'] = 'custom-model';
      process.env['GEMINI_ROUTING_LLM_TIMEOUT'] = '3000';
      router = new Router(mockConfig, mockAgentManager, mockModelService);
      const config = router.getConfig();
      expect(config.llm.model).toBe('custom-model');
      expect(config.llm.timeout).toBe(3000);
    });

    it('should parse fallback values', () => {
      process.env['GEMINI_ROUTING_FALLBACK'] = 'none';
      router = new Router(mockConfig, mockAgentManager, mockModelService);
      expect(router.getConfig().fallback).toBe('none');

      delete process.env['GEMINI_ROUTING_FALLBACK'];
      process.env['GEMINI_ROUTING_FALLBACK'] = 'default_agent';
      router = new Router(mockConfig, mockAgentManager, mockModelService);
      expect(router.getConfig().fallback).toBe('default_agent');
    });
  });
});
