/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import type { Config } from '../config/config.js';
import type { ToolInvocation } from './tools.js';
import {
  BaseDeclarativeTool,
  BaseToolInvocation,
  Kind,
  type ToolResult,
} from './tools.js';
import type { TechnicalPlan, Specification } from '../spec/types.js';
import { SpecManager } from '../spec/SpecManager.js';
import { formatConstitutionForAI } from '../spec/ConstitutionFormatter.js';

/**
 * Parameters for the create_tech_plan tool
 */
export interface TechPlanParams {
  specId: string;
  description?: string;
  title: string;
  architecture: {
    approach: string;
    components: string[];
    dataFlow: string;
    techStack?: string[];
  };
  implementation: {
    files: string[];
    apis?: string[];
    database?: string[];
    config?: string[];
  };
  risks: Array<{
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    mitigation: string;
  }>;
  testingStrategy: {
    unit: string;
    integration: string;
    e2e?: string;
    coverage?: string;
  };
  rollbackStrategy?: string;
  performance?: {
    expectedMetrics: string;
    monitoring: string;
  };
  security?: {
    measures: string[];
    authStrategy?: string;
  };
  estimatedDuration: string;
  dependencies?: string[];
}

const description = `Create a technical plan from a business specification.

This tool generates a comprehensive technical design based on a business specification,
including architecture, implementation approach, testing strategy, and risk assessment.

The technical plan should:
- Align with the project constitution's principles and constraints
- Be based on the business specification's requirements
- Provide concrete, implementable technical decisions
- Consider security, performance, and quality standards
- Identify and mitigate technical risks

Input: Business specification ID and technical design details
Output: Technical plan saved to .gemini/specs/plans/<plan-id>.json`;

class CreateTechPlanToolInvocation extends BaseToolInvocation<
  TechPlanParams,
  ToolResult
> {
  constructor(
    params: TechPlanParams,
    private readonly config: Config,
  ) {
    super(params);
  }

  getDescription(): string {
    return `Create technical plan for spec ${this.params.specId}`;
  }

  async execute(
    _signal: AbortSignal,
    _updateOutput?: (output: string) => void,
  ): Promise<ToolResult> {
    const specManager = new SpecManager(this.config);

    // Load constitution for context
    const constitution = specManager.loadConstitution();

    // Verify spec exists
    if (!specManager.specExists(this.params.specId)) {
      return {
        llmContent: `Error: Specification '${this.params.specId}' not found. Please create the specification first using create_spec tool.`,
        returnDisplay: `❌ Error: Specification '${this.params.specId}' not found.`,
      };
    }

    // Load the spec to include in the plan
    const spec: Specification | null = specManager.getSpec(this.params.specId);
    if (!spec) {
      return {
        llmContent: `Error: Failed to load specification '${this.params.specId}'.`,
        returnDisplay: `❌ Error: Failed to load specification.`,
      };
    }

    // Auto-generate version and ID
    const version = specManager.getNextPlanVersion(this.params.specId);
    const planId = `plan-${this.params.specId}-${version}`;

    // Create technical plan object
    const technicalPlan: TechnicalPlan = {
      id: planId,
      specId: this.params.specId,
      version: version,
      description: this.params.description,
      isActive: true, // New plans are active by default
      title: this.params.title,
      architecture: this.params.architecture,
      implementation: this.params.implementation,
      risks: this.params.risks,
      testingStrategy: this.params.testingStrategy,
      rollbackStrategy: this.params.rollbackStrategy,
      performance: this.params.performance,
      security: this.params.security,
      estimatedDuration: this.params.estimatedDuration,
      dependencies: this.params.dependencies || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Deactivate other plans for this spec
    const existingPlans = specManager.listPlansBySpec(this.params.specId);
    for (const existingPlan of existingPlans) {
      if (existingPlan.isActive) {
        specManager.updatePlan(existingPlan.id, { isActive: false });
      }
    }

    // Ensure plans directory exists
    const plansDir = path.join(
      this.config.getWorkingDir(),
      '.gemini',
      'specs',
      'plans'
    );
    if (!fs.existsSync(plansDir)) {
      fs.mkdirSync(plansDir, { recursive: true });
    }

    // Save technical plan
    const planPath = path.join(plansDir, `${planId}.json`);
    const existingPlan = fs.existsSync(planPath);

    // Convert to JSON-serializable format
    const planData = {
      ...technicalPlan,
      createdAt: technicalPlan.createdAt.toISOString(),
      updatedAt: technicalPlan.updatedAt.toISOString(),
    };

    fs.writeFileSync(
      planPath,
      JSON.stringify(planData, null, 2),
      'utf-8'
    );

    // Create formatted output
    let output = '';

    if (existingPlan) {
      output += '✅ Technical Plan Updated Successfully\n\n';
    } else {
      output += '✅ Technical Plan Created Successfully\n\n';
    }

    output += `📁 Saved to: \`${planPath}\`\n\n`;
    output += `## Technical Plan Summary\n\n`;
    output += `**ID**: ${planId}\n`;
    output += `**Version**: ${version}\n`;
    if (this.params.description) {
      output += `**Description**: ${this.params.description}\n`;
    }
    output += `**Specification**: ${spec.title} (${this.params.specId})\n`;
    output += `**Status**: Active\n`;
    output += `**Estimated Duration**: ${this.params.estimatedDuration}\n\n`;

    // Architecture
    output += `### 🏗️ Architecture\n\n`;
    output += `${this.params.architecture.approach}\n\n`;
    output += `**Components** (${this.params.architecture.components.length}):\n`;
    this.params.architecture.components.forEach((comp, idx) => {
      output += `${idx + 1}. ${comp}\n`;
    });
    output += '\n';

    if (this.params.architecture.techStack && this.params.architecture.techStack.length > 0) {
      output += `**Tech Stack** (${this.params.architecture.techStack.length}):\n`;
      this.params.architecture.techStack.forEach((tech, idx) => {
        output += `${idx + 1}. ${tech}\n`;
      });
      output += '\n';
    }

    // Implementation
    output += `### 💻 Implementation\n\n`;
    output += `**Files to create/modify** (${this.params.implementation.files.length}):\n`;
    this.params.implementation.files.forEach((file, idx) => {
      output += `${idx + 1}. ${file}\n`;
    });
    output += '\n';

    // Risks
    output += `### ⚠️ Technical Risks (${this.params.risks.length})\n\n`;
    this.params.risks.forEach((risk, idx) => {
      const icon = risk.severity === 'critical' ? '🔴' : risk.severity === 'high' ? '🟠' : risk.severity === 'medium' ? '🟡' : '🟢';
      output += `${idx + 1}. ${icon} **${risk.description}**\n`;
      output += `   - Severity: ${risk.severity}\n`;
      output += `   - Mitigation: ${risk.mitigation}\n`;
    });
    output += '\n';

    // Testing
    output += `### 🧪 Testing Strategy\n\n`;
    output += `- **Unit**: ${this.params.testingStrategy.unit}\n`;
    output += `- **Integration**: ${this.params.testingStrategy.integration}\n`;
    if (this.params.testingStrategy.e2e) {
      output += `- **E2E**: ${this.params.testingStrategy.e2e}\n`;
    }
    if (this.params.testingStrategy.coverage) {
      output += `- **Coverage**: ${this.params.testingStrategy.coverage}\n`;
    }
    output += '\n';

    output += `---\n\n`;
    output += `**Next Steps**:\n`;
    output += `- Review the technical plan: \`/spec plan show ${planId}\`\n`;
    output += `- List all plans: \`/spec plan list ${this.params.specId}\`\n`;
    output += `- Generate tasks: Use \`spec_to_tasks\` tool with planId: \`${planId}\`\n`;

    // Build llmContent with Constitution context if available
    let llmContent = '';
    if (constitution) {
      llmContent += formatConstitutionForAI(constitution) + '\n\n';
    }
    llmContent += `Successfully created technical plan '${planId}' (${version}) for specification '${this.params.specId}'. This is now the active plan. The plan includes architecture design (${this.params.architecture.components.length} components), implementation details (${this.params.implementation.files.length} files), ${this.params.risks.length} technical risks with mitigation strategies, and comprehensive testing strategy. Estimated duration: ${this.params.estimatedDuration}. Saved to ${planPath}`;

    return {
      llmContent,
      returnDisplay: output,
    };
  }
}

export class CreateTechPlanTool extends BaseDeclarativeTool<
  TechPlanParams,
  ToolResult
> {
  static readonly Name: string = 'create_tech_plan';

  constructor(private readonly config: Config) {
    super(
      CreateTechPlanTool.Name,
      'Create Technical Plan',
      description,
      Kind.Other,
      {
        type: 'object',
        properties: {
          specId: {
            type: 'string',
            description: 'The ID of the specification to create a technical plan for',
          },
          description: {
            type: 'string',
            description: 'Optional description of this plan variant (e.g., "OAuth2 implementation", "JWT-based approach")',
          },
          title: {
            type: 'string',
            description: 'Title of the technical plan',
          },
          architecture: {
            type: 'object',
            description: 'Architecture and design',
            properties: {
              approach: {
                type: 'string',
                description: 'Technical approach and rationale',
              },
              components: {
                type: 'array',
                description: 'System components to be created/modified',
                items: { type: 'string' },
              },
              dataFlow: {
                type: 'string',
                description: 'Data flow description',
              },
              techStack: {
                type: 'array',
                description: 'Technology stack choices',
                items: { type: 'string' },
              },
            },
            required: ['approach', 'components', 'dataFlow'],
          },
          implementation: {
            type: 'object',
            description: 'Implementation details',
            properties: {
              files: {
                type: 'array',
                description: 'Files to be created or modified',
                items: { type: 'string' },
              },
              apis: {
                type: 'array',
                description: 'API endpoints (if applicable)',
                items: { type: 'string' },
              },
              database: {
                type: 'array',
                description: 'Database changes (if applicable)',
                items: { type: 'string' },
              },
              config: {
                type: 'array',
                description: 'Configuration changes',
                items: { type: 'string' },
              },
            },
            required: ['files'],
          },
          risks: {
            type: 'array',
            description: 'Technical risks and mitigation strategies',
            items: {
              type: 'object',
              properties: {
                description: {
                  type: 'string',
                  description: 'Risk description',
                },
                severity: {
                  type: 'string',
                  enum: ['low', 'medium', 'high', 'critical'],
                  description: 'Risk severity',
                },
                mitigation: {
                  type: 'string',
                  description: 'Mitigation strategy',
                },
              },
              required: ['description', 'severity', 'mitigation'],
            },
          },
          testingStrategy: {
            type: 'object',
            description: 'Testing strategy',
            properties: {
              unit: {
                type: 'string',
                description: 'Unit testing approach',
              },
              integration: {
                type: 'string',
                description: 'Integration testing approach',
              },
              e2e: {
                type: 'string',
                description: 'E2E testing approach',
              },
              coverage: {
                type: 'string',
                description: 'Test coverage requirements',
              },
            },
            required: ['unit', 'integration'],
          },
          rollbackStrategy: {
            type: 'string',
            description: 'Rollback strategy',
          },
          performance: {
            type: 'object',
            description: 'Performance considerations',
            properties: {
              expectedMetrics: {
                type: 'string',
                description: 'Expected performance metrics',
              },
              monitoring: {
                type: 'string',
                description: 'Monitoring approach',
              },
            },
            required: ['expectedMetrics', 'monitoring'],
          },
          security: {
            type: 'object',
            description: 'Security considerations',
            properties: {
              measures: {
                type: 'array',
                description: 'Security measures',
                items: { type: 'string' },
              },
              authStrategy: {
                type: 'string',
                description: 'Authentication/Authorization strategy',
              },
            },
            required: ['measures'],
          },
          estimatedDuration: {
            type: 'string',
            description: 'Estimated development time',
          },
          dependencies: {
            type: 'array',
            description: 'Dependencies on other technical plans',
            items: { type: 'string' },
          },
        },
        required: [
          'specId',
          'title',
          'architecture',
          'implementation',
          'risks',
          'testingStrategy',
          'estimatedDuration',
        ],
      }
    );
  }

  protected override validateToolParamValues(
    params: TechPlanParams,
  ): string | null {
    // Validate spec ID format
    if (!params.specId || params.specId.trim() === '') {
      return 'Specification ID is required';
    }

    // Validate architecture has at least one component
    if (!params.architecture.components || params.architecture.components.length === 0) {
      return 'Architecture must include at least one component';
    }

    // Validate at least one file is specified
    if (!params.implementation.files || params.implementation.files.length === 0) {
      return 'Implementation must include at least one file';
    }

    // Validate at least one risk
    if (!params.risks || params.risks.length === 0) {
      return 'Must identify at least one technical risk';
    }

    return null;
  }

  protected createInvocation(
    params: TechPlanParams,
  ): ToolInvocation<TechPlanParams, ToolResult> {
    return new CreateTechPlanToolInvocation(params, this.config);
  }
}

export function createTechPlanTool(config: Config): CreateTechPlanTool {
  return new CreateTechPlanTool(config);
}
