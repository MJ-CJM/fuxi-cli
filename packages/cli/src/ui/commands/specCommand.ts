/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SlashCommand, CommandContext } from './types.js';
import { CommandKind } from './types.js';
import { MessageType } from '../types.js';
import { SpecManager } from '@google/gemini-cli-core';

/**
 * /spec command - Spec-Driven Development commands
 *
 * Implements GitHub Spec Kit-like workflow:
 * Constitution → Specification → Technical Plan → Tasks → Implementation
 */
export const specCommand: SlashCommand = {
  name: 'spec',
  description: 'Spec-Driven Development - manage constitution and specifications',
  kind: CommandKind.BUILT_IN,
  subCommands: [
    // Constitution commands
    {
      name: 'constitution',
      description: 'Show current constitution. Use --init to create new one',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext, args: string) => {
        const specManager = new SpecManager(context.services.config!);

        // Parse agent-related flags
        const agentMatch = args?.match(/--agent[=\s]+(\S+)/);
        const agent = agentMatch ? agentMatch[1] : undefined;
        const noRouting = args?.includes('--no-routing') || false;

        // Check if --init flag is provided
        if (args && args.includes('--init')) {
          // Initialize new constitution
          if (specManager.constitutionExists()) {
            context.ui.addItem(
              {
                type: MessageType.INFO,
                text:
                  '⚠️ Constitution already exists.\n\n' +
                  'Use `/spec constitution` to view it.\n' +
                  'If you want to update it, ask AI to use the `create_constitution` tool.',
              },
              Date.now(),
            );
            return;
          }

          context.ui.addItem(
            {
              type: MessageType.INFO,
              text:
                '🎯 **Initialize Project Constitution**\n\n' +
                'I will help you create a constitution for your project.\n\n' +
                'Constitution defines:\n' +
                '- Core engineering principles\n' +
                '- Technical constraints\n' +
                '- Quality standards (testing, security, performance)\n' +
                '- Architecture guidelines\n\n' +
                'Let me ask you some questions...',
            },
            Date.now(),
          );

          // Return prompt for AI to guide constitution creation
          return {
            type: 'submit_prompt',
            content:
              'Guide the user through creating a project constitution. ' +
              'Ask about their project, then use the `create_constitution` tool to save it. ' +
              'Questions to ask:\n' +
              '1. What type of project is this? (web app, library, CLI tool, etc.)\n' +
              '2. What are the key engineering principles they follow?\n' +
              '3. Any technical constraints? (Node.js version, browser support, etc.)\n' +
              '4. What are their testing standards?\n' +
              '5. Any security requirements?\n' +
              '6. Performance goals?\n' +
              '7. Architecture preferences?',
            agentOptions: (agent || noRouting) ? { agent, noRouting } : undefined,
          };
        }

        // Show existing constitution
        const constitution = specManager.loadConstitution();

        if (!constitution) {
          context.ui.addItem(
            {
              type: MessageType.INFO,
              text:
                '📜 **No Constitution Found**\n\n' +
                'Create one with `/spec constitution --init`\n\n' +
                'A constitution establishes engineering principles and standards for your project.',
            },
            Date.now(),
          );
          return;
        }

        let output = `# 📜 Project Constitution\n\n`;
        output += `**Version**: ${constitution.version}\n`;
        output += `**Last Updated**: ${constitution.updatedAt.toLocaleDateString()}\n\n`;

        output += `## 🎯 Core Principles (${constitution.principles.length})\n\n`;
        constitution.principles.forEach((p, i) => {
          output += `${i + 1}. ${p}\n`;
        });
        output += '\n';

        if (constitution.constraints.length > 0) {
          output += `## ⚠️ Technical Constraints (${constitution.constraints.length})\n\n`;
          constitution.constraints.forEach((c, i) => {
            output += `${i + 1}. ${c}\n`;
          });
          output += '\n';
        }

        output += `## ✅ Quality Standards\n\n`;
        output += `- **Testing**: ${constitution.qualityStandards.testing}\n`;
        output += `- **Security**: ${constitution.qualityStandards.security}\n`;
        output += `- **Performance**: ${constitution.qualityStandards.performance}\n`;
        if (constitution.qualityStandards.accessibility) {
          output += `- **Accessibility**: ${constitution.qualityStandards.accessibility}\n`;
        }
        output += '\n';

        if (constitution.architectureGuidelines.length > 0) {
          output += `## 🏗️ Architecture Guidelines (${constitution.architectureGuidelines.length})\n\n`;
          constitution.architectureGuidelines.forEach((g, i) => {
            output += `${i + 1}. ${g}\n`;
          });
          output += '\n';
        }

        if (constitution.codingStandards && constitution.codingStandards.length > 0) {
          output += `## 📝 Coding Standards (${constitution.codingStandards.length})\n\n`;
          constitution.codingStandards.forEach((s, i) => {
            output += `${i + 1}. ${s}\n`;
          });
          output += '\n';
        }

        output += `---\n\n`;
        output += `📁 Location: \`.gemini/specs/constitution.json\`\n\n`;
        output += `💡 Next: Create specifications with \`/spec new\``;

        context.ui.addItem(
          {
            type: MessageType.INFO,
            text: output,
          },
          Date.now(),
        );
        return;
      },
    },

    // Create new specification
    {
      name: 'new',
      description: 'Create a new business specification with AI guidance',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext, args?: string) => {
        // Parse agent-related flags
        const agentMatch = args?.match(/--agent[=\s]+(\S+)/);
        const agent = agentMatch ? agentMatch[1] : undefined;
        const noRouting = args?.includes('--no-routing') || false;

        context.ui.addItem(
          {
            type: MessageType.INFO,
            text:
              '📝 **Create Business Specification**\n\n' +
              'I will help you create a business specification.\n\n' +
              'A specification describes **WHAT** needs to be built from a **business perspective**.\n' +
              'Focus on user needs and business goals, not technical implementation.\n\n' +
              'Let me guide you through the process...',
          },
          Date.now(),
        );

        return {
          type: 'submit_prompt',
          content:
            'Guide the user through creating a business specification. ' +
            'Ask about their feature/requirement, then use the `create_spec` tool. ' +
            'Remember: Focus on BUSINESS aspects only, NO technical details. ' +
            'Questions to ask:\n' +
            '1. What feature/change do they want to build?\n' +
            '2. What is the business goal? (WHY build this?)\n' +
            '3. Who are the users? What do they want to achieve? (User stories)\n' +
            '4. How will you know it\'s done? (Acceptance criteria)\n' +
            '5. Any business constraints? (budget, timeline, compliance)\n' +
            '6. Priority level (1-5)?\n' +
            '7. Business value (1-10)?',
          agentOptions: (agent || noRouting) ? { agent, noRouting } : undefined,
        };
      },
    },

    // List specifications
    {
      name: 'list',
      description: 'List all specifications',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext) => {
        const specManager = new SpecManager(context.services.config!);
        const specs = specManager.listSpecs();

        if (specs.length === 0) {
          context.ui.addItem(
            {
              type: MessageType.INFO,
              text:
                '📋 **No Specifications Found**\n\n' +
                'Create one with `/spec new`\n\n' +
                '💡 Tip: Make sure you have a constitution first (`/spec constitution --init`)',
            },
            Date.now(),
          );
          return;
        }

        let output = `# 📋 Specifications (${specs.length})\n\n`;

        // Group by status
        const byStatus = {
          draft: specs.filter((s) => s.status === 'draft'),
          review: specs.filter((s) => s.status === 'review'),
          approved: specs.filter((s) => s.status === 'approved'),
          'in-progress': specs.filter((s) => s.status === 'in-progress'),
          completed: specs.filter((s) => s.status === 'completed'),
          cancelled: specs.filter((s) => s.status === 'cancelled'),
        };

        for (const [status, items] of Object.entries(byStatus)) {
          if (items.length === 0) continue;

          const icon = {
            draft: '📝',
            review: '👀',
            approved: '✅',
            'in-progress': '🔄',
            completed: '✔️',
            cancelled: '❌',
          }[status];

          output += `## ${icon} ${status.toUpperCase()} (${items.length})\n\n`;

          for (const spec of items) {
            const priorityBadge = spec.priority ? ` [P${spec.priority}]` : '';
            output += `- \`${spec.id}\` - ${spec.title}${priorityBadge}\n`;
            output += `  📂 ${spec.category} | 📅 ${spec.updatedAt.toLocaleDateString()}\n`;
          }
          output += '\n';
        }

        output += `---\n\n`;
        output += `💡 **Commands**:\n`;
        output += `- View spec: \`/spec show <id>\`\n`;
        output += `- Create spec: \`/spec new\`\n`;

        context.ui.addItem(
          {
            type: MessageType.INFO,
            text: output,
          },
          Date.now(),
        );
      },
    },

    // Show specification
    {
      name: 'show',
      description: 'Show specification details: /spec show <id>',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext, args: string) => {
        if (!args || args.trim() === '') {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text:
                '❌ Usage: `/spec show <id>`\n\n' +
                'Example: `/spec show feat-user-auth`\n\n' +
                'List all specs: `/spec list`',
            },
            Date.now(),
          );
          return;
        }

        const specId = args.trim();
        const specManager = new SpecManager(context.services.config!);
        const spec = specManager.getSpec(specId);

        if (!spec) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text:
                `❌ Specification \`${specId}\` not found.\n\n` +
                'List available specs: `/spec list`',
            },
            Date.now(),
          );
          return;
        }

        let output = `# ${spec.title}\n\n`;
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
        output += `**Created**: ${spec.createdAt.toLocaleDateString()}\n`;
        output += `**Updated**: ${spec.updatedAt.toLocaleDateString()}\n`;
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
          spec.dependencies.forEach((dep) => {
            output += `- ${dep}\n`;
          });
          output += '\n';
        }

        if (spec.stakeholders && spec.stakeholders.length > 0) {
          output += `## 👤 Stakeholders\n\n`;
          spec.stakeholders.forEach((stakeholder) => {
            output += `- ${stakeholder}\n`;
          });
          output += '\n';
        }

        output += `---\n\n`;
        output += `📁 Location: \`.gemini/specs/features/${spec.id}.json\`\n\n`;
        output += `💡 **Next Steps**:\n`;
        output += `- Generate technical plan: \`/spec plan ${spec.id}\`\n`;
        output += `- Generate tasks: \`/spec tasks ${spec.id}\`\n`;

        context.ui.addItem(
          {
            type: MessageType.INFO,
            text: output,
          },
          Date.now(),
        );
      },
    },

    // Plan management commands
    {
      name: 'plan',
      description: 'Manage technical plans: /spec plan <subcommand>',
      kind: CommandKind.BUILT_IN,
      subCommands: [
        // Create new plan
        {
          name: 'new',
          description: 'Create new technical plan: /spec plan new <spec-id>',
          kind: CommandKind.BUILT_IN,
          action: async (context: CommandContext, args: string) => {
            if (!args || args.trim() === '') {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text:
                    '❌ Usage: `/spec plan new <spec-id>`\n\n' +
                    'Example: `/spec plan new feat-user-auth`\n\n' +
                    'List all specs: `/spec list`',
                },
                Date.now(),
              );
              return;
            }

            // Parse spec-id and agent flags
            const agentMatch = args.match(/--agent[=\s]+(\S+)/);
            const agent = agentMatch ? agentMatch[1] : undefined;
            const noRouting = args.includes('--no-routing');

            // Extract spec-id (remove flags)
            const specId = args.replace(/--agent[=\s]+\S+/g, '').replace(/--no-routing/g, '').trim();
            const specManager = new SpecManager(context.services.config!);

            // Verify spec exists
            if (!specManager.specExists(specId)) {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text:
                    `❌ Specification \`${specId}\` not found.\n\n` +
                    'List available specs: `/spec list`',
                },
                Date.now(),
              );
              return;
            }

            // Generate new plan
            const spec = specManager.getSpec(specId);
            if (!spec) {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text: `❌ Failed to load specification ${specId}`,
                },
                Date.now(),
              );
              return;
            }

            // Check existing plans
            const existingPlans = specManager.listPlansBySpec(specId);
            const nextVersion = specManager.getNextPlanVersion(specId);

            context.ui.addItem(
              {
                type: MessageType.INFO,
                text:
                  `🏗️ **Generate Technical Plan (${nextVersion})**\n\n` +
                  `Spec: **${spec.title}** (\`${specId}\`)\n` +
                  (existingPlans.length > 0 ? `Existing plans: ${existingPlans.length}\n` : '') +
                  `\n` +
                  `I will create a technical design including:\n` +
                  `- Architecture design\n` +
                  `- Technology choices\n` +
                  `- API design (if applicable)\n` +
                  `- Data model\n` +
                  `- Security considerations\n` +
                  `- Testing strategy\n` +
                  `- Risk assessment\n\n` +
                  `Let me analyze the specification and generate the plan...`,
              },
              Date.now(),
            );

            return {
              type: 'submit_prompt',
              content:
                `Create a technical plan (${nextVersion}) for specification '${specId}' (${spec.title}).\n\n` +
                `Business Specification:\n` +
                `- Goal: ${spec.businessGoal}\n` +
                `- User Stories: ${spec.userStories.join('; ')}\n` +
                `- Acceptance Criteria: ${spec.acceptanceCriteria.join('; ')}\n\n` +
                (existingPlans.length > 0 ? `Note: This spec already has ${existingPlans.length} plan(s). Consider providing a different approach or improvement.\n\n` : '') +
                `**IMPORTANT**: Use the create_tech_plan tool with the following REQUIRED parameters:\n` +
                `- specId: "${specId}" (REQUIRED - this is the specification ID)\n` +
                `- title: A descriptive title for the technical plan\n` +
                `- architecture: { approach, components[], dataFlow, techStack[] }\n` +
                `- implementation: { files[], apis[], database[], config[] }\n` +
                `- risks: Array of { description, severity, mitigation }\n` +
                `- testingStrategy: { unit, integration, e2e, coverage }\n` +
                `- estimatedDuration: Time estimate (e.g., "5 days", "2 weeks")\n\n` +
                `Generate a comprehensive technical design based on the business specification above.`,
              agentOptions: (agent || noRouting) ? { agent, noRouting } : undefined,
            };
          },
        },

        // List plans
        {
          name: 'list',
          description: 'List all plans for a spec: /spec plan list <spec-id>',
          kind: CommandKind.BUILT_IN,
          action: async (context: CommandContext, args: string) => {
            if (!args || args.trim() === '') {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text:
                    '❌ Usage: `/spec plan list <spec-id>`\n\n' +
                    'Example: `/spec plan list feat-user-auth`',
                },
                Date.now(),
              );
              return;
            }

            const specId = args.trim();
            const specManager = new SpecManager(context.services.config!);

            if (!specManager.specExists(specId)) {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text: `❌ Specification \`${specId}\` not found.\n\nList all specs: \`/spec list\``,
                },
                Date.now(),
              );
              return;
            }

            const plans = specManager.listPlansBySpec(specId);
            const spec = specManager.getSpec(specId);

            if (plans.length === 0) {
              context.ui.addItem(
                {
                  type: MessageType.INFO,
                  text:
                    `📋 **No Plans Found**\n\n` +
                    `Spec: ${spec?.title} (\`${specId}\`)\n\n` +
                    `Create a plan: \`/spec plan new ${specId}\``,
                },
                Date.now(),
              );
              return;
            }

            let output = `# 🏗️ Technical Plans for ${spec?.title}\n\n`;
            output += `**Spec ID**: \`${specId}\`\n`;
            output += `**Total Plans**: ${plans.length}\n\n`;

            plans.forEach((plan, idx) => {
              const activeIndicator = plan.isActive ? '⭐ ' : '';
              output += `${idx + 1}. ${activeIndicator}**${plan.title}** (\`${plan.id}\`)\n`;
              output += `   - Version: ${plan.version}\n`;
              if (plan.description) {
                output += `   - Description: ${plan.description}\n`;
              }
              output += `   - Status: ${plan.isActive ? 'Active' : 'Inactive'}\n`;
              output += `   - Est. Duration: ${plan.estimatedDuration}\n`;
              output += `   - Updated: ${plan.updatedAt.toLocaleDateString()}\n\n`;
            });

            output += `---\n\n`;
            output += `💡 **Commands**:\n`;
            output += `- Show plan: \`/spec plan show <plan-id>\`\n`;
            output += `- Create new plan: \`/spec plan new ${specId}\`\n`;
            output += `- Activate plan: \`/spec plan activate <plan-id>\`\n`;
            output += `- Delete plan: \`/spec plan delete <plan-id>\`\n`;

            context.ui.addItem(
              {
                type: MessageType.INFO,
                text: output,
              },
              Date.now(),
            );
          },
        },

        // Show plan details
        {
          name: 'show',
          description: 'Show plan details: /spec plan show <plan-id>',
          kind: CommandKind.BUILT_IN,
          action: async (context: CommandContext, args: string) => {
            if (!args || args.trim() === '') {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text:
                    '❌ Usage: `/spec plan show <plan-id>`\n\n' +
                    'Example: `/spec plan show plan-feat-user-auth-v1`',
                },
                Date.now(),
              );
              return;
            }

            const planId = args.trim();
            const specManager = new SpecManager(context.services.config!);
            const plan = specManager.getPlanById(planId);

            if (!plan) {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text: `❌ Plan \`${planId}\` not found.`,
                },
                Date.now(),
              );
              return;
            }

            let output = `# 🏗️ Technical Plan: ${plan.title}\n\n`;
            output += `**Plan ID**: \`${plan.id}\`\n`;
            output += `**Version**: ${plan.version}\n`;
            if (plan.description) {
              output += `**Description**: ${plan.description}\n`;
            }
            output += `**Spec ID**: \`${plan.specId}\`\n`;
            output += `**Status**: ${plan.isActive ? '⭐ Active' : 'Inactive'}\n`;
            output += `**Created**: ${plan.createdAt.toLocaleDateString()}\n`;
            output += `**Updated**: ${plan.updatedAt.toLocaleDateString()}\n`;
            output += `**Est. Duration**: ${plan.estimatedDuration}\n\n`;

            output += `## Architecture\n\n`;
            if (plan.architecture?.approach) {
              output += `${plan.architecture.approach}\n\n`;
            }
            if (plan.architecture?.dataFlow) {
              output += `**Data Flow**: ${plan.architecture.dataFlow}\n\n`;
            }

            if (plan.architecture?.components && plan.architecture.components.length > 0) {
              output += `**Components** (${plan.architecture.components.length}):\n`;
              plan.architecture.components.forEach((comp, i) => {
                output += `${i + 1}. ${comp}\n`;
              });
              output += '\n';
            }

            if (plan.architecture?.techStack && plan.architecture.techStack.length > 0) {
              output += `**Tech Stack** (${plan.architecture.techStack.length}):\n`;
              plan.architecture.techStack.forEach((tech, i) => {
                output += `${i + 1}. ${tech}\n`;
              });
              output += '\n';
            }

            output += `## Implementation\n\n`;
            if (plan.implementation?.files && plan.implementation.files.length > 0) {
              output += `**Files** (${plan.implementation.files.length}):\n`;
              plan.implementation.files.slice(0, 10).forEach((file, i) => {
                output += `${i + 1}. ${file}\n`;
              });
              if (plan.implementation.files.length > 10) {
                output += `... and ${plan.implementation.files.length - 10} more\n`;
              }
              output += '\n';
            }

            if (plan.security?.measures && plan.security.measures.length > 0) {
              output += `## Security (${plan.security.measures.length})\n\n`;
              plan.security.measures.forEach((measure, i) => {
                output += `${i + 1}. ${measure}\n`;
              });
              output += '\n';
            }

            if (plan.risks && plan.risks.length > 0) {
              output += `## Risks (${plan.risks.length})\n\n`;
              plan.risks.forEach((risk, i) => {
                const icon =
                  risk.severity === 'critical' ? '🔴' : risk.severity === 'high' ? '🟠' : risk.severity === 'medium' ? '🟡' : '🟢';
                output += `${i + 1}. ${icon} **${risk.description}**\n`;
                output += `   - Severity: ${risk.severity}\n`;
                output += `   - Mitigation: ${risk.mitigation}\n`;
              });
              output += '\n';
            }

            output += `## Testing Strategy\n\n`;
            output += `- **Unit**: ${plan.testingStrategy.unit}\n`;
            output += `- **Integration**: ${plan.testingStrategy.integration}\n`;
            if (plan.testingStrategy.e2e) {
              output += `- **E2E**: ${plan.testingStrategy.e2e}\n`;
            }
            output += '\n';

            output += `---\n\n`;
            output += `📁 Location: \`.gemini/specs/plans/${plan.id}.json\`\n\n`;
            output += `💡 **Commands**:\n`;
            output += `- List all plans: \`/spec plan list ${plan.specId}\`\n`;
            output += `- Generate tasks: Use \`spec_to_tasks\` tool with planId: \`${plan.id}\`\n`;
            if (!plan.isActive) {
              output += `- Activate this plan: \`/spec plan activate ${plan.id}\`\n`;
            }

            context.ui.addItem(
              {
                type: MessageType.INFO,
                text: output,
              },
              Date.now(),
            );
          },
        },

        // Delete plan
        {
          name: 'delete',
          description: 'Delete a plan: /spec plan delete <plan-id>',
          kind: CommandKind.BUILT_IN,
          action: async (context: CommandContext, args: string) => {
            if (!args || args.trim() === '') {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text:
                    '❌ Usage: `/spec plan delete <plan-id>`\n\n' +
                    'Example: `/spec plan delete plan-feat-user-auth-v1`',
                },
                Date.now(),
              );
              return;
            }

            const planId = args.trim();
            const specManager = new SpecManager(context.services.config!);
            const plan = specManager.getPlanById(planId);

            if (!plan) {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text: `❌ Plan \`${planId}\` not found.`,
                },
                Date.now(),
              );
              return;
            }

            // Check for associated task lists
            const taskLists = specManager.listTasksByPlan(planId);

            try {
              // Delete associated task lists
              for (const taskList of taskLists) {
                specManager.deleteTaskList(taskList.id);
              }

              // Delete the plan
              specManager.deletePlan(planId);

              let output = `✅ **Plan Deleted**\n\n`;
              output += `Deleted: \`${planId}\` - ${plan.title}\n`;
              output += `Version: ${plan.version}\n\n`;
              if (taskLists.length > 0) {
                output += `**Also deleted ${taskLists.length} task list(s)**:\n`;
                taskLists.forEach((tl) => {
                  output += `- ${tl.id}\n`;
                });
                output += '\n';
              }
              output += `💡 View remaining plans: \`/spec plan list ${plan.specId}\``;

              context.ui.addItem(
                {
                  type: MessageType.INFO,
                  text: output,
                },
                Date.now(),
              );
            } catch (error) {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text: `❌ Failed to delete plan: ${error instanceof Error ? error.message : String(error)}`,
                },
                Date.now(),
              );
            }
          },
        },

        // Activate plan
        {
          name: 'activate',
          description: 'Set a plan as active: /spec plan activate <plan-id>',
          kind: CommandKind.BUILT_IN,
          action: async (context: CommandContext, args: string) => {
            if (!args || args.trim() === '') {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text:
                    '❌ Usage: `/spec plan activate <plan-id>`\n\n' +
                    'Example: `/spec plan activate plan-feat-user-auth-v2`',
                },
                Date.now(),
              );
              return;
            }

            const planId = args.trim();
            const specManager = new SpecManager(context.services.config!);
            const plan = specManager.getPlanById(planId);

            if (!plan) {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text: `❌ Plan \`${planId}\` not found.`,
                },
                Date.now(),
              );
              return;
            }

            if (plan.isActive) {
              context.ui.addItem(
                {
                  type: MessageType.INFO,
                  text: `ℹ️ Plan \`${planId}\` is already active.`,
                },
                Date.now(),
              );
              return;
            }

            try {
              specManager.setActivePlan(planId);

              let output = `✅ **Plan Activated**\n\n`;
              output += `Active plan: \`${planId}\` - ${plan.title}\n`;
              output += `Version: ${plan.version}\n\n`;
              output += `All other plans for spec \`${plan.specId}\` have been deactivated.\n\n`;
              output += `💡 View all plans: \`/spec plan list ${plan.specId}\``;

              context.ui.addItem(
                {
                  type: MessageType.INFO,
                  text: output,
                },
                Date.now(),
              );
            } catch (error) {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text: `❌ Failed to activate plan: ${error instanceof Error ? error.message : String(error)}`,
                },
                Date.now(),
              );
            }
          },
        },
      ],
    },

    // Task list management commands
    {
      name: 'tasks',
      description: 'Manage task lists: /spec tasks <subcommand>',
      kind: CommandKind.BUILT_IN,
      subCommands: [
        // Create new task list
        {
          name: 'new',
          description: 'Create new task list: /spec tasks new <plan-id>',
          kind: CommandKind.BUILT_IN,
          action: async (context: CommandContext, args: string) => {
            if (!args || args.trim() === '') {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text:
                    '❌ Usage: `/spec tasks new <plan-id>`\n\n' +
                    'Example: `/spec tasks new plan-feat-user-auth-v1`\n\n' +
                    'List all plans: `/spec plan list <spec-id>`',
                },
                Date.now(),
              );
              return;
            }

            // Parse plan-id and agent flags
            const agentMatch = args.match(/--agent[=\s]+(\S+)/);
            const agent = agentMatch ? agentMatch[1] : undefined;
            const noRouting = args.includes('--no-routing');

            // Extract plan-id (remove flags)
            const planId = args.replace(/--agent[=\s]+\S+/g, '').replace(/--no-routing/g, '').trim();
            const specManager = new SpecManager(context.services.config!);

            // Verify plan exists
            const plan = specManager.getPlanById(planId);
            if (!plan) {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text:
                    `❌ Technical plan \`${planId}\` not found.\n\n` +
                    'List available plans: `/spec plan list <spec-id>`',
                },
                Date.now(),
              );
              return;
            }

            // Check existing task lists
            const existingTaskLists = specManager.listTasksByPlan(planId);
            const spec = specManager.getSpec(plan.specId);

            context.ui.addItem(
              {
                type: MessageType.INFO,
                text:
                  `📋 **Generate Task List**\n\n` +
                  `Plan: **${plan.title}** (\`${planId}\`)\n` +
                  `Spec: **${spec?.title}** (\`${plan.specId}\`)\n` +
                  (existingTaskLists.length > 0 ? `Existing task lists: ${existingTaskLists.length}\n` : '') +
                  `\n` +
                  `I will break down the technical plan into executable tasks.\n\n` +
                  `This will create:\n` +
                  `- Implementation tasks (core functionality)\n` +
                  `- Testing tasks (unit, integration tests)\n` +
                  `- Documentation tasks (README, API docs)\n` +
                  `- Review tasks (code review, quality checks)\n\n` +
                  `Let me analyze the technical plan and create the task list...`,
              },
              Date.now(),
            );

            return {
              type: 'submit_prompt',
              content:
                `Generate executable tasks for technical plan '${planId}' (${plan.title}).\n\n` +
                `Technical Plan Summary:\n` +
                `- Components: ${plan.architecture.components.join(', ')}\n` +
                `- Files: ${plan.implementation.files.length} files to create/modify\n` +
                `- Est. Duration: ${plan.estimatedDuration}\n\n` +
                (existingTaskLists.length > 0 ? `Note: This plan already has ${existingTaskLists.length} task list(s). Consider providing a different breakdown or granularity level.\n\n` : '') +
                `Use the spec_to_tasks tool to break this down into concrete, actionable tasks. ` +
                `Include planId='${planId}', task dependencies, effort estimates, and file references for each task.`,
              agentOptions: (agent || noRouting) ? { agent, noRouting } : undefined,
            };
          },
        },

        // List task lists
        {
          name: 'list',
          description: 'List all task lists for a plan: /spec tasks list <plan-id>',
          kind: CommandKind.BUILT_IN,
          action: async (context: CommandContext, args: string) => {
            if (!args || args.trim() === '') {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text:
                    '❌ Usage: `/spec tasks list <plan-id>`\n\n' +
                    'Example: `/spec tasks list plan-feat-user-auth-v1`',
                },
                Date.now(),
              );
              return;
            }

            const planId = args.trim();
            const specManager = new SpecManager(context.services.config!);

            // Verify plan exists
            const plan = specManager.getPlanById(planId);
            if (!plan) {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text: `❌ Plan \`${planId}\` not found.\n\nList all plans: \`/spec plan list <spec-id>\``,
                },
                Date.now(),
              );
              return;
            }

            const taskLists = specManager.listTasksByPlan(planId);

            if (taskLists.length === 0) {
              context.ui.addItem(
                {
                  type: MessageType.INFO,
                  text:
                    `📋 **No Task Lists Found**\n\n` +
                    `Plan: ${plan.title} (\`${planId}\`)\n\n` +
                    `Create a task list: \`/spec tasks new ${planId}\``,
                },
                Date.now(),
              );
              return;
            }

            let output = `# 📋 Task Lists for ${plan.title}\n\n`;
            output += `**Plan ID**: \`${planId}\`\n`;
            output += `**Total Task Lists**: ${taskLists.length}\n\n`;

            taskLists.forEach((taskList, idx) => {
              output += `${idx + 1}. **${taskList.id}**\n`;
              output += `   - Variant: ${taskList.variant}\n`;
              if (taskList.description) {
                output += `   - Description: ${taskList.description}\n`;
              }
              output += `   - Tasks: ${taskList.taskCount}\n`;
              output += `   - Updated: ${taskList.updatedAt.toLocaleDateString()}\n\n`;
            });

            output += `---\n\n`;
            output += `💡 **Commands**:\n`;
            output += `- Show task list: \`/spec tasks show <tasks-id>\`\n`;
            output += `- Create new task list: \`/spec tasks new ${planId}\`\n`;
            output += `- Delete task list: \`/spec tasks delete <tasks-id>\`\n`;

            context.ui.addItem(
              {
                type: MessageType.INFO,
                text: output,
              },
              Date.now(),
            );
          },
        },

        // Show task list details
        {
          name: 'show',
          description: 'Show task list details: /spec tasks show <tasks-id>',
          kind: CommandKind.BUILT_IN,
          action: async (context: CommandContext, args: string) => {
            if (!args || args.trim() === '') {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text:
                    '❌ Usage: `/spec tasks show <tasks-id>`\n\n' +
                    'Example: `/spec tasks show plan-feat-user-auth-v1-default`',
                },
                Date.now(),
              );
              return;
            }

            const tasksId = args.trim();
            const specManager = new SpecManager(context.services.config!);
            const taskList = specManager.getTaskListById(tasksId);

            if (!taskList) {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text: `❌ Task list \`${tasksId}\` not found.`,
                },
                Date.now(),
              );
              return;
            }

            let output = `# 📋 Task List: ${taskList.id}\n\n`;
            output += `**Tasks ID**: \`${taskList.id}\`\n`;
            output += `**Plan ID**: \`${taskList.planId}\`\n`;
            output += `**Spec ID**: \`${taskList.specId}\`\n`;
            output += `**Variant**: ${taskList.variant}\n`;
            if (taskList.description) {
              output += `**Description**: ${taskList.description}\n`;
            }
            output += `**Created**: ${taskList.createdAt.toLocaleDateString()}\n`;
            output += `**Updated**: ${taskList.updatedAt.toLocaleDateString()}\n`;
            output += `**Total Tasks**: ${taskList.tasks.length}\n\n`;

            // Group by type
            const tasksByType = new Map<string, typeof taskList.tasks>();
            for (const task of taskList.tasks) {
              const existing = tasksByType.get(task.type) || [];
              existing.push(task);
              tasksByType.set(task.type, existing);
            }

            const typeOrder: Array<'implementation' | 'testing' | 'documentation' | 'review'> = ['implementation', 'testing', 'documentation', 'review'];
            const typeEmoji = {
              implementation: '💻',
              testing: '🧪',
              documentation: '📝',
              review: '👀',
            };

            for (const type of typeOrder) {
              const tasks = tasksByType.get(type);
              if (!tasks || tasks.length === 0) continue;

              output += `## ${typeEmoji[type]} ${type.toUpperCase()} (${tasks.length})\n\n`;

              tasks.forEach((task, idx) => {
                const priorityIcon = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
                const statusIcon = task.status === 'completed' ? '✅' : task.status === 'in_progress' ? '🔄' : task.status === 'blocked' ? '🚫' : '⏳';
                output += `${idx + 1}. ${statusIcon} ${priorityIcon} **${task.title}** (\`${task.id}\`)\n`;
                output += `   - ${task.description}\n`;
                if (task.dependencies && task.dependencies.length > 0) {
                  output += `   - Dependencies: ${task.dependencies.join(', ')}\n`;
                }
                output += `   - Estimated: ${task.estimatedTime}\n`;
                output += `   - Files: ${task.files.length} file(s)\n`;
                output += '\n';
              });
            }

            output += `---\n\n`;
            output += `📁 Location: \`.gemini/specs/tasks/${taskList.id}.json\`\n\n`;
            output += `💡 **Commands**:\n`;
            output += `- List all task lists: \`/spec tasks list ${taskList.planId}\`\n`;
            output += `- Start implementing tasks in order, considering dependencies\n`;

            context.ui.addItem(
              {
                type: MessageType.INFO,
                text: output,
              },
              Date.now(),
            );
          },
        },

        // Delete task list
        {
          name: 'delete',
          description: 'Delete a task list: /spec tasks delete <tasks-id>',
          kind: CommandKind.BUILT_IN,
          action: async (context: CommandContext, args: string) => {
            if (!args || args.trim() === '') {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text:
                    '❌ Usage: `/spec tasks delete <tasks-id>`\n\n' +
                    'Example: `/spec tasks delete plan-feat-user-auth-v1-default`',
                },
                Date.now(),
              );
              return;
            }

            const tasksId = args.trim();
            const specManager = new SpecManager(context.services.config!);
            const taskList = specManager.getTaskListById(tasksId);

            if (!taskList) {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text: `❌ Task list \`${tasksId}\` not found.`,
                },
                Date.now(),
              );
              return;
            }

            try {
              specManager.deleteTaskList(tasksId);

              let output = `✅ **Task List Deleted**\n\n`;
              output += `Deleted: \`${tasksId}\`\n`;
              output += `Variant: ${taskList.variant}\n`;
              output += `Tasks: ${taskList.tasks.length}\n\n`;
              output += `💡 View remaining task lists: \`/spec tasks list ${taskList.planId}\``;

              context.ui.addItem(
                {
                  type: MessageType.INFO,
                  text: output,
                },
                Date.now(),
              );
            } catch (error) {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text: `❌ Failed to delete task list: ${error instanceof Error ? error.message : String(error)}`,
                },
                Date.now(),
              );
            }
          },
        },
      ],
    },

    // Delete specification
    {
      name: 'delete',
      description: 'Delete a specification: /spec delete <id> [--force]',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext, args: string) => {
        if (!args || args.trim() === '') {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text:
                '❌ Usage: `/spec delete <id> [--force]`\n\n' +
                'Example: `/spec delete feat-user-auth`\n' +
                'Force delete without confirmation: `/spec delete feat-user-auth --force`\n\n' +
                'List all specs: `/spec list`',
            },
            Date.now(),
          );
          return;
        }

        const parts = args.trim().split(/\s+/);
        const specId = parts[0];
        const forceDelete = parts.includes('--force');
        const specManager = new SpecManager(context.services.config!);

        // Check if spec exists
        if (!specManager.specExists(specId)) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text:
                `❌ Specification \`${specId}\` not found.\n\n` +
                'List available specs: `/spec list`',
            },
            Date.now(),
          );
          return;
        }

        const spec = specManager.getSpec(specId);
        if (!spec) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: `❌ Failed to load specification ${specId}`,
            },
            Date.now(),
          );
          return;
        }

        // Check for associated plans and task lists
        const plans = specManager.listPlansBySpec(specId);
        const allTaskLists: any[] = [];
        for (const plan of plans) {
          const taskLists = specManager.listTasksByPlan(plan.id);
          allTaskLists.push(...taskLists);
        }

        // If there are related items and no --force flag, show confirmation prompt
        if ((plans.length > 0 || allTaskLists.length > 0) && !forceDelete) {
          let output = `⚠️ **Confirm Deletion**\n\n`;
          output += `You are about to delete specification: **${spec.title}** (\`${specId}\`)\n\n`;

          if (plans.length > 0) {
            output += `**This will also delete ${plans.length} technical plan(s)**:\n`;
            plans.slice(0, 5).forEach((plan, idx) => {
              output += `${idx + 1}. ${plan.title} (\`${plan.id}\`) - ${plan.version}\n`;
            });
            if (plans.length > 5) {
              output += `... and ${plans.length - 5} more\n`;
            }
            output += '\n';
          }

          if (allTaskLists.length > 0) {
            output += `**This will also delete ${allTaskLists.length} task list(s)**:\n`;
            allTaskLists.slice(0, 5).forEach((taskList, idx) => {
              output += `${idx + 1}. ${taskList.id} (${taskList.taskCount} tasks)\n`;
            });
            if (allTaskLists.length > 5) {
              output += `... and ${allTaskLists.length - 5} more\n`;
            }
            output += '\n';
          }

          output += `---\n\n`;
          output += `**To confirm deletion, please respond with one of the following**:\n\n`;
          output += `1. **Delete everything**: Type "yes, delete all" or use \`/spec delete ${specId} --force\`\n`;
          output += `2. **Cancel**: Type "no" or anything else to cancel\n\n`;
          output += `⚠️ This action cannot be undone!`;

          context.ui.addItem(
            {
              type: MessageType.INFO,
              text: output,
            },
            Date.now(),
          );

          return {
            type: 'submit_prompt',
            content:
              `The user wants to delete specification '${specId}' which has ${plans.length} plan(s) and ${allTaskLists.length} task list(s).\n\n` +
              `Ask the user to confirm by typing "yes, delete all" or cancel by typing "no".\n\n` +
              `If they confirm (e.g., "yes, delete all", "yes", "confirm", "delete all"), use the following command:\n` +
              `/spec delete ${specId} --force\n\n` +
              `If they cancel (e.g., "no", "cancel"), acknowledge and do nothing.`,
          };
        }

        // Proceed with deletion (either no related items or --force flag is set)
        try {
          // Delete all task lists first
          for (const taskList of allTaskLists) {
            specManager.deleteTaskList(taskList.id);
          }

          // Delete all plans
          for (const plan of plans) {
            specManager.deletePlan(plan.id);
          }

          // Delete the specification
          specManager.deleteSpec(specId);

          let output = `✅ **Specification Deleted Successfully**\n\n`;
          output += `Deleted: \`${specId}\` - ${spec.title}\n\n`;

          if (plans.length > 0) {
            output += `**Also deleted ${plans.length} technical plan(s)**:\n`;
            plans.forEach((plan) => {
              output += `- ${plan.id} (${plan.version})\n`;
            });
            output += '\n';
          }

          if (allTaskLists.length > 0) {
            output += `**Also deleted ${allTaskLists.length} task list(s)**:\n`;
            allTaskLists.forEach((taskList) => {
              output += `- ${taskList.id} (${taskList.taskCount} tasks)\n`;
            });
            output += '\n';
          }

          output += `💡 View remaining specs: \`/spec list\``;

          context.ui.addItem(
            {
              type: MessageType.INFO,
              text: output,
            },
            Date.now(),
          );
        } catch (error) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: `❌ Failed to delete specification: ${error instanceof Error ? error.message : String(error)}`,
            },
            Date.now(),
          );
        }
        return;
      },
    },

    // Search specifications
    {
      name: 'search',
      description: 'Search specifications: /spec search <query>',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext, args: string) => {
        if (!args || args.trim() === '') {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text:
                '❌ Usage: `/spec search <query>`\n\n' +
                'Example: `/spec search authentication`\n' +
                'Example: `/spec search feat-user`',
            },
            Date.now(),
          );
          return;
        }

        const query = args.trim();
        const specManager = new SpecManager(context.services.config!);
        const results = specManager.searchSpecs(query);

        if (results.length === 0) {
          context.ui.addItem(
            {
              type: MessageType.INFO,
              text:
                `🔍 **No Results Found**\n\n` +
                `No specifications matching "${query}"\n\n` +
                `💡 Try a different search term or view all: \`/spec list\``,
            },
            Date.now(),
          );
          return;
        }

        let output = `# 🔍 Search Results for "${query}"\n\n`;
        output += `Found ${results.length} specification(s)\n\n`;

        for (const spec of results) {
          const priorityBadge = spec.priority ? ` [P${spec.priority}]` : '';
          const statusIcon = {
            draft: '📝',
            review: '👀',
            approved: '✅',
            'in-progress': '🔄',
            completed: '✔️',
            cancelled: '❌',
          }[spec.status] || '📄';

          output += `${statusIcon} **${spec.title}**${priorityBadge}\n`;
          output += `   ID: \`${spec.id}\` | Category: ${spec.category} | Status: ${spec.status}\n`;
          output += `   Updated: ${spec.updatedAt.toLocaleDateString()}\n\n`;
        }

        output += `---\n\n`;
        output += `💡 View details: \`/spec show <id>\`\n`;

        context.ui.addItem(
          {
            type: MessageType.INFO,
            text: output,
          },
          Date.now(),
        );
      },
    },

    // Filter specifications by category or status
    {
      name: 'filter',
      description: 'Filter specs: /spec filter category:<cat> or /spec filter status:<status>',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext, args: string) => {
        if (!args || args.trim() === '') {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text:
                '❌ Usage: `/spec filter category:<category>` or `/spec filter status:<status>`\n\n' +
                'Categories: feature, bug-fix, refactor, enhancement, documentation\n' +
                'Statuses: draft, review, approved, in-progress, completed, cancelled\n\n' +
                'Examples:\n' +
                '  `/spec filter category:feature`\n' +
                '  `/spec filter status:in-progress`',
            },
            Date.now(),
          );
          return;
        }

        const specManager = new SpecManager(context.services.config!);
        const filterArg = args.trim();
        let specs: any[] = [];
        let filterType = '';
        let filterValue = '';

        if (filterArg.startsWith('category:')) {
          filterValue = filterArg.substring('category:'.length);
          filterType = 'category';
          specs = specManager.getSpecsByCategory(filterValue);
        } else if (filterArg.startsWith('status:')) {
          filterValue = filterArg.substring('status:'.length);
          filterType = 'status';
          specs = specManager.getSpecsByStatus(filterValue);
        } else {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text:
                '❌ Invalid filter format\n\n' +
                'Use: `category:<value>` or `status:<value>`',
            },
            Date.now(),
          );
          return;
        }

        if (specs.length === 0) {
          context.ui.addItem(
            {
              type: MessageType.INFO,
              text:
                `📋 **No Results**\n\n` +
                `No specifications with ${filterType} "${filterValue}"\n\n` +
                `💡 View all specs: \`/spec list\``,
            },
            Date.now(),
          );
          return;
        }

        let output = `# 📋 Specifications (${filterType}: ${filterValue})\n\n`;
        output += `Found ${specs.length} specification(s)\n\n`;

        for (const spec of specs) {
          const priorityBadge = spec.priority ? ` [P${spec.priority}]` : '';
          output += `- \`${spec.id}\` - ${spec.title}${priorityBadge}\n`;
          output += `  📂 ${spec.category} | 🏷️ ${spec.status} | 📅 ${spec.updatedAt.toLocaleDateString()}\n\n`;
        }

        output += `---\n\n`;
        output += `💡 View details: \`/spec show <id>\`\n`;

        context.ui.addItem(
          {
            type: MessageType.INFO,
            text: output,
          },
          Date.now(),
        );
      },
    },

    // Update specification (guided by AI)
    {
      name: 'update',
      description: 'Update a specification with AI guidance: /spec update <id>',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext, args: string) => {
        if (!args || args.trim() === '') {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text:
                '❌ Usage: `/spec update <id>`\n\n' +
                'Example: `/spec update feat-user-auth`\n\n' +
                'List all specs: `/spec list`',
            },
            Date.now(),
          );
          return;
        }

        const specId = args.trim();
        const specManager = new SpecManager(context.services.config!);

        // Check if spec exists
        if (!specManager.specExists(specId)) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text:
                `❌ Specification \`${specId}\` not found.\n\n` +
                'List available specs: `/spec list`',
            },
            Date.now(),
          );
          return;
        }

        const spec = specManager.getSpec(specId);
        if (!spec) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: `❌ Failed to load specification ${specId}`,
            },
            Date.now(),
          );
          return;
        }

        context.ui.addItem(
          {
            type: MessageType.INFO,
            text:
              `📝 **Update Specification**\n\n` +
              `Current: **${spec.title}** (\`${specId}\`)\n` +
              `Status: ${spec.status}\n` +
              `Category: ${spec.category}\n\n` +
              `I will help you update this specification.\n` +
              `Tell me what you want to change...`,
          },
          Date.now(),
        );

        return {
          type: 'submit_prompt',
          content:
            `Help the user update specification '${specId}'.\n\n` +
            `Current specification:\n` +
            `- Title: ${spec.title}\n` +
            `- Category: ${spec.category}\n` +
            `- Status: ${spec.status}\n` +
            `- Business Goal: ${spec.businessGoal}\n` +
            `- User Stories: ${spec.userStories.length}\n` +
            `- Acceptance Criteria: ${spec.acceptanceCriteria.length}\n\n` +
            `Ask the user what they want to update (status, title, add user stories, etc.).\n` +
            `Then manually update the file at .gemini/specs/features/${specId}.json.\n` +
            `Note: There is no update_spec tool yet, so you'll need to read the file, modify it, and write it back.`,
        };
      },
    },

    // Task execution management commands
    {
      name: 'execute',
      description: 'Execute tasks: /spec execute <subcommand>',
      kind: CommandKind.BUILT_IN,
      subCommands: [
        // Start execution
        {
          name: 'start',
          description: 'Start executing tasks: /spec execute start <tasks-id>',
          kind: CommandKind.BUILT_IN,
          action: async (context: CommandContext, args: string) => {
            if (!args || args.trim() === '') {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text:
                    '❌ Usage: `/spec execute start <tasks-id>`\n\n' +
                    'Example: `/spec execute start plan-feat-user-auth-v1-default`',
                },
                Date.now(),
              );
              return;
            }

            // Parse tasks-id and agent flags
            const agentMatch = args.match(/--agent[=\s]+(\S+)/);
            const agent = agentMatch ? agentMatch[1] : undefined;
            const noRouting = args.includes('--no-routing');

            // Extract tasks-id (remove flags)
            const tasksId = args.replace(/--agent[=\s]+\S+/g, '').replace(/--no-routing/g, '').trim();
            const specManager = new SpecManager(context.services.config!);
            const taskList = specManager.getTaskListById(tasksId);

            if (!taskList) {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text: `❌ Task list \`${tasksId}\` not found.`,
                },
                Date.now(),
              );
              return;
            }

            // Start execution
            try {
              specManager.startExecution(tasksId);
              const nextTaskId = specManager.getNextExecutableTask(tasksId);

              if (!nextTaskId) {
                context.ui.addItem(
                  {
                    type: MessageType.INFO,
                    text:
                      `🎉 **All tasks completed!**\n\n` +
                      `Task list: \`${tasksId}\`\n\n` +
                      `💡 View status: \`/spec execute status ${tasksId}\``,
                  },
                  Date.now(),
                );
                return;
              }

              context.ui.addItem(
                {
                  type: MessageType.INFO,
                  text:
                    `🚀 **Starting Task Execution**\n\n` +
                    `Task list: \`${tasksId}\`\n` +
                    `Total tasks: ${taskList.tasks.length}\n\n` +
                    `I will now execute the next task with all dependencies satisfied.\n` +
                    `Let me start with task \`${nextTaskId}\`...`,
                },
                Date.now(),
              );

              return {
                type: 'submit_prompt',
                content:
                  `Start executing tasks from task list '${tasksId}' in BATCH MODE.\n\n` +
                  `**BATCH EXECUTION WORKFLOW**:\n\n` +
                  `1. **Execute the task** using execute_task tool with REQUIRED parameters:\n` +
                  `   - taskId: "${nextTaskId}" (NOT task_id)\n` +
                  `   - tasksId: "${tasksId}" (NOT taskListId, NOT task_list_id)\n\n` +
                  `2. **Implement the task** according to the instructions\n\n` +
                  `3. **IMMEDIATELY update status** using update_task_status tool with REQUIRED parameters:\n` +
                  `   - taskId: (the task ID you just executed)\n` +
                  `   - tasksId: "${tasksId}" (NOT taskListId, NOT task_list_id)\n` +
                  `   - status: "completed" (or "blocked" if errors)\n` +
                  `   - notes: (optional) Any execution notes\n\n` +
                  `4. **AUTOMATICALLY continue** to the next task:\n` +
                  `   - Check if there are more pending tasks with satisfied dependencies\n` +
                  `   - If yes: REPEAT steps 1-4 for the next task WITHOUT asking user\n` +
                  `   - If no: Report completion summary\n\n` +
                  `**CRITICAL REMINDERS**:\n` +
                  `- Parameter name is "tasksId" (NOT "taskListId")\n` +
                  `- Continue executing tasks automatically until ALL tasks are completed or blocked\n` +
                  `- Do NOT stop after each task\n` +
                  `- Do NOT ask for permission to continue\n` +
                  `- This is a BATCH execution - complete all tasks in one go`,
                agentOptions: (agent || noRouting) ? { agent, noRouting } : undefined,
              };
            } catch (error) {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text: `❌ Failed to start execution: ${error instanceof Error ? error.message : String(error)}`,
                },
                Date.now(),
              );
              return;
            }
          },
        },

        // Execute single task
        {
          name: 'task',
          description: 'Execute a specific task: /spec execute task <tasks-id> <task-id>',
          kind: CommandKind.BUILT_IN,
          action: async (context: CommandContext, args: string) => {
            // Parse agent flags
            const agentMatch = args.match(/--agent[=\s]+(\S+)/);
            const agent = agentMatch ? agentMatch[1] : undefined;
            const noRouting = args.includes('--no-routing');

            // Remove flags and split to get tasks-id and task-id
            const cleanArgs = args.replace(/--agent[=\s]+\S+/g, '').replace(/--no-routing/g, '').trim();
            const parts = cleanArgs.split(/\s+/);
            if (parts.length < 2) {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text:
                    '❌ Usage: `/spec execute task <tasks-id> <task-id>`\n\n' +
                    'Example: `/spec execute task plan-feat-user-auth-v1-default task-001`',
                },
                Date.now(),
              );
              return;
            }

            const [tasksId, taskId] = parts;
            const specManager = new SpecManager(context.services.config!);
            const taskList = specManager.getTaskListById(tasksId);

            if (!taskList) {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text: `❌ Task list \`${tasksId}\` not found.`,
                },
                Date.now(),
              );
              return;
            }

            const task = taskList.tasks.find(t => t.id === taskId);
            if (!task) {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text: `❌ Task \`${taskId}\` not found in task list.`,
                },
                Date.now(),
              );
              return;
            }

            context.ui.addItem(
              {
                type: MessageType.INFO,
                text:
                  `🚀 **Executing Task**\n\n` +
                  `Task: ${task.title} (\`${taskId}\`)\n` +
                  `Type: ${task.type}\n` +
                  `Priority: ${task.priority}\n\n` +
                  `I will now execute this task...`,
              },
              Date.now(),
            );

            return {
              type: 'submit_prompt',
              content:
                `Execute task '${taskId}' from task list '${tasksId}'.\n\n` +
                `**IMPORTANT**: Use the execute_task tool with these REQUIRED parameters:\n` +
                `- taskId: "${taskId}" (REQUIRED - the task ID)\n` +
                `- tasksId: "${tasksId}" (REQUIRED - the task list ID, NOT taskListId)\n\n` +
                `After completing the implementation, IMMEDIATELY use update_task_status tool with:\n` +
                `- taskId: "${taskId}" (REQUIRED - the task ID)\n` +
                `- tasksId: "${tasksId}" (REQUIRED - the task list ID, NOT taskListId)\n` +
                `- status: "completed" (or "blocked" if errors occurred)\n` +
                `- notes: (optional) Any execution notes`,
              agentOptions: (agent || noRouting) ? { agent, noRouting } : undefined,
            };
          },
        },

        // Show execution status
        {
          name: 'status',
          description: 'Show execution status: /spec execute status <tasks-id>',
          kind: CommandKind.BUILT_IN,
          action: async (context: CommandContext, args: string) => {
            if (!args || args.trim() === '') {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text:
                    '❌ Usage: `/spec execute status <tasks-id>`\n\n' +
                    'Example: `/spec execute status plan-feat-user-auth-v1-default`',
                },
                Date.now(),
              );
              return;
            }

            const tasksId = args.trim();
            const specManager = new SpecManager(context.services.config!);
            const taskList = specManager.getTaskListById(tasksId);

            if (!taskList) {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text: `❌ Task list \`${tasksId}\` not found.`,
                },
                Date.now(),
              );
              return;
            }

            let output = `# 📊 Execution Status\n\n`;
            output += `**Task List**: \`${tasksId}\`\n`;
            output += `**Total Tasks**: ${taskList.tasks.length}\n\n`;

            if (taskList.execution) {
              const statusIcon = {
                not_started: '⏸️',
                in_progress: '🔄',
                paused: '⏸️',
                completed: '✅',
                failed: '❌',
              }[taskList.execution.status];

              output += `**Status**: ${statusIcon} ${taskList.execution.status}\n`;
              if (taskList.execution.startedAt) {
                output += `**Started**: ${taskList.execution.startedAt.toLocaleString()}\n`;
              }
              if (taskList.execution.completedAt) {
                output += `**Completed**: ${taskList.execution.completedAt.toLocaleString()}\n`;
              }
              output += '\n';

              output += `### Progress\n\n`;
              const progress = taskList.execution.progress;
              const percentage = Math.round((progress.completed / progress.total) * 100);
              output += `**Overall**: ${progress.completed}/${progress.total} (${percentage}%)\n`;
              output += `- ✅ Completed: ${progress.completed}\n`;
              output += `- ⏳ Pending: ${progress.pending}\n`;
              if (progress.failed > 0) {
                output += `- ❌ Failed: ${progress.failed}\n`;
              }
              output += '\n';

              if (taskList.execution.failedTaskIds.length > 0) {
                output += `### ❌ Failed Tasks\n\n`;
                taskList.execution.failedTaskIds.forEach(id => {
                  const task = taskList.tasks.find(t => t.id === id);
                  if (task) {
                    output += `- \`${id}\`: ${task.title}\n`;
                  }
                });
                output += '\n';
              }
            } else {
              output += `**Status**: Not started\n\n`;
            }

            const nextTaskId = specManager.getNextExecutableTask(tasksId);
            if (nextTaskId) {
              const nextTask = taskList.tasks.find(t => t.id === nextTaskId);
              output += `### 🎯 Next Task\n\n`;
              output += `**${nextTask?.title}** (\`${nextTaskId}\`)\n`;
              output += `Type: ${nextTask?.type}\n`;
              output += `Priority: ${nextTask?.priority}\n\n`;
            }

            output += `---\n\n`;
            output += `💡 **Commands**:\n`;
            if (nextTaskId) {
              output += `- Execute next: \`/spec execute task ${tasksId} ${nextTaskId}\`\n`;
            }
            output += `- View tasks: \`/spec tasks show ${tasksId}\`\n`;

            context.ui.addItem(
              {
                type: MessageType.INFO,
                text: output,
              },
              Date.now(),
            );
          },
        },
      ],
    },

    // Individual task management
    {
      name: 'task',
      description: 'Manage individual tasks: /spec task <subcommand>',
      kind: CommandKind.BUILT_IN,
      subCommands: [
        // Update task status
        {
          name: 'update',
          description: 'Update task status: /spec task update <tasks-id> <task-id> --status=<status>',
          kind: CommandKind.BUILT_IN,
          action: async (context: CommandContext, args: string) => {
            const parts = args.trim().split(/\s+/);
            if (parts.length < 3) {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text:
                    '❌ Usage: `/spec task update <tasks-id> <task-id> --status=<status>`\n\n' +
                    'Statuses: pending, in_progress, completed, blocked\n\n' +
                    'Example: `/spec task update plan-feat-user-auth-v1-default task-001 --status=completed`',
                },
                Date.now(),
              );
              return;
            }

            const tasksId = parts[0];
            const taskId = parts[1];
            const statusArg = parts.find(p => p.startsWith('--status='));

            if (!statusArg) {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text: '❌ Missing --status flag\n\nExample: --status=completed',
                },
                Date.now(),
              );
              return;
            }

            const status = statusArg.substring('--status='.length) as any;
            const validStatuses = ['pending', 'in_progress', 'completed', 'blocked'];

            if (!validStatuses.includes(status)) {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text: `❌ Invalid status '${status}'\n\nValid statuses: ${validStatuses.join(', ')}`,
                },
                Date.now(),
              );
              return;
            }

            try {
              const specManager = new SpecManager(context.services.config!);
              specManager.updateTaskStatus(tasksId, taskId, status);

              const taskList = specManager.getTaskListById(tasksId);
              const task = taskList?.tasks.find(t => t.id === taskId);

              let output = `✅ **Task Status Updated**\n\n`;
              output += `Task: ${task?.title} (\`${taskId}\`)\n`;
              output += `New status: **${status}**\n\n`;

              if (taskList?.execution?.progress) {
                const progress = taskList.execution.progress;
                const percentage = Math.round((progress.completed / progress.total) * 100);
                output += `Progress: ${progress.completed}/${progress.total} (${percentage}%)\n\n`;
              }

              output += `💡 View status: \`/spec execute status ${tasksId}\``;

              context.ui.addItem(
                {
                  type: MessageType.INFO,
                  text: output,
                },
                Date.now(),
              );
            } catch (error) {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text: `❌ Failed to update task: ${error instanceof Error ? error.message : String(error)}`,
                },
                Date.now(),
              );
            }
          },
        },
      ],
    },
  ],
};
