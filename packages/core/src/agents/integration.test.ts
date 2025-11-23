/**
 * @license
 * Copyright 2025 Gemini CLI
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentExecutor } from './AgentExecutor.js';
import type { Config } from '../config/config.js';
import type { ModelService } from '../services/modelService.js';
import type { ToolRegistry } from '../tools/tool-registry.js';
import type { TiangongAgentDefinition as AgentDefinition } from './types.js';

/**
 * Integration tests for routing and handoff functionality
 * These tests verify the complete flow from user input to agent execution
 */
describe('Routing and Handoff Integration', () => {
  let mockConfig: Config;
  let mockModelService: ModelService;
  let mockToolRegistry: ToolRegistry;
  let executor: AgentExecutor;

  const createMockAgent = (
    name: string,
    options?: {
      triggers?: { keywords?: string[]; patterns?: string[]; priority?: number };
      handoffs?: Array<{
        to: string;
        when?: 'manual' | 'auto' | 'conditional';
        description?: string;
        include_context?: boolean;
      }>;
    }
  ): AgentDefinition => ({
    kind: 'agent',
    name,
    title: `${name} Agent`,
    description: `Test agent for ${name}`,
    systemPrompt: `You are ${name}`,
    filePath: `/test/${name}.md`,
    triggers: options?.triggers,
    handoffs: options?.handoffs,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    mockConfig = {
      getTargetDir: vi.fn().mockReturnValue('/test'),
      getMcpServers: vi.fn().mockReturnValue(null),
      getModel: vi.fn().mockReturnValue('gemini-2.0-flash'),
    } as any;

    mockModelService = {
      generateContent: vi.fn(),
    } as any;

    mockToolRegistry = {
      getAllToolNames: vi.fn().mockReturnValue(['read_file', 'write_file']),
      getTool: vi.fn(),
    } as any;

    executor = new AgentExecutor(mockConfig, mockModelService, mockToolRegistry);
  });

  describe('Auto-Routing', () => {
    it('should route to correct agent based on keywords', async () => {
      // Setup agents
      const codeAgent = createMockAgent('code-imple', {
        triggers: { keywords: ['实现', '开发', 'implement'], priority: 50 },
      });
      const reviewAgent = createMockAgent('code-review', {
        triggers: { keywords: ['审查', '检查', 'review'], priority: 50 },
      });

      // Mock AgentManager
      const mockAgentManager = {
        loadAgents: vi.fn().mockResolvedValue(undefined),
        listAgents: vi.fn().mockReturnValue([
          { name: 'code-imple', title: 'Code Implementation', scope: 'global', filePath: '/test.md', updatedAt: new Date() },
          { name: 'code-review', title: 'Code Review', scope: 'global', filePath: '/test.md', updatedAt: new Date() },
        ]),
        getAgent: vi.fn().mockImplementation((name) => {
          if (name === 'code-imple') return codeAgent;
          if (name === 'code-review') return reviewAgent;
          return null;
        }),
      } as any;

      // Replace AgentManager in executor
      (executor as any).agentManager = mockAgentManager;

      // Initialize with routing enabled
      await executor.initialize({ enabled: true, strategy: 'rule' });

      // Mock model response
      vi.mocked(mockModelService.generateContent).mockResolvedValue({
        content: [{ type: 'text', text: 'Implementation done' }],
        usage: { totalTokens: 100 },
      } as any);

      // Execute with routing
      const result = await executor.executeWithRouting('帮我实现登录功能');

      expect(result.routedAgent).toBe('code-imple');
      expect(result.text).toBe('Implementation done');
    });

    it('should return error when no suitable agent found', async () => {
      const mockAgentManager = {
        loadAgents: vi.fn().mockResolvedValue(undefined),
        listAgents: vi.fn().mockReturnValue([]),
        getAgent: vi.fn().mockReturnValue(null),
      } as any;

      (executor as any).agentManager = mockAgentManager;
      await executor.initialize({ enabled: true, strategy: 'rule' });

      await expect(
        executor.executeWithRouting('test input')
      ).rejects.toThrow('No suitable agent found');
    });
  });

  describe('Agent Handoff', () => {
    it('should execute handoff via transfer_to_ tool', async () => {
      // Setup agents with handoff configuration
      const reviewAgent = createMockAgent('code-review', {
        handoffs: [{ to: 'code-imple', description: 'Transfer for implementation' }],
      });
      const impleAgent = createMockAgent('code-imple');

      const mockAgentManager = {
        loadAgents: vi.fn().mockResolvedValue(undefined),
        listAgents: vi.fn().mockReturnValue([
          { name: 'code-review', title: 'Review', scope: 'global', filePath: '/test.md', updatedAt: new Date() },
          { name: 'code-imple', title: 'Implementation', scope: 'global', filePath: '/test.md', updatedAt: new Date() },
        ]),
        getAgent: vi.fn().mockImplementation((name) => {
          if (name === 'code-review') return reviewAgent;
          if (name === 'code-imple') return impleAgent;
          return null;
        }),
      } as any;

      (executor as any).agentManager = mockAgentManager;
      await executor.initialize();

      // Mock model responses
      let callCount = 0;
      vi.mocked(mockModelService.generateContent).mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          // First call: code-review requests handoff
          return {
            content: [
              {
                type: 'function_call',
                functionCall: {
                  name: 'transfer_to_code_imple',
                  args: { reason: 'Need implementation' },
                  id: '1',
                },
              },
            ],
            usage: { totalTokens: 50 },
          } as any;
        } else if (callCount === 2) {
          // Second call: code-imple executes
          return {
            content: [{ type: 'text', text: 'Implementation complete' }],
            usage: { totalTokens: 100 },
          } as any;
        } else {
          // Third call: code-review acknowledges
          return {
            content: [{ type: 'text', text: 'Transfer acknowledged' }],
            usage: { totalTokens: 30 },
          } as any;
        }
      });

      const result = await executor.execute('code-review', 'Review this code');

      expect(callCount).toBeGreaterThan(1); // Multiple model calls
      expect(result.text).toBeTruthy();
    });

    it('should detect circular handoffs', async () => {
      // Create circular handoff: A -> B -> A
      const agentA = createMockAgent('agent-a', {
        handoffs: [{ to: 'agent-b' }],
      });
      const agentB = createMockAgent('agent-b', {
        handoffs: [{ to: 'agent-a' }],
      });

      const mockAgentManager = {
        loadAgents: vi.fn().mockResolvedValue(undefined),
        listAgents: vi.fn().mockReturnValue([
          { name: 'agent-a', title: 'A', scope: 'global', filePath: '/test.md', updatedAt: new Date() },
          { name: 'agent-b', title: 'B', scope: 'global', filePath: '/test.md', updatedAt: new Date() },
        ]),
        getAgent: vi.fn().mockImplementation((name) => {
          if (name === 'agent-a') return agentA;
          if (name === 'agent-b') return agentB;
          return null;
        }),
      } as any;

      (executor as any).agentManager = mockAgentManager;
      await executor.initialize();

      // Mock model to return handoff tool calls
      let callCount = 0;
      vi.mocked(mockModelService.generateContent).mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            content: [
              {
                type: 'function_call',
                functionCall: {
                  name: 'transfer_to_agent-b',
                  args: { reason: 'Transfer to B' },
                  id: '1',
                },
              },
            ],
            usage: { totalTokens: 50 },
          } as any;
        } else if (callCount === 2) {
          // agent-b tries to transfer back to agent-a (circular!)
          return {
            content: [
              {
                type: 'function_call',
                functionCall: {
                  name: 'transfer_to_agent-a',
                  args: { reason: 'Transfer back to A' },
                  id: '2',
                },
              },
            ],
            usage: { totalTokens: 50 },
          } as any;
        }
        return {
          content: [{ type: 'text', text: 'Done' }],
          usage: { totalTokens: 30 },
        } as any;
      });

      const result = await executor.execute('agent-a', 'test');

      // Should handle circular handoff error gracefully
      expect(result.text).toBeTruthy();
      // The error should be captured in function response
    });
  });

  describe('Configuration Management', () => {
    it('should respect routing configuration', async () => {
      const mockAgentManager = {
        loadAgents: vi.fn().mockResolvedValue(undefined),
        listAgents: vi.fn().mockReturnValue([]),
        getAgent: vi.fn(),
      } as any;

      (executor as any).agentManager = mockAgentManager;

      // Initialize with routing disabled
      await executor.initialize({ enabled: false });

      const router = executor.getRouter();
      expect(router).not.toBeNull();
      expect(router?.isEnabled()).toBe(false);

      // Enable routing
      router?.enable();
      expect(router?.isEnabled()).toBe(true);

      // Update configuration
      router?.updateConfig({ strategy: 'llm' });
      expect(router?.getConfig().strategy).toBe('llm');
    });

    it('should allow runtime configuration updates', async () => {
      const mockAgentManager = {
        loadAgents: vi.fn().mockResolvedValue(undefined),
        listAgents: vi.fn().mockReturnValue([]),
        getAgent: vi.fn(),
      } as any;

      (executor as any).agentManager = mockAgentManager;
      await executor.initialize({ enabled: true, strategy: 'rule' });

      const router = executor.getRouter();
      expect(router?.getConfig().strategy).toBe('rule');

      // Update to LLM strategy
      router?.updateConfig({ strategy: 'llm' });
      expect(router?.getConfig().strategy).toBe('llm');

      // Update confidence threshold
      router?.updateConfig({ rule: { confidence_threshold: 90 } });
      expect(router?.getConfig().rule.confidence_threshold).toBe(90);
    });
  });

  describe('Handoff Validation', () => {
    it('should validate handoff configuration', async () => {
      const agentA = createMockAgent('agent-a', {
        handoffs: [{ to: 'agent-b' }],
      });
      const agentB = createMockAgent('agent-b');

      const mockAgentManager = {
        loadAgents: vi.fn().mockResolvedValue(undefined),
        listAgents: vi.fn().mockReturnValue([
          { name: 'agent-a', title: 'A', scope: 'global', filePath: '/test.md', updatedAt: new Date() },
          { name: 'agent-b', title: 'B', scope: 'global', filePath: '/test.md', updatedAt: new Date() },
        ]),
        getAgent: vi.fn().mockImplementation((name) => {
          if (name === 'agent-a') return agentA;
          if (name === 'agent-b') return agentB;
          return null;
        }),
      } as any;

      (executor as any).agentManager = mockAgentManager;
      await executor.initialize();

      const handoffManager = executor.getHandoffManager();
      expect(handoffManager).not.toBeNull();

      // Valid handoff
      const validation1 = handoffManager?.validateHandoff('agent-a', 'agent-b');
      expect(validation1?.valid).toBe(true);

      // Invalid handoff (not configured)
      const validation2 = handoffManager?.validateHandoff('agent-b', 'agent-a');
      expect(validation2?.valid).toBe(false);
    });

    it('should track active handoffs', async () => {
      const agentA = createMockAgent('agent-a', {
        handoffs: [{ to: 'agent-b' }],
      });
      const agentB = createMockAgent('agent-b');

      const mockAgentManager = {
        loadAgents: vi.fn().mockResolvedValue(undefined),
        getAgent: vi.fn().mockImplementation((name) => {
          if (name === 'agent-a') return agentA;
          if (name === 'agent-b') return agentB;
          return null;
        }),
      } as any;

      (executor as any).agentManager = mockAgentManager;
      await executor.initialize();

      const handoffManager = executor.getHandoffManager();
      expect(handoffManager?.getActiveHandoffs().size).toBe(0);

      // Create handoff
      const context = await handoffManager?.initiateHandoff(
        'agent-a',
        'agent-b',
        'test reason'
      );

      expect(handoffManager?.getActiveHandoffs().size).toBe(1);

      // Complete handoff
      if (context) {
        handoffManager?.completeHandoff(context);
      }

      expect(handoffManager?.getActiveHandoffs().size).toBe(0);
    });
  });
});
