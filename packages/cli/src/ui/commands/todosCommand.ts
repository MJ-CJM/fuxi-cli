/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SlashCommand, CommandContext } from './types.js';
import { CommandKind } from './types.js';
import { MessageType } from '../types.js';
import {
  formatTodosDisplay,
  checkDependencies,
  exportTodosToJson,
} from '../../utils/todoUtils.js';
import { ApprovalMode } from '@google/gemini-cli-core';

export const todosCommand: SlashCommand = {
  name: 'todos',
  description: 'Manage in-memory todo list - list, execute, update, export',
  kind: CommandKind.BUILT_IN,
  subCommands: [
    {
      name: 'list',
      description: 'List all todos',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext, args?: string) => {
        const todos = (context.session as any).todos || [];

        if (todos.length === 0) {
          context.ui.addItem(
            {
              type: MessageType.INFO,
              text:
                'No todos yet.\n\n' +
                '💡 To create todos:\n' +
                '1. Enter Plan mode: Ctrl+P\n' +
                '2. Ask AI to plan a task\n' +
                '3. Convert plan: /plan to-todos',
            },
            Date.now(),
          );
          return;
        }

        // Display formatted todo list
        const output = formatTodosDisplay(todos);
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
      name: 'execute',
      description: 'Execute a single todo: /todos execute <id> [--mode=auto_edit|default] [--agent=<name>] [--no-routing]',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext, args?: string) => {
        if (!args || args.trim() === '') {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text:
                'Usage: /todos execute <id> [--mode=auto_edit|default] [--agent=<name>] [--no-routing]\n\n' +
                'Examples:\n' +
                '  /todos execute step-1\n' +
                '  /todos execute step-2 --mode=auto_edit\n' +
                '  /todos execute step-3 --agent=planner\n' +
                '  /todos execute step-4 --no-routing',
            },
            Date.now(),
          );
          return;
        }

        const todos = (context.session as any).todos || [];

        if (todos.length === 0) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: 'No todos to execute. Create todos first with /plan to-todos',
            },
            Date.now(),
          );
          return;
        }

        // Parse arguments
        const parts = args.trim().split(/\s+/);
        const todoId = parts[0];
        const modeMatch = args.match(/--mode=(auto_edit|default)/);
        const approvalMode = modeMatch ? modeMatch[1] : 'default';

        // Parse agent-related flags (support both --agent=name and --agent name)
        const agentMatch = args.match(/--agent[=\s]+(\S+)/);
        const agent = agentMatch ? agentMatch[1] : undefined;
        const noRouting = args.includes('--no-routing');

        // Debug: log parsed agent options
        console.log('[TODO_EXECUTE] Parsed args:', { args, agent, noRouting });
          // No debug noise here; agent info is shown later if applicable.

        // Find todo
        const todo = todos.find((t: any) => t.id === todoId);
        if (!todo) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: `Todo '${todoId}' not found.\n\nUse /todos list to see available todos.`,
            },
            Date.now(),
          );
          return;
        }

        // Check dependencies
        const depCheck = checkDependencies(todo, todos);
        if (!depCheck.satisfied) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text:
                `❌ Cannot execute ${todoId}. Dependencies not completed:\n` +
                depCheck.incomplete.map(d => `- ${d}`).join('\n') +
                `\n\nComplete dependencies first.`,
            },
            Date.now(),
          );
          return;
        }

        // Exit Plan mode if active (todo execution requires write permissions)
        const planModeActive = (context.session as any).planModeActive;
        const setPlanModeActive = (context.session as any).setPlanModeActive;
        if (planModeActive && setPlanModeActive) {
          setPlanModeActive(false);
          context.ui.addItem(
            {
              type: MessageType.INFO,
              text: '📋 **Exited Plan Mode** - Todo execution requires write permissions',
            },
            Date.now(),
          );
        }

        // Save original approval mode
        const originalMode = context.services.config!.getApprovalMode();

        try {
          // Set approval mode for this execution
          if (approvalMode === 'auto_edit') {
            context.services.config!.setApprovalMode(ApprovalMode.AUTO_EDIT);
            context.ui.addItem(
              {
                type: MessageType.INFO,
                text: '🟢 Auto-edit mode enabled for this task',
              },
              Date.now(),
            );
          }

          // Show execution info
          let execInfo = `🔄 **Executing**: ${todo.description}\n\n`;
          execInfo += `📌 ID: ${todo.id}\n`;
          execInfo += `⚙️ Approval mode: ${approvalMode}\n`;
          
          if (todo.module) {
            execInfo += `📦 Module: ${todo.module}\n`;
          }
          
          if (todo.risks && todo.risks.length > 0) {
            execInfo += `⚠️  Risks: ${todo.risks.join(', ')}\n`;
          }
          
          if (todo.estimatedTime) {
            execInfo += `⏱️  Estimated: ${todo.estimatedTime}\n`;
          }

          context.ui.addItem(
            {
              type: MessageType.INFO,
              text: execInfo,
            },
            Date.now(),
          );

          // Update status to in_progress
          if (typeof (context.session as any).updateTodo === 'function') {
            (context.session as any).updateTodo(todoId, {
              status: 'in_progress',
            });
          }

          // Build execution prompt
          const plan = (context.session as any).currentPlan;
          let prompt = `Execute this task: ${todo.description}\n\n`;

          if (plan) {
            prompt += `Context from plan: ${plan.overview}\n\n`;
          }

          if (todo.risks && todo.risks.length > 0) {
            prompt += `⚠️ Risks to consider:\n${todo.risks.map((r: string) => `- ${r}`).join('\n')}\n\n`;
          }

          prompt += `Complete this task thoroughly and report when done.`;

          // Build agentOptions - agent info will be displayed by useGeminiStream
          const agentOptionsToReturn = (agent || noRouting) ? { agent, noRouting } : undefined;

          // Return prompt to be submitted to Gemini
          return {
            type: 'submit_prompt',
            content: prompt,
            agentOptions: agentOptionsToReturn,
          };

        } finally {
          // Note: Approval mode will be restored after execution completes
          // We'll do this in a follow-up message handler
          setTimeout(() => {
            context.services.config!.setApprovalMode(originalMode);
          }, 100);
        }
      },
    },

    {
      name: 'update',
      description: 'Update todo status: /todos update <id> <status>',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext, args?: string) => {
        const parts = args?.trim().split(/\s+/) || [];
        const [id, status] = parts;

        if (!id || !status) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text:
                'Usage: /todos update <id> <status>\n\n' +
                'Status options:\n' +
                '  - pending\n' +
                '  - in_progress\n' +
                '  - completed\n' +
                '  - cancelled\n\n' +
                'Example: /todos update step-1 completed',
            },
            Date.now(),
          );
          return;
        }

        const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: `Invalid status '${status}'.\nMust be one of: ${validStatuses.join(', ')}`,
            },
            Date.now(),
          );
          return;
        }

        const todos = (context.session as any).todos || [];
        const todo = todos.find((t: any) => t.id === id);

        if (!todo) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: `Todo '${id}' not found.\n\nUse /todos list to see available todos.`,
            },
            Date.now(),
          );
          return;
        }

        // Update todo
        if (typeof (context.session as any).updateTodo === 'function') {
          const updates: any = { status };
          
          if (status === 'completed') {
            updates.completedAt = new Date();
          }
          
          (context.session as any).updateTodo(id, updates);
        }

        context.ui.addItem(
          {
            type: MessageType.INFO,
            text:
              `✅ Updated \`${id}\` → **${status}**\n\n` +
              `Current todo list:\n\n` +
              formatTodosDisplay((context.session as any).todos || []),
          },
          Date.now(),
        );
      },
    },

    {
      name: 'export',
      description: 'Export todos to JSON format',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext) => {
        const todos = (context.session as any).todos || [];
        const plan = (context.session as any).currentPlan;

        if (todos.length === 0) {
          context.ui.addItem(
            {
              type: MessageType.INFO,
              text: 'No todos to export.',
            },
            Date.now(),
          );
          return;
        }

        const json = exportTodosToJson(todos, plan);

        context.ui.addItem(
          {
            type: MessageType.INFO,
            text:
              `📄 **Todos JSON Export**\n\n` +
              `\`\`\`json\n${json}\n\`\`\`\n\n` +
              `💡 Copy this JSON for:\n` +
              `- External automation tools\n` +
              `- Project management systems\n` +
              `- Progress tracking`,
          },
          Date.now(),
        );
      },
    },

    {
      name: 'execute-all',
      description: 'Execute all pending todos in order: /todos execute-all [--mode=auto_edit|default] [--agent=<name>] [--no-routing]',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext, args?: string) => {
        const todos = (context.session as any).todos || [];
        
        if (todos.length === 0) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: 'No todos to execute. Create todos first with /plan to-todos',
            },
            Date.now(),
          );
          return;
        }

        // Parse mode argument
        const modeMatch = args?.match(/--mode=(auto_edit|default)/);
        const mode = modeMatch ? modeMatch[1] : 'default';

        // Parse agent-related flags (support both --agent=name and --agent name)
        const agentMatch = args?.match(/--agent[=\s]+(\S+)/);
        const agent = agentMatch ? agentMatch[1] : undefined;
        const noRouting = args?.includes('--no-routing') || false;

        // Get pending todos count
        const pendingTodos = todos.filter((t: any) => t.status === 'pending');
        
        if (pendingTodos.length === 0) {
          context.ui.addItem(
            {
              type: MessageType.INFO,
              text: '✅ All todos are already completed or in progress.\n\nUse /todos list to see status.',
            },
            Date.now(),
          );
          return;
        }

        // Find first executable todo
        const { getNextExecutableTodo } = await import('../../utils/todoUtils.js');
        const nextTodo = getNextExecutableTodo(todos);
        
        if (!nextTodo) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: '❌ No executable todos found.\n\nAll pending todos have unsatisfied dependencies.',
            },
            Date.now(),
          );
          return;
        }

        // Exit Plan mode if active (batch execution requires write permissions)
        const planModeActive = (context.session as any).planModeActive;
        const setPlanModeActive = (context.session as any).setPlanModeActive;
        if (planModeActive && setPlanModeActive) {
          setPlanModeActive(false);
          context.ui.addItem(
            {
              type: MessageType.INFO,
              text: '📋 **Exited Plan Mode** - Batch execution requires write permissions',
            },
            Date.now(),
          );
        }

        // Initialize execution queue
        const setExecutionQueue = (context.session as any).setExecutionQueue;
        if (typeof setExecutionQueue === 'function') {
          setExecutionQueue({
            active: true,
            mode: mode as 'default' | 'auto_edit',
            currentIndex: 1,
            totalCount: pendingTodos.length,
            executingTodoId: nextTodo.id,
          });
        }

        // Display batch execution start message
        context.ui.addItem(
          {
            type: MessageType.INFO,
            text:
              `🚀 **Starting Batch Execution**\n\n` +
              `📊 Total todos: ${pendingTodos.length}\n` +
              `⚙️ Approval mode: ${mode}\n` +
              `🎯 First todo: ${nextTodo.description}\n\n` +
              `💡 Press Ctrl+C to stop at any time`,
          },
          Date.now(),
        );

        // Save original approval mode
        const { ApprovalMode } = await import('@google/gemini-cli-core');
        const originalMode = context.services.config!.getApprovalMode();

        try {
          // Set approval mode for batch execution
          if (mode === 'auto_edit') {
            context.services.config!.setApprovalMode(ApprovalMode.AUTO_EDIT);
          }

          // Update status to in_progress
          const updateTodo = (context.session as any).updateTodo;
          if (typeof updateTodo === 'function') {
            updateTodo(nextTodo.id, { status: 'in_progress' });
          }

          // Build execution prompt for first todo
          const plan = (context.session as any).currentPlan;
          let prompt = `[Batch Execution 1/${pendingTodos.length}] ${nextTodo.description}\n\n`;
          
          if (plan) {
            prompt += `Context from plan: ${plan.overview}\n\n`;
          }
          
          if (nextTodo.risks && nextTodo.risks.length > 0) {
            prompt += `⚠️ Risks to consider:\n${nextTodo.risks.map((r: string) => `- ${r}`).join('\n')}\n\n`;
          }

          prompt += `Complete this task thoroughly and report when done.`;

          // Return prompt to be submitted to Gemini
          return {
            type: 'submit_prompt',
            content: prompt,
            agentOptions: (agent || noRouting) ? { agent, noRouting } : undefined,
          };

        } catch (error) {
          // Restore original approval mode on error
          context.services.config!.setApprovalMode(originalMode);
          
          // Clear execution queue
          const setExecutionQueue = (context.session as any).setExecutionQueue;
          if (typeof setExecutionQueue === 'function') {
            setExecutionQueue(null);
          }

          throw error;
        }
      },
    },

    {
      name: 'clear',
      description: 'Clear all todos',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext) => {
        if (typeof (context.session as any).setTodos === 'function') {
          (context.session as any).setTodos([]);
        }

        context.ui.addItem(
          {
            type: MessageType.INFO,
            text: '✅ All todos cleared',
          },
          Date.now(),
        );
      },
    },
  ],
};
