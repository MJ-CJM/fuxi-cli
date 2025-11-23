/**
 * @license
 * Copyright 2025 Gemini CLI
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HandoffManager } from './HandoffManager.js';
import { HandoffError } from './types.js';
import type { AgentManager } from './AgentManager.js';
import type { TiangongAgentDefinition as AgentDefinition } from './types.js';
import { MessageRole } from '../adapters/base/types.js';

describe('HandoffManager', () => {
  let mockAgentManager: AgentManager;
  let handoffManager: HandoffManager;

  const createAgent = (
    name: string,
    handoffs?: Array<{
      to: string;
      when?: 'manual' | 'auto' | 'conditional';
      description?: string;
      include_context?: boolean;
    }>
  ): AgentDefinition => ({
    kind: 'agent',
    name,
    title: `${name} Agent`,
    description: `Test agent for ${name}`,
    systemPrompt: 'test',
    filePath: `/test/${name}.md`,
    handoffs,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    mockAgentManager = {
      getAgent: vi.fn(),
    } as any;

    handoffManager = new HandoffManager(mockAgentManager);
  });

  describe('initiateHandoff', () => {
    it('should create handoff context successfully', async () => {
      const sourceAgent = createAgent('source', [
        { to: 'target', description: 'Test handoff' },
      ]);
      const targetAgent = createAgent('target');

      vi.mocked(mockAgentManager.getAgent).mockImplementation((name) => {
        if (name === 'source') return sourceAgent;
        if (name === 'target') return targetAgent;
        return null;
      });

      const context = await handoffManager.initiateHandoff(
        'source',
        'target',
        'Test reason'
      );

      expect(context.from_agent).toBe('source');
      expect(context.to_agent).toBe('target');
      expect(context.reason).toBe('Test reason');
      expect(context.metadata.handoff_chain).toEqual(['source']);
      expect(context.metadata.chain_depth).toBe(1);
    });

    it('should throw error when source agent not found', async () => {
      vi.mocked(mockAgentManager.getAgent).mockReturnValue(null);

      await expect(
        handoffManager.initiateHandoff('nonexistent', 'target', 'reason')
      ).rejects.toThrow(HandoffError);
    });

    it('should throw error when target agent not found', async () => {
      const sourceAgent = createAgent('source', [{ to: 'target' }]);
      vi.mocked(mockAgentManager.getAgent).mockImplementation((name) => {
        if (name === 'source') return sourceAgent;
        return null;
      });

      await expect(
        handoffManager.initiateHandoff('source', 'nonexistent', 'reason')
      ).rejects.toThrow(HandoffError);
    });

    it('should throw error when handoff not configured', async () => {
      const sourceAgent = createAgent('source'); // No handoffs
      const targetAgent = createAgent('target');

      vi.mocked(mockAgentManager.getAgent).mockImplementation((name) => {
        if (name === 'source') return sourceAgent;
        if (name === 'target') return targetAgent;
        return null;
      });

      await expect(
        handoffManager.initiateHandoff('source', 'target', 'reason')
      ).rejects.toThrow(HandoffError);
    });

    it('should detect circular handoffs', async () => {
      const sourceAgent = createAgent('source', [{ to: 'target' }]);
      const targetAgent = createAgent('target');

      vi.mocked(mockAgentManager.getAgent).mockImplementation((name) => {
        if (name === 'source') return sourceAgent;
        if (name === 'target') return targetAgent;
        return null;
      });

      await expect(
        handoffManager.initiateHandoff(
          'source',
          'source', // Circular: source -> source
          'reason',
          undefined,
          undefined,
          ['source']
        )
      ).rejects.toThrow(HandoffError);
    });

    it('should enforce maximum handoff depth', async () => {
      const agent1 = createAgent('agent1', [{ to: 'agent2' }]);
      const agent2 = createAgent('agent2');

      vi.mocked(mockAgentManager.getAgent).mockImplementation((name) => {
        if (name === 'agent1') return agent1;
        if (name === 'agent2') return agent2;
        return null;
      });

      const longChain = ['a', 'b', 'c', 'd', 'agent1']; // Length 5

      await expect(
        handoffManager.initiateHandoff(
          'agent1',
          'agent2',
          'reason',
          undefined,
          undefined,
          longChain
        )
      ).rejects.toThrow(HandoffError);
    });

    it('should include conversation history when specified', async () => {
      const sourceAgent = createAgent('source', [
        { to: 'target', include_context: true },
      ]);
      const targetAgent = createAgent('target');

      vi.mocked(mockAgentManager.getAgent).mockImplementation((name) => {
        if (name === 'source') return sourceAgent;
        if (name === 'target') return targetAgent;
        return null;
      });

      const history = [
        {
          role: MessageRole.USER,
          content: [{ type: 'text' as const, text: 'Hello' }],
        },
      ];

      const context = await handoffManager.initiateHandoff(
        'source',
        'target',
        'reason',
        undefined,
        history
      );

      expect(context.conversation_history).toBeDefined();
      expect(context.conversation_history).toHaveLength(1);
    });

    it('should exclude conversation history when include_context is false', async () => {
      const sourceAgent = createAgent('source', [
        { to: 'target', include_context: false },
      ]);
      const targetAgent = createAgent('target');

      vi.mocked(mockAgentManager.getAgent).mockImplementation((name) => {
        if (name === 'source') return sourceAgent;
        if (name === 'target') return targetAgent;
        return null;
      });

      const history = [
        {
          role: MessageRole.USER,
          content: [{ type: 'text' as const, text: 'Hello' }],
        },
      ];

      const context = await handoffManager.initiateHandoff(
        'source',
        'target',
        'reason',
        undefined,
        history
      );

      expect(context.conversation_history).toBeUndefined();
    });
  });

  describe('completeHandoff', () => {
    it('should remove handoff from active tracking', async () => {
      const sourceAgent = createAgent('source', [{ to: 'target' }]);
      const targetAgent = createAgent('target');

      vi.mocked(mockAgentManager.getAgent).mockImplementation((name) => {
        if (name === 'source') return sourceAgent;
        if (name === 'target') return targetAgent;
        return null;
      });

      const context = await handoffManager.initiateHandoff(
        'source',
        'target',
        'reason'
      );

      expect(handoffManager.getActiveHandoffs().size).toBe(1);

      handoffManager.completeHandoff(context);

      expect(handoffManager.getActiveHandoffs().size).toBe(0);
    });
  });

  describe('isHandoffConfigured', () => {
    it('should return true when handoff is configured', () => {
      const sourceAgent = createAgent('source', [{ to: 'target' }]);
      vi.mocked(mockAgentManager.getAgent).mockReturnValue(sourceAgent);

      const result = handoffManager.isHandoffConfigured('source', 'target');
      expect(result).toBe(true);
    });

    it('should return false when handoff is not configured', () => {
      const sourceAgent = createAgent('source');
      vi.mocked(mockAgentManager.getAgent).mockReturnValue(sourceAgent);

      const result = handoffManager.isHandoffConfigured('source', 'target');
      expect(result).toBe(false);
    });

    it('should return false when agent not found', () => {
      vi.mocked(mockAgentManager.getAgent).mockReturnValue(null);

      const result = handoffManager.isHandoffConfigured('nonexistent', 'target');
      expect(result).toBe(false);
    });
  });

  describe('getConfiguredHandoffs', () => {
    it('should return all configured handoffs', () => {
      const agent = createAgent('source', [
        { to: 'target1', description: 'Handoff 1' },
        { to: 'target2', when: 'auto' },
      ]);
      vi.mocked(mockAgentManager.getAgent).mockReturnValue(agent);

      const handoffs = handoffManager.getConfiguredHandoffs('source');

      expect(handoffs).toHaveLength(2);
      expect(handoffs[0].to).toBe('target1');
      expect(handoffs[1].to).toBe('target2');
      expect(handoffs[1].when).toBe('auto');
    });

    it('should return empty array when no handoffs configured', () => {
      const agent = createAgent('source');
      vi.mocked(mockAgentManager.getAgent).mockReturnValue(agent);

      const handoffs = handoffManager.getConfiguredHandoffs('source');
      expect(handoffs).toHaveLength(0);
    });

    it('should return empty array when agent not found', () => {
      vi.mocked(mockAgentManager.getAgent).mockReturnValue(null);

      const handoffs = handoffManager.getConfiguredHandoffs('nonexistent');
      expect(handoffs).toHaveLength(0);
    });
  });

  describe('validateHandoff', () => {
    it('should return valid for correct handoff', () => {
      const sourceAgent = createAgent('source', [{ to: 'target' }]);
      const targetAgent = createAgent('target');

      vi.mocked(mockAgentManager.getAgent).mockImplementation((name) => {
        if (name === 'source') return sourceAgent;
        if (name === 'target') return targetAgent;
        return null;
      });

      const result = handoffManager.validateHandoff('source', 'target');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid when source agent not found', () => {
      vi.mocked(mockAgentManager.getAgent).mockReturnValue(null);

      const result = handoffManager.validateHandoff('nonexistent', 'target');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should return invalid when circular handoff detected', () => {
      const sourceAgent = createAgent('source', [{ to: 'target' }]);
      const targetAgent = createAgent('target');

      vi.mocked(mockAgentManager.getAgent).mockImplementation((name) => {
        if (name === 'source') return sourceAgent;
        if (name === 'target') return targetAgent;
        return null;
      });

      const result = handoffManager.validateHandoff('source', 'target', ['source', 'target']);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Circular');
    });

    it('should return invalid when max depth exceeded', () => {
      const sourceAgent = createAgent('source', [{ to: 'target' }]);
      const targetAgent = createAgent('target');

      vi.mocked(mockAgentManager.getAgent).mockImplementation((name) => {
        if (name === 'source') return sourceAgent;
        if (name === 'target') return targetAgent;
        return null;
      });

      const longChain = ['a', 'b', 'c', 'd', 'e'];

      const result = handoffManager.validateHandoff('source', 'target', longChain);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('depth');
    });
  });
});
