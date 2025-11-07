/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SlashCommand, CommandContext } from './types.js';
import { CommandKind } from './types.js';
import { MessageType } from '../types.js';
import { planToTodos } from '../../utils/todoUtils.js';

export const planCommand: SlashCommand = {
  name: 'plan',
  description: 'Plan mode management - create, show, convert to todos',
  kind: CommandKind.BUILT_IN,
  subCommands: [
    {
      name: 'create',
      description: 'Create a new plan (activates Plan mode and prompts AI)',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext, args: string) => {
        // Activate Plan mode if not already active
        const setPlanModeActive = (context.session as any).setPlanModeActive;
        const wasActive = (context.session as any).planModeActive;
        
        if (setPlanModeActive && !wasActive) {
          setPlanModeActive(true);
          context.ui.addItem(
            {
              type: MessageType.INFO,
              text: '📋 **Plan Mode Activated**\n\n✅ Read-only mode enabled\n✅ AI will use create_plan tool for structured output',
            },
            Date.now(),
          );
        }

        // Construct the prompt for AI to create a plan
        const userPrompt = args.trim();
        let prompt: string;
        
        if (userPrompt) {
          // User provided a description, use it directly
          prompt = `Create a comprehensive plan for: ${userPrompt}`;
        } else {
          // No description provided, use a generic prompt
          prompt = 'Create a detailed plan for the current task or project';
        }

        return {
          type: 'submit_prompt' as const,
          content: prompt,
        };
      },
    },
    {
      name: 'to-todos',
      description: 'Convert current plan to todo list (in memory)',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext) => {
        const plan = (context.session as any).currentPlan;

        if (!plan) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: 'No active plan found.\n\nCreate a plan first:\n1. Use /plan create [description] - Activates Plan mode and prompts AI to create a plan\n2. Or enter Plan mode: Ctrl+P, then ask AI to create a plan',
            },
            Date.now(),
          );
          return;
        }

        // Convert plan to todos
        const todos = planToTodos(plan);

        // Store in session
        if (typeof (context.session as any).setTodos === 'function') {
          (context.session as any).setTodos(todos);
        }

        context.ui.addItem(
          {
            type: MessageType.INFO,
            text:
              `✅ **Created ${todos.length} todos from plan** "${plan.title}"\n\n` +
              `💡 Next steps:\n` +
              `- /todos list - View all todos\n` +
              `- /todos execute <id> [--mode=auto_edit|default] - Execute a todo\n` +
              `- /todos execute-all [--mode=auto_edit|default] - Execute all\n` +
              `- /todos export - Export to JSON`,
          },
          Date.now(),
        );
      },
    },

    {
      name: 'show',
      description: 'Show current plan',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext) => {
        const plan = (context.session as any).currentPlan;

        if (!plan) {
          context.ui.addItem(
            {
              type: MessageType.INFO,
              text: 'No active plan.\n\n💡 Create a plan:\n- /plan create [description] - Activates Plan mode and prompts AI\n- Or Ctrl+P to enter Plan mode, then ask AI to create a plan',
            },
            Date.now(),
          );
          return;
        }

        let output = `# 📋 ${plan.title}\n\n`;
        output += `**Overview**: ${plan.overview}\n\n`;
        output += `## 🔢 Steps (${plan.steps.length})\n\n`;

        plan.steps.forEach((step: any, idx: number) => {
          output += `${idx + 1}. **${step.id}**: ${step.description}\n`;
          
          if (step.module) {
            output += `   - 📦 Module: ${step.module}\n`;
          }
          
          if (step.dependencies && step.dependencies.length > 0) {
            output += `   - 🔗 Depends on: ${step.dependencies.join(', ')}\n`;
          }
          
          if (step.risks && step.risks.length > 0) {
            output += `   - ⚠️  Risks: ${step.risks.join(', ')}\n`;
          }
          
          if (step.estimatedTime) {
            output += `   - ⏱️  Estimated: ${step.estimatedTime}\n`;
          }
          
          output += '\n';
        });

        if (plan.risks && plan.risks.length > 0) {
          output += `## ⚠️ Overall Risks\n\n`;
          plan.risks.forEach((r: string) => (output += `- ${r}\n`));
          output += '\n';
        }

        if (plan.testingStrategy) {
          output += `## ✅ Testing Strategy\n\n${plan.testingStrategy}\n\n`;
        }

        if (plan.estimatedDuration) {
          output += `## ⏱️ Estimated Duration\n\n${plan.estimatedDuration}\n\n`;
        }

        output += `💡 Convert to todos: /plan to-todos`;

        context.ui.addItem(
          {
            type: MessageType.INFO,
            text: output,
          },
          Date.now(),
        );
      },
    },

    {
      name: 'clear',
      description: 'Clear current plan',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext) => {
        if (typeof (context.session as any).setCurrentPlan === 'function') {
          (context.session as any).setCurrentPlan(null);
        }

        context.ui.addItem(
          {
            type: MessageType.INFO,
            text: '✅ Plan cleared',
          },
          Date.now(),
        );
      },
    },
  ],
};

