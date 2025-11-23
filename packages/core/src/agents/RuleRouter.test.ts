/**
 * @license
 * Copyright 2025 Gemini CLI
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RuleRouter } from './RuleRouter.js';
import type { AgentManager } from './AgentManager.js';
import type { TiangongAgentDefinition as AgentDefinition } from './types.js';

describe('RuleRouter', () => {
  let mockAgentManager: AgentManager;
  let router: RuleRouter;

  const createAgent = (
    name: string,
    triggers?: { keywords?: string[]; patterns?: string[]; priority?: number }
  ): AgentDefinition => ({
    kind: 'agent',
    name,
    title: `${name} Agent`,
    description: `Test agent for ${name}`,
    systemPrompt: 'test',
    filePath: `/test/${name}.md`,
    triggers,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    mockAgentManager = {
      listAgents: vi.fn(),
      getAgent: vi.fn(),
    } as any;

    router = new RuleRouter(mockAgentManager);
  });

  describe('route', () => {
    it('should return null when no agents available', async () => {
      vi.mocked(mockAgentManager.listAgents).mockReturnValue([]);
      const result = await router.route('test input');
      expect(result).toBeNull();
    });

    it('should return null when no agent has triggers', async () => {
      const agent = createAgent('test');
      vi.mocked(mockAgentManager.listAgents).mockReturnValue([
        { name: 'test', title: 'Test', scope: 'global', filePath: '/test.md', updatedAt: new Date() },
      ]);
      vi.mocked(mockAgentManager.getAgent).mockReturnValue(agent);

      const result = await router.route('test input');
      expect(result).toBeNull();
    });

    it('should match keyword and return routing score', async () => {
      const agent = createAgent('code-imple', {
        keywords: ['实现', '开发', 'implement'],
        priority: 50,
      });

      vi.mocked(mockAgentManager.listAgents).mockReturnValue([
        { name: 'code-imple', title: 'Code Implementation', scope: 'global', filePath: '/test.md', updatedAt: new Date() },
      ]);
      vi.mocked(mockAgentManager.getAgent).mockReturnValue(agent);

      const result = await router.route('帮我实现登录功能');
      expect(result).not.toBeNull();
      expect(result?.agent.name).toBe('code-imple');
      expect(result?.matchedKeywords).toContain('实现');
      expect(result?.score).toBeGreaterThan(0);
    });

    it('should match regex pattern', async () => {
      const agent = createAgent('bug-fix', {
        patterns: ['bug|错误|issue', 'fix|修复|repair'],
        priority: 60,
      });

      vi.mocked(mockAgentManager.listAgents).mockReturnValue([
        { name: 'bug-fix', title: 'Bug Fixer', scope: 'global', filePath: '/test.md', updatedAt: new Date() },
      ]);
      vi.mocked(mockAgentManager.getAgent).mockReturnValue(agent);

      const result = await router.route('修复登录页面的bug');
      expect(result).not.toBeNull();
      expect(result?.agent.name).toBe('bug-fix');
      expect(result?.matchedPatterns.length).toBeGreaterThan(0);
    });

    it('should apply priority weighting', async () => {
      const lowPriorityAgent = createAgent('low', {
        keywords: ['test'],
        priority: 30,
      });
      const highPriorityAgent = createAgent('high', {
        keywords: ['test'],
        priority: 90,
      });

      vi.mocked(mockAgentManager.listAgents).mockReturnValue([
        { name: 'low', title: 'Low', scope: 'global', filePath: '/test.md', updatedAt: new Date() },
        { name: 'high', title: 'High', scope: 'global', filePath: '/test.md', updatedAt: new Date() },
      ]);

      vi.mocked(mockAgentManager.getAgent).mockImplementation((name) => {
        if (name === 'low') return lowPriorityAgent;
        if (name === 'high') return highPriorityAgent;
        return null;
      });

      const result = await router.route('test input');
      expect(result).not.toBeNull();
      expect(result?.agent.name).toBe('high');
    });

    it('should handle multiple matches and return highest score', async () => {
      const agent1 = createAgent('agent1', {
        keywords: ['code'],
        priority: 50,
      });
      const agent2 = createAgent('agent2', {
        keywords: ['code', 'review'],
        priority: 50,
      });

      vi.mocked(mockAgentManager.listAgents).mockReturnValue([
        { name: 'agent1', title: 'Agent 1', scope: 'global', filePath: '/test.md', updatedAt: new Date() },
        { name: 'agent2', title: 'Agent 2', scope: 'global', filePath: '/test.md', updatedAt: new Date() },
      ]);

      vi.mocked(mockAgentManager.getAgent).mockImplementation((name) => {
        if (name === 'agent1') return agent1;
        if (name === 'agent2') return agent2;
        return null;
      });

      const result = await router.route('code review needed');
      expect(result).not.toBeNull();
      expect(result?.agent.name).toBe('agent2'); // Has more keywords matched
    });

    it('should handle invalid regex patterns gracefully', async () => {
      const agent = createAgent('test', {
        patterns: ['[invalid(regex'],
        priority: 50,
      });

      vi.mocked(mockAgentManager.listAgents).mockReturnValue([
        { name: 'test', title: 'Test', scope: 'global', filePath: '/test.md', updatedAt: new Date() },
      ]);
      vi.mocked(mockAgentManager.getAgent).mockReturnValue(agent);

      const result = await router.route('test input');
      expect(result).toBeNull(); // Should not crash, just skip invalid pattern
    });

    it('should be case-insensitive for keywords', async () => {
      const agent = createAgent('test', {
        keywords: ['Test', 'CODE'],
        priority: 50,
      });

      vi.mocked(mockAgentManager.listAgents).mockReturnValue([
        { name: 'test', title: 'Test', scope: 'global', filePath: '/test.md', updatedAt: new Date() },
      ]);
      vi.mocked(mockAgentManager.getAgent).mockReturnValue(agent);

      const result = await router.route('test code implementation');
      expect(result).not.toBeNull();
      expect(result?.matchedKeywords.length).toBe(2);
    });

    it('should calculate confidence based on matches', async () => {
      const agent = createAgent('test', {
        keywords: ['test'],
        patterns: ['pattern'],
        priority: 50,
      });

      vi.mocked(mockAgentManager.listAgents).mockReturnValue([
        { name: 'test', title: 'Test', scope: 'global', filePath: '/test.md', updatedAt: new Date() },
      ]);
      vi.mocked(mockAgentManager.getAgent).mockReturnValue(agent);

      const result = await router.route('test pattern');
      expect(result).not.toBeNull();
      expect(result?.confidence).toBeGreaterThan(0);
      expect(result?.confidence).toBeLessThanOrEqual(100);
    });
  });
});
