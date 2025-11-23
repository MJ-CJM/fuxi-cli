/**
 * @license
 * Copyright 2025 Gemini CLI
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect } from 'vitest';
import { AgentParser } from './AgentParser.js';
import type { TiangongAgentDefinition } from './types.js';

describe('AgentParser', () => {
  const parser = new AgentParser();

  describe('serialize', () => {
    it('should serialize agent definition to markdown with front-matter', () => {
      const definition: TiangongAgentDefinition = {
        kind: 'agent',
        name: 'test-agent',
        title: 'Test Agent',
        description: 'A test agent',
        model: 'gemini-2.0-flash',
        color: '#FF0000',
        scope: 'project',
        version: '1.0.0',
        tools: {
          allow: ['read_file', 'grep'],
          deny: ['write_file'],
        },
        mcp: {
          servers: ['github'],
        },
        systemPrompt: 'You are a test agent.',
        filePath: '/test/path.md',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-02'),
      };

      const result = parser.serialize(definition);

      expect(result).toContain('kind: agent');
      expect(result).toContain('name: test-agent');
      expect(result).toContain('title: Test Agent');
      expect(result).toContain('description: A test agent');
      expect(result).toContain('model: gemini-2.0-flash');
      expect(result).toContain('color: \'#FF0000\'');
      expect(result).toContain('scope: project');
      expect(result).toContain('version: 1.0.0');
      expect(result).toContain('You are a test agent.');
    });

    it('should handle minimal agent definition', () => {
      const definition: TiangongAgentDefinition = {
        kind: 'agent',
        name: 'minimal',
        title: 'Minimal Agent',
        description: 'A minimal test agent for testing purposes',
        systemPrompt: 'Minimal prompt',
        filePath: '/test/minimal.md',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = parser.serialize(definition);

      expect(result).toContain('kind: agent');
      expect(result).toContain('name: minimal');
      expect(result).toContain('title: Minimal Agent');
      expect(result).toContain('description:'); // Description is now required
      expect(result).toContain('Minimal prompt');
      expect(result).not.toContain('tools:');
    });
  });

  describe('extractNameFromPath', () => {
    it('should extract name from file path', () => {
      expect(AgentParser.extractNameFromPath('/path/to/my-agent.md')).toBe('my-agent');
      expect(AgentParser.extractNameFromPath('simple.md')).toBe('simple');
      expect(AgentParser.extractNameFromPath('/deep/path/debug-analyzer.md')).toBe('debug-analyzer');
    });
  });

  describe('validateNameMatch', () => {
    it('should not throw for matching names', () => {
      const definition: TiangongAgentDefinition = {
        kind: 'agent',
        name: 'test-agent',
        title: 'Test',
        description: 'Test agent for name validation',
        systemPrompt: 'test',
        filePath: '/path/test-agent.md',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => {
        AgentParser.validateNameMatch('/path/test-agent.md', definition);
      }).not.toThrow();
    });

    it('should throw for mismatched names', () => {
      const definition: TiangongAgentDefinition = {
        kind: 'agent',
        name: 'different-name',
        title: 'Test',
        description: 'Test agent with mismatched name',
        systemPrompt: 'test',
        filePath: '/path/test-agent.md',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => {
        AgentParser.validateNameMatch('/path/test-agent.md', definition);
      }).toThrow(/name mismatch/i);
    });
  });
});
