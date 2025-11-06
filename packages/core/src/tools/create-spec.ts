/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ToolInvocation } from './tools.js';
import {
  BaseDeclarativeTool,
  BaseToolInvocation,
  Kind,
  type ToolResult,
} from './tools.js';
import type { Specification } from '../spec/types.js';
import { SpecCategory, SpecStatus } from '../spec/types.js';
import type { Config } from '../config/config.js';
import { SpecManager } from '../spec/SpecManager.js';
import { formatConstitutionForAI } from '../spec/ConstitutionFormatter.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Parameters for the create_spec tool
 */
export interface SpecificationParams {
  id: string;
  title: string;
  category: 'feature' | 'bug-fix' | 'refactor' | 'enhancement' | 'documentation';
  businessGoal: string;
  userStories: string[];
  acceptanceCriteria: string[];
  constraints: string[];
  dependencies?: string[];
  stakeholders?: string[];
  priority?: number;
  businessValue?: number;
  targetRelease?: string;
}


class CreateSpecToolInvocation extends BaseToolInvocation<
  SpecificationParams,
  ToolResult
> {
  constructor(
    params: SpecificationParams,
    private readonly config: Config,
  ) {
    super(params);
  }

  getDescription(): string {
    return `Create specification: ${this.params.title}`;
  }

  async execute(
    _signal: AbortSignal,
    _updateOutput?: (output: string) => void,
  ): Promise<ToolResult> {
    // Load constitution for context
    const specManager = new SpecManager(this.config);
    const constitution = specManager.loadConstitution();

    // Map string category to enum
    const categoryMap: Record<string, SpecCategory> = {
      'feature': SpecCategory.FEATURE,
      'bug-fix': SpecCategory.BUG_FIX,
      'refactor': SpecCategory.REFACTOR,
      'enhancement': SpecCategory.ENHANCEMENT,
      'documentation': SpecCategory.DOCUMENTATION,
    };

    // Create specification object
    const spec: Specification = {
      id: this.params.id,
      title: this.params.title,
      category: categoryMap[this.params.category],
      status: SpecStatus.DRAFT,
      businessGoal: this.params.businessGoal,
      userStories: this.params.userStories,
      acceptanceCriteria: this.params.acceptanceCriteria,
      constraints: this.params.constraints,
      dependencies: this.params.dependencies || [],
      stakeholders: this.params.stakeholders,
      priority: this.params.priority,
      businessValue: this.params.businessValue,
      targetRelease: this.params.targetRelease,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Validate specification
    if (spec.userStories.length === 0) {
      return {
        llmContent: 'Failed to create specification: must have at least one user story',
        returnDisplay: '❌ Specification must have at least one user story',
        error: {
          message: 'Specification must have at least one user story',
        },
      };
    }

    if (spec.acceptanceCriteria.length === 0) {
      return {
        llmContent: 'Failed to create specification: must have at least one acceptance criterion',
        returnDisplay: '❌ Specification must have at least one acceptance criterion',
        error: {
          message: 'Specification must have at least one acceptance criterion',
        },
      };
    }

    // Check if spec ID already exists
    const specsDir = path.join(this.config.getWorkingDir(), '.gemini', 'specs', 'features');
    const specPath = path.join(specsDir, `${spec.id}.json`);

    if (fs.existsSync(specPath)) {
      return {
        llmContent: `Failed to create specification: ID "${spec.id}" already exists`,
        returnDisplay: `❌ Specification with ID "${spec.id}" already exists.\n\nUse /speckit.specify show ${spec.id} to view it.`,
        error: {
          message: `Specification ID "${spec.id}" already exists`,
        },
      };
    }

    // Ensure directory exists
    if (!fs.existsSync(specsDir)) {
      fs.mkdirSync(specsDir, { recursive: true });
    }

    // Save specification
    fs.writeFileSync(specPath, JSON.stringify(spec, null, 2), 'utf-8');

    // Generate output
    let output = '✅ **Specification Created Successfully**\n\n';
    output += `📁 Saved to: \`.gemini/specs/features/${spec.id}.json\`\n\n`;

    output += `# ${spec.title}\n\n`;
    output += `**ID**: \`${spec.id}\`\n`;
    output += `**Category**: ${spec.category}\n`;
    output += `**Status**: ${spec.status}\n`;
    if (spec.priority) {
      output += `**Priority**: ${spec.priority}/5\n`;
    }
    if (spec.businessValue) {
      output += `**Business Value**: ${spec.businessValue}/10\n`;
    }
    if (spec.targetRelease) {
      output += `**Target Release**: ${spec.targetRelease}\n`;
    }
    output += '\n';

    output += `## 🎯 Business Goal\n\n${spec.businessGoal}\n\n`;

    output += `## 👥 User Stories (${spec.userStories.length})\n\n`;
    spec.userStories.forEach((story, i) => {
      output += `${i + 1}. ${story}\n`;
    });
    output += '\n';

    output += `## ✅ Acceptance Criteria (${spec.acceptanceCriteria.length})\n\n`;
    spec.acceptanceCriteria.forEach((criterion, i) => {
      output += `${i + 1}. ${criterion}\n`;
    });
    output += '\n';

    if (spec.constraints.length > 0) {
      output += `## ⚠️ Constraints (${spec.constraints.length})\n\n`;
      spec.constraints.forEach((constraint, i) => {
        output += `${i + 1}. ${constraint}\n`;
      });
      output += '\n';
    }

    if (spec.dependencies && spec.dependencies.length > 0) {
      output += `## 🔗 Dependencies\n\n`;
      spec.dependencies.forEach(dep => {
        output += `- ${dep}\n`;
      });
      output += '\n';
    }

    if (spec.stakeholders && spec.stakeholders.length > 0) {
      output += `## 👤 Stakeholders\n\n`;
      spec.stakeholders.forEach(stakeholder => {
        output += `- ${stakeholder}\n`;
      });
      output += '\n';
    }

    // Add constitution context if exists
    if (constitution) {
      output += `---\n\n`;
      output += `📜 **Constitution Context** (version ${constitution.version}):\n`;
      output += `- ${constitution.principles.length} core principles\n`;
      output += `- ${constitution.constraints.length} technical constraints\n`;
      output += `- Quality standards defined for testing, security, and performance\n\n`;
    } else {
      output += `---\n\n`;
      output += `💡 **Tip**: Create a project constitution first with \`/speckit.constitution init\` to establish engineering principles and standards.\n\n`;
    }

    output += `💡 **Next Steps**:\n`;
    output += `- Review and refine the specification\n`;
    output += `- Generate technical plan: \`/speckit.plan ${spec.id}\` (Coming in Phase 2)\n`;
    output += `- View specification: \`/speckit.specify show ${spec.id}\`\n`;
    output += `- List all specifications: \`/speckit.specify list\`\n`;

    // Build llmContent with Constitution context if available
    let llmContent = '';
    if (constitution) {
      llmContent += formatConstitutionForAI(constitution) + '\n\n';
    }
    llmContent += `Successfully created specification "${spec.title}" (${spec.id}) with ${spec.userStories.length} user stories`;

    return {
      llmContent,
      returnDisplay: output,
    };
  }
}

export class CreateSpecTool extends BaseDeclarativeTool<
  SpecificationParams,
  ToolResult
> {
  static readonly Name: string = 'create_spec';

  constructor(private readonly config: Config) {
    super(
      CreateSpecTool.Name,
      'Create Specification',
      `Create a business specification - describes WHAT needs to be built from a BUSINESS perspective.

**IMPORTANT - Business Focus Only**:
- Focus on business goals, user needs, and outcomes
- Do NOT include technical details (APIs, databases, frameworks, etc.)
- Do NOT mention specific technologies or implementation approaches
- Think from the user's and business stakeholder's perspective

Use this tool when:
- Starting a new feature or enhancement
- Documenting a bug fix from business impact perspective
- Planning a refactoring with business justification
- Creating any work that needs clear business requirements

Specification should include:
- **Business Goal**: WHY we're building this (business value, user pain point)
- **User Stories**: WHO will use it and WHAT they want to achieve
- **Acceptance Criteria**: HOW we know it's done (testable conditions)
- **Constraints**: Business limitations (budget, timeline, compliance, etc.)

The constitution (if exists) provides context about project standards and should be considered when creating specifications.`,
      Kind.Other,
      {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Unique identifier (kebab-case, e.g., "feat-user-auth", "bug-login-fix")',
          },
          title: {
            type: 'string',
            description: 'Specification title',
          },
          category: {
            type: 'string',
            enum: ['feature', 'bug-fix', 'refactor', 'enhancement', 'documentation'],
            description: 'Specification category',
          },
          businessGoal: {
            type: 'string',
            description: 'Business goal and motivation - WHY we need this',
          },
          userStories: {
            type: 'array',
            description: 'User stories describing the feature from user perspective',
            items: { type: 'string' },
          },
          acceptanceCriteria: {
            type: 'array',
            description: 'Clear, testable acceptance criteria',
            items: { type: 'string' },
          },
          constraints: {
            type: 'array',
            description: 'Business constraints and limitations',
            items: { type: 'string' },
          },
          dependencies: {
            type: 'array',
            description: 'IDs of other specifications this depends on',
            items: { type: 'string' },
          },
          stakeholders: {
            type: 'array',
            description: 'Stakeholders involved',
            items: { type: 'string' },
          },
          priority: {
            type: 'number',
            minimum: 1,
            maximum: 5,
            description: 'Priority (1=highest, 5=lowest)',
          },
          businessValue: {
            type: 'number',
            minimum: 1,
            maximum: 10,
            description: 'Business value (1=lowest, 10=highest)',
          },
          targetRelease: {
            type: 'string',
            description: 'Target release or milestone',
          },
        },
        required: ['id', 'title', 'category', 'businessGoal', 'userStories', 'acceptanceCriteria', 'constraints'],
      },
    );
  }

  protected override validateToolParamValues(
    params: SpecificationParams,
  ): string | null {
    if (!params || typeof params !== 'object') {
      return 'Specification parameters must be an object';
    }

    if (!params.id || typeof params.id !== 'string') {
      return 'Specification must have an id';
    }

    if (!params.title || typeof params.title !== 'string') {
      return 'Specification must have a title';
    }

    if (!Array.isArray(params.userStories) || params.userStories.length === 0) {
      return 'Specification must have at least one user story';
    }

    if (!Array.isArray(params.acceptanceCriteria) || params.acceptanceCriteria.length === 0) {
      return 'Specification must have at least one acceptance criterion';
    }

    if (!Array.isArray(params.constraints)) {
      return 'Constraints must be an array';
    }

    if (params.priority !== undefined && (params.priority < 1 || params.priority > 5)) {
      return 'Priority must be between 1 and 5';
    }

    if (params.businessValue !== undefined && (params.businessValue < 1 || params.businessValue > 10)) {
      return 'Business value must be between 1 and 10';
    }

    return null;
  }

  protected createInvocation(
    params: SpecificationParams,
  ): ToolInvocation<SpecificationParams, ToolResult> {
    return new CreateSpecToolInvocation(params, this.config);
  }
}

/**
 * Factory function to create the spec tool
 */
export function createSpecTool(config: Config): CreateSpecTool {
  return new CreateSpecTool(config);
}
