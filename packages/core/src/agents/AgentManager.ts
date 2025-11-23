/**
 * @license
 * Copyright 2025 Gemini CLI
 * SPDX-License-Identifier: MIT
 */

import type { TiangongAgentDefinition } from './types.js';
import { readdir, mkdir, writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';
import { AgentParser } from './AgentParser.js';
import { AgentValidator } from './AgentValidator.js';
import type {
  AgentCreateOptions,
  AgentListItem,
} from './types.js';

/**
 * Manages Agent definitions (load, create, list, delete, validate)
 */

export class AgentManager {
  private parser: AgentParser;
  private validator: AgentValidator;
  private agents: Map<string, TiangongAgentDefinition> = new Map();

  constructor() {
    this.parser = new AgentParser();
    this.validator = new AgentValidator();
  }

  /**
   * Get global agents directory path
   */

  static getGlobalAgentsDir(): string {
    return join(homedir(), '.gemini', 'agents');
  }

  /**
   * Get project agents directory path
   */

  static getProjectAgentsDir(projectRoot?: string): string {
    const root = projectRoot || process.cwd();
    return join(root, '.gemini', 'agents');
  }

  /**
   * Get templates directory path
   */

  static getTemplatesDir(): string {
    return join(this.getGlobalAgentsDir(), 'templates');
  }

  /**
   * Load all agents from both global and project directories
   *
   * @param projectRoot - Optional project root (defaults to cwd)
   * @returns Number of agents loaded
   */

  async loadAgents(projectRoot?: string): Promise<number> {
    this.agents.clear();

    const globalDir = AgentManager.getGlobalAgentsDir();
    const projectDir = AgentManager.getProjectAgentsDir(projectRoot);

    // Load global agents
    if (existsSync(globalDir)) {
      await this.loadAgentsFromDir(globalDir, 'global');
    }

    // Load project agents (overrides global with same name)
    if (existsSync(projectDir)) {
      await this.loadAgentsFromDir(projectDir, 'project');
    }

    return this.agents.size;
  }

  /**
   * Load agents from a specific directory
   */

  private async loadAgentsFromDir(
    dir: string,
    scope: 'global' | 'project'
  ): Promise<void> {
    try {
      const files = await readdir(dir);
      const mdFiles = files.filter((f) => f.endsWith('.md'));

      for (const file of mdFiles) {
        const filePath = join(dir, file);
        try {
          const definition = await this.parser.parse(filePath);

          // Override scope based on directory
          definition.scope = scope;

          // Validate
          const validation = this.validator.validate(definition);
          if (!validation.valid) {
            console.warn(`[AgentManager] Skipping invalid agent ${file}:`, validation.errors);
            continue;
          }

          // Store (project agents override global)
          this.agents.set(definition.name, definition);
        } catch (error) {
          console.warn(`[AgentManager] Failed to load agent ${file}:`, error);
        }
      }
    } catch (error) {
      console.warn(`[AgentManager] Failed to read directory ${dir}:`, error);
    }
  }

  /**
   * Get an agent by name
   *
   * @param name - Agent name
   * @returns Agent definition or null
   */

  getAgent(name: string): TiangongAgentDefinition | null {
    return this.agents.get(name) || null;
  }

  /**
   * List all loaded agents
   *
   * @returns Array of agent list items
   */

  listAgents(): AgentListItem[] {
    return Array.from(this.agents.values()).map((def) => ({
      name: def.name,
      title: def.title,
      description: def.description,
      scope: def.scope || 'project',
      model: def.model,
      filePath: def.filePath,
      updatedAt: def.updatedAt,
    }));
  }

  /**
   * Create a new agent
   *
   * @param options - Agent creation options
   * @returns Created agent definition
   */

  async createAgent(options: AgentCreateOptions): Promise<TiangongAgentDefinition> {
    const {
      name,
      title,
      description,
      model = 'gemini-2.0-flash',
      contextMode,
      scope = 'project',
      template,
      customSystemPrompt,
      allowTools = [],
      denyTools = [],
      mcpServers = [],
    } = options;

    // Validate description (required)
    if (!description || description.trim().length === 0) {
      throw new Error('Agent description is required');
    }

    // Validate name (allow lowercase letters, numbers, hyphens, and underscores)
    if (!/^[a-z0-9_-]+$/.test(name)) {
      throw new Error('Agent name must be lowercase alphanumeric with hyphens and underscores only');
    }

    // Check if already exists
    if (this.agents.has(name)) {
      throw new Error(`Agent '${name}' already exists`);
    }

    // Determine target directory
    const targetDir =
      scope === 'global'
        ? AgentManager.getGlobalAgentsDir()
        : AgentManager.getProjectAgentsDir();

    // Ensure directory exists
    await mkdir(targetDir, { recursive: true });

    // Build agent content
    let content: string;

    if (customSystemPrompt) {
      // Use custom system prompt (from AI generation)
      content = this.buildAgentContent({
        name,
        title,
        description,
        model,
        contextMode,
        scope,
        allowTools,
        denyTools,
        mcpServers,
        systemPrompt: customSystemPrompt,
      });
    } else if (template) {
      // Load from template
      const templatePath = join(AgentManager.getTemplatesDir(), `${template}.md`);
      if (!existsSync(templatePath)) {
        throw new Error(`Template '${template}' not found`);
      }
      const templateDef = await this.parser.parse(templatePath);
      content = this.parser.serialize({
        ...templateDef,
        name,
        title,
        description,
        model,
        contextMode,
        scope,
      });
    } else {
      // Use default template
      content = this.buildAgentContent({
        name,
        title,
        description,
        model,
        contextMode,
        scope,
        allowTools,
        denyTools,
        mcpServers,
      });
    }

    // Write file
    const filePath = join(targetDir, `${name}.md`);
    await writeFile(filePath, content, 'utf-8');

    // Parse and load
    const definition = await this.parser.parse(filePath);
    this.agents.set(name, definition);

    return definition;
  }

  /**
   * Build agent file content from parameters
   */

  private buildAgentContent(params: {
    name: string;
    title: string;
    description: string;
    model: string;
    contextMode?: 'isolated' | 'shared' | 'hybrid';
    scope: string;
    allowTools: string[];
    denyTools: string[];
    mcpServers: string[];
    systemPrompt?: string;
  }): string {
    const {
      name,
      title,
      description,
      model,
      contextMode,
      scope,
      allowTools,
      denyTools,
      mcpServers,
      systemPrompt,
    } = params;

    // Build front matter
    let frontMatter = `---
kind: agent
name: ${name}
title: ${title}
description: ${description}
model: ${model}
scope: ${scope}
version: 1.0.0`;

    // Add contextMode only if specified
    if (contextMode) {
      frontMatter += `\ncontextMode: ${contextMode}`;
    }

    frontMatter += `
tools:
  allow: ${JSON.stringify(allowTools)}
  deny: ${JSON.stringify(denyTools)}
mcp:
  servers: ${JSON.stringify(mcpServers)}
---

`;

    // Add system prompt
    if (systemPrompt) {
      return frontMatter + systemPrompt;
    }

    // Default system prompt template
    return frontMatter + `# Role

You are ${title}.

## Responsibilities

- [TODO: Add responsibilities]

## Guidelines

- [TODO: Add guidelines]

## Constraints

- [TODO: Add constraints]
`;
  }

  /**
   * Delete an agent
   *
   * @param name - Agent name to delete
   * @returns True if deleted, false if not found
   */

  async deleteAgent(name: string): Promise<boolean> {
    const agent = this.agents.get(name);
    if (!agent) {
      return false;
    }

    // Delete file
    try {
      await unlink(agent.filePath);
      this.agents.delete(name);
      return true;
    } catch (error) {
      console.error(`[AgentManager] Failed to delete agent ${name}:`, error);
      return false;
    }
  }

  /**
   * Validate an agent definition
   *
   * @param name - Agent name to validate
   * @param availableTools - List of available tools
   * @param availableMCPServers - List of available MCP servers
   * @returns Validation result
   */

  validateAgent(
    name: string,
    availableTools?: string[],
    availableMCPServers?: string[]
  ) {
    const agent = this.agents.get(name);
    if (!agent) {
      throw new Error(`Agent '${name}' not found`);
    }

    return this.validator.validate(agent, availableTools, availableMCPServers);
  }

  /**
   * Get agent count
   */

  getAgentCount(): number {
    return this.agents.size;
  }

  /**
   * Check if an agent exists
   */

  hasAgent(name: string): boolean {
    return this.agents.has(name);
  }
}
