/**
 * @license
 * Copyright 2025 Gemini CLI
 * SPDX-License-Identifier: MIT
 */

import type { TiangongAgentDefinition } from './types.js';
import AjvPkg from 'ajv';
import type { ErrorObject } from 'ajv';
import * as addFormats from 'ajv-formats';
import type {
  AgentValidationResult,
} from './types.js';

// Ajv's ESM/CJS interop: use 'any' for compatibility as recommended by Ajv docs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AjvClass = (AjvPkg as any).default || AjvPkg;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const addFormatsFunc = (addFormats as any).default || addFormats;

/**
 * JSON Schema for Agent front-matter validation
 */

const AGENT_SCHEMA = {
  type: 'object',
  required: ['kind', 'name', 'title', 'description'],
  properties: {
    kind: {
      type: 'string',
      const: 'agent',
    },
    name: {
      type: 'string',
      pattern: '^[a-z0-9_-]+$',
      minLength: 1,
      maxLength: 100,
    },
    title: {
      type: 'string',
      minLength: 1,
      maxLength: 200,
    },
    description: {
      type: 'string',
      minLength: 1,
      maxLength: 1000,
    },
    model: {
      type: 'string',
    },
    color: {
      type: 'string',
      pattern: '^#[0-9A-Fa-f]{6}$',
    },
    scope: {
      type: 'string',
      enum: ['global', 'project'],
    },
    version: {
      type: 'string',
    },
    contextMode: {
      type: 'string',
      enum: ['isolated', 'shared', 'hybrid'],
    },
    tools: {
      type: 'object',
      properties: {
        allow: {
          type: 'array',
          items: { type: 'string' },
        },
        deny: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      additionalProperties: false,
    },
    mcp: {
      type: 'object',
      properties: {
        servers: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      additionalProperties: false,
    },
    triggers: {
      type: 'object',
      properties: {
        keywords: {
          type: 'array',
          items: { type: 'string' },
        },
        patterns: {
          type: 'array',
          items: { type: 'string' },
        },
        priority: {
          type: 'number',
          minimum: 0,
          maximum: 100,
        },
      },
      additionalProperties: false,
    },
    handoffs: {
      type: 'array',
      items: {
        type: 'object',
        required: ['to'],
        properties: {
          to: {
            type: 'string',
          },
          when: {
            type: 'string',
            enum: ['manual', 'auto', 'conditional'],
          },
          description: {
            type: 'string',
          },
          include_context: {
            type: 'boolean',
          },
        },
        additionalProperties: false,
      },
    },
    // Additional fields added by parser (not in front-matter)
    systemPrompt: {
      type: 'string',
    },
    filePath: {
      type: 'string',
    },
    createdAt: {
      type: 'object', // Date object
    },
    updatedAt: {
      type: 'object', // Date object
    },
  },
  additionalProperties: false,
};

/**
 * Validates Agent definitions against schema and business rules
 */

export class AgentValidator {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private ajv: any;

  constructor() {
    this.ajv = new AjvClass({ allErrors: true });
    addFormatsFunc(this.ajv);
  }

  /**
   * Validate an agent definition
   *
   * @param definition - Agent definition to validate
   * @param availableTools - List of available tool names (for validating allow/deny lists)
   * @param availableMCPServers - List of available MCP server names
   * @returns Validation result with errors and warnings
   */

  validate(
    definition: Partial<TiangongAgentDefinition>,
    availableTools?: string[],
    availableMCPServers?: string[]
  ): AgentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Schema validation
    const validate = this.ajv.compile(AGENT_SCHEMA);
    const valid = validate(definition);

    if (!valid && validate.errors) {
      errors.push(...this.formatAjvErrors(validate.errors));
    }

    // Additional validations
    if (definition.name) {
      // Check name format (allow lowercase letters, numbers, hyphens, and underscores)
      if (!/^[a-z0-9_-]+$/.test(definition.name)) {
        errors.push(`Agent name must be lowercase alphanumeric with hyphens and underscores only: '${definition.name}'`);
      }

      // Check reserved names (only truly conflicting names)
      const reservedNames = ['default', 'system'];
      if (reservedNames.includes(definition.name)) {
        errors.push(`Agent name '${definition.name}' is reserved for system use`);
      }

      // Warn about potentially confusing names (but allow them)
      const discouragedNames = ['main', 'temp', 'admin', 'root', 'config'];
      if (discouragedNames.includes(definition.name)) {
        warnings.push(`Agent name '${definition.name}' may be confusing. Consider a more descriptive name.`);
      }
    }

    // Validate system prompt
    if (definition.systemPrompt) {
      if (definition.systemPrompt.trim().length < 10) {
        warnings.push('System prompt is very short (< 10 characters). Consider adding more guidance.');
      }

      if (definition.systemPrompt.length > 100000) {
        errors.push(`System prompt is too long (${definition.systemPrompt.length} chars, max 100000)`);
      }
    }

    // Validate tools
    if (definition.tools) {
      const { allow, deny } = definition.tools;

      // Check for duplicates
      if (allow && new Set(allow).size !== allow.length) {
        warnings.push('Tool allow list contains duplicates');
      }

      if (deny && new Set(deny).size !== deny.length) {
        warnings.push('Tool deny list contains duplicates');
      }

      // Check for conflicts (same tool in both allow and deny)
      if (allow && deny) {
        const conflicts = allow.filter((tool) => deny.includes(tool));
        if (conflicts.length > 0) {
          warnings.push(`Tools in both allow and deny lists (deny takes precedence): ${conflicts.join(', ')}`);
        }
      }

      // Validate against available tools
      if (availableTools) {
        if (allow) {
          const unknownTools = allow.filter((tool) => !availableTools.includes(tool));
          if (unknownTools.length > 0) {
            warnings.push(`Unknown tools in allow list: ${unknownTools.join(', ')}`);
          }
        }

        if (deny) {
          const unknownTools = deny.filter((tool) => !availableTools.includes(tool));
          if (unknownTools.length > 0) {
            warnings.push(`Unknown tools in deny list: ${unknownTools.join(', ')}`);
          }
        }
      }
    }

    // Validate MCP servers
    if (definition.mcp?.servers && availableMCPServers) {
      const unknownServers = definition.mcp.servers.filter(
        (server) => !availableMCPServers.includes(server)
      );
      if (unknownServers.length > 0) {
        warnings.push(`Unknown MCP servers: ${unknownServers.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Format Ajv validation errors into readable messages
   */

  private formatAjvErrors(errors: ErrorObject[]): string[] {
    return errors.map((err) => {
      const path = err.instancePath || 'root';
      const message = err.message || 'validation failed';

      if (err.keyword === 'required') {
        const missing = (err.params as any).missingProperty;
        return `Missing required field: ${missing}`;
      }

      if (err.keyword === 'pattern') {
        return `${path}: ${message} (expected pattern: ${(err.params as any).pattern})`;
      }

      if (err.keyword === 'enum') {
        const allowed = (err.params as any).allowedValues;
        return `${path}: must be one of ${allowed.join(', ')}`;
      }

      return `${path}: ${message}`;
    });
  }

  /**
   * Quick validation - throws error if invalid
   *
   * @param definition - Agent definition to validate
   * @throws Error if validation fails
   */

  validateOrThrow(definition: Partial<TiangongAgentDefinition>): void {
    const result = this.validate(definition);
    if (!result.valid) {
      throw new Error(`Agent validation failed:\n${result.errors.join('\n')}`);
    }
  }
}
