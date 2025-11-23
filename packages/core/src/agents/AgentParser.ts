/**
 * @license
 * Copyright 2025 Gemini CLI
 * SPDX-License-Identifier: MIT
 */

import type { TiangongAgentDefinition } from './types.js';
import { readFile, stat } from 'fs/promises';
import matter from 'gray-matter';
import type {
  AgentFrontMatter,
} from './types.js';

/**
 * Parses Agent definition files (.md with YAML front-matter)
 */

export class AgentParser {
  /**
   * Parse an agent definition from a .md file
   *
   * @param filePath - Full path to the .md file
   * @returns Parsed agent definition
   * @throws Error if file is invalid or parsing fails
   */

  async parse(filePath: string): Promise<TiangongAgentDefinition> {
    // Read file
    const content = await readFile(filePath, 'utf-8');
    const fileStats = await stat(filePath);

    // Parse front-matter
    const parsed = matter(content);
    const frontMatter = parsed.data as AgentFrontMatter;

    // Validate required fields
    if (!frontMatter.kind || frontMatter.kind !== 'agent') {
      throw new Error(`Invalid agent file: ${filePath} - 'kind: agent' is required`);
    }

    if (!frontMatter.name) {
      throw new Error(`Invalid agent file: ${filePath} - 'name' is required`);
    }

    if (!frontMatter.title) {
      throw new Error(`Invalid agent file: ${filePath} - 'title' is required`);
    }

    if (!frontMatter.description || frontMatter.description.trim().length === 0) {
      throw new Error(`Invalid agent file: ${filePath} - 'description' is required`);
    }

    // Extract system prompt from markdown body
    const systemPrompt = parsed.content.trim();
    if (!systemPrompt) {
      throw new Error(`Invalid agent file: ${filePath} - System prompt (markdown body) is required`);
    }

    // Construct definition
    const definition: TiangongAgentDefinition = {
      kind: 'agent',
      name: frontMatter.name,
      title: frontMatter.title,
      description: frontMatter.description,
      model: frontMatter.model,
      color: frontMatter.color,
      scope: frontMatter.scope || 'project',
      version: frontMatter.version,
      contextMode: frontMatter.contextMode,
      tools: frontMatter.tools,
      mcp: frontMatter.mcp,
      triggers: frontMatter.triggers,
      handoffs: frontMatter.handoffs,
      systemPrompt,
      filePath,
      createdAt: fileStats.birthtime,
      updatedAt: fileStats.mtime,
    };

    return definition;
  }

  /**
   * Serialize an agent definition back to .md format
   *
   * @param definition - Agent definition to serialize
   * @returns Markdown file content with front-matter
   */

  serialize(definition: TiangongAgentDefinition): string {
    // Build front-matter object
    const frontMatter: Record<string, any> = {
      kind: 'agent',
      name: definition.name,
      title: definition.title,
    };

    // Add optional fields
    if (definition.description) frontMatter['description'] = definition.description;
    if (definition.model) frontMatter['model'] = definition.model;
    if (definition.color) frontMatter['color'] = definition.color;
    if (definition.scope) frontMatter['scope'] = definition.scope;
    if (definition.version) frontMatter['version'] = definition.version;
    if (definition.contextMode) frontMatter['contextMode'] = definition.contextMode;
    if (definition.tools) frontMatter['tools'] = definition.tools;
    if (definition.mcp) frontMatter['mcp'] = definition.mcp;
    if (definition.triggers) frontMatter['triggers'] = definition.triggers;
    if (definition.handoffs) frontMatter['handoffs'] = definition.handoffs;

    // Use gray-matter to stringify
    const result = matter.stringify(definition.systemPrompt, frontMatter);
    return result;
  }

  /**
   * Extract agent name from file path
   *
   * @param filePath - Path to agent .md file
   * @returns Agent name (filename without .md extension)
   */

  static extractNameFromPath(filePath: string): string {
    const fileName = filePath.split('/').pop() || '';
    return fileName.replace(/\.md$/, '');
  }

  /**
   * Validate agent file name matches front-matter name
   *
   * @param filePath - Path to agent file
   * @param definition - Parsed definition
   * @throws Error if name mismatch
   */

  static validateNameMatch(filePath: string, definition: TiangongAgentDefinition): void {
    const fileBasedName = this.extractNameFromPath(filePath);
    if (fileBasedName !== definition.name) {
      throw new Error(
        `Agent name mismatch: file is '${fileBasedName}.md' but front-matter says name: '${definition.name}'`
      );
    }
  }
}
