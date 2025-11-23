/**
 * @license
 * Copyright 2025 Gemini CLI
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect } from 'vitest';
import { ToolFilter } from './ToolFilter.js';
import type { TiangongAgentDefinition as AgentDefinition } from './types.js';

describe('ToolFilter', () => {
  const filter = new ToolFilter();
  const allTools = ['read_file', 'write_file', 'grep', 'bash', 'delete_file'];

  const createAgent = (tools?: { allow?: string[]; deny?: string[] }): AgentDefinition => ({
    kind: 'agent',
    name: 'test',
    title: 'Test',
    description: 'Test agent for tool filtering',
    systemPrompt: 'test',
    filePath: '/test.md',
    tools,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  describe('filterTools', () => {
    it('should allow all tools when no restrictions', () => {
      const agent = createAgent();
      const result = filter.filterTools(allTools, agent);
      expect(result).toEqual(allTools);
    });

    it('should allow only whitelisted tools', () => {
      const agent = createAgent({
        allow: ['read_file', 'grep'],
      });
      const result = filter.filterTools(allTools, agent);
      expect(result).toEqual(['read_file', 'grep']);
    });

    it('should deny blacklisted tools', () => {
      const agent = createAgent({
        deny: ['write_file', 'delete_file'],
      });
      const result = filter.filterTools(allTools, agent);
      expect(result).toEqual(['read_file', 'grep', 'bash']);
    });

    it('should apply deny over allow (deny wins)', () => {
      const agent = createAgent({
        allow: ['read_file', 'write_file', 'grep'],
        deny: ['write_file'],
      });
      const result = filter.filterTools(allTools, agent);
      expect(result).toEqual(['read_file', 'grep']);
    });
  });

  describe('isToolAllowed', () => {
    it('should allow tool when no restrictions', () => {
      const agent = createAgent();
      expect(filter.isToolAllowed('read_file', agent)).toBe(true);
    });

    it('should allow whitelisted tool', () => {
      const agent = createAgent({
        allow: ['read_file'],
      });
      expect(filter.isToolAllowed('read_file', agent)).toBe(true);
      expect(filter.isToolAllowed('write_file', agent)).toBe(false);
    });

    it('should deny blacklisted tool', () => {
      const agent = createAgent({
        deny: ['write_file'],
      });
      expect(filter.isToolAllowed('write_file', agent)).toBe(false);
      expect(filter.isToolAllowed('read_file', agent)).toBe(true);
    });

    it('should deny when in both allow and deny (deny wins)', () => {
      const agent = createAgent({
        allow: ['write_file'],
        deny: ['write_file'],
      });
      expect(filter.isToolAllowed('write_file', agent)).toBe(false);
    });
  });

  describe('getDeniedTools', () => {
    it('should return empty when all allowed', () => {
      const agent = createAgent();
      const result = filter.getDeniedTools(allTools, agent);
      expect(result).toEqual([]);
    });

    it('should return tools not in allow list', () => {
      const agent = createAgent({
        allow: ['read_file'],
      });
      const result = filter.getDeniedTools(allTools, agent);
      expect(result).toEqual(['write_file', 'grep', 'bash', 'delete_file']);
    });

    it('should return tools in deny list', () => {
      const agent = createAgent({
        deny: ['write_file', 'delete_file'],
      });
      const result = filter.getDeniedTools(allTools, agent);
      expect(result).toEqual(['write_file', 'delete_file']);
    });
  });

  describe('validateToolConfig', () => {
    it('should pass validation for valid config', () => {
      const agent = createAgent({
        allow: ['read_file', 'grep'],
      });
      const result = filter.validateToolConfig(agent, allTools);
      expect(result.valid).toBe(true);
      expect(result.warnings).toEqual([]);
    });

    it('should warn about unknown tools in allow', () => {
      const agent = createAgent({
        allow: ['read_file', 'unknown_tool'],
      });
      const result = filter.validateToolConfig(agent, allTools);
      expect(result.valid).toBe(false);
      expect(result.unknownAllowed).toEqual(['unknown_tool']);
      expect(result.warnings.some(w => w.includes('unknown_tool'))).toBe(true);
    });

    it('should warn about conflicts (tool in both allow and deny)', () => {
      const agent = createAgent({
        allow: ['read_file'],
        deny: ['read_file'],
      });
      const result = filter.validateToolConfig(agent, allTools);
      expect(result.warnings.some(w => w.includes('both allow and deny'))).toBe(true);
    });

    it('should warn when no tools available', () => {
      const agent = createAgent({
        allow: ['unknown_tool'],
      });
      const result = filter.validateToolConfig(agent, allTools);
      expect(result.warnings.some(w => w.includes('no available tools'))).toBe(true);
    });
  });

  describe('getToolSummary', () => {
    it('should describe all tools allowed', () => {
      const agent = createAgent();
      const summary = filter.getToolSummary(agent, allTools);
      expect(summary).toContain('All tools allowed');
      expect(summary).toContain('5 total');
    });

    it('should describe whitelist', () => {
      const agent = createAgent({
        allow: ['read_file', 'grep'],
      });
      const summary = filter.getToolSummary(agent, allTools);
      expect(summary).toContain('Only:');
      expect(summary).toContain('read_file');
      expect(summary).toContain('grep');
    });

    it('should describe blacklist', () => {
      const agent = createAgent({
        deny: ['write_file'],
      });
      const summary = filter.getToolSummary(agent, allTools);
      expect(summary).toContain('except:');
      expect(summary).toContain('write_file');
    });
  });
});
