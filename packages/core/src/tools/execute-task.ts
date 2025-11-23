/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Config } from '../config/config.js';
import type { ToolInvocation } from './tools.js';
import {
  BaseDeclarativeTool,
  BaseToolInvocation,
  Kind,
  type ToolResult,
} from './tools.js';
import { SpecManager } from '../spec/SpecManager.js';
import { formatConstitutionForAI } from '../spec/ConstitutionFormatter.js';

/**
 * Parameters for the execute_task tool
 */
export interface ExecuteTaskParams {
  taskId: string;
  tasksId: string;
}

const description = `Execute a specific task from a task list.

This tool executes a single task by its ID. Before execution, it:
- Verifies the task exists
- Checks all dependencies are completed
- Updates task status to 'in_progress'
- Records execution attempt

After execution:
- Updates task status to 'completed' or 'blocked' based on result
- Updates execution tracking (attempts, timestamp, notes)
- Updates task list progress statistics

Input: Task ID and Task List ID
Output: Execution result with task details`;

class ExecuteTaskToolInvocation extends BaseToolInvocation<
  ExecuteTaskParams,
  ToolResult
> {
  constructor(
    params: ExecuteTaskParams,
    private readonly config: Config,
  ) {
    super(params);
  }

  getDescription(): string {
    return `Execute task ${this.params.taskId}`;
  }

  async execute(
    _signal: AbortSignal,
    _updateOutput?: (output: string) => void,
  ): Promise<ToolResult> {
    const specManager = new SpecManager(this.config);

    // Load constitution for context
    const constitution = specManager.loadConstitution();

    // Get task list
    const taskList = specManager.getTaskListById(this.params.tasksId);
    if (!taskList) {
      return {
        llmContent: `Error: Task list '${this.params.tasksId}' not found.`,
        returnDisplay: `❌ Error: Task list '${this.params.tasksId}' not found.`,
      };
    }

    // Find the task
    const task = taskList.tasks.find((t) => t.id === this.params.taskId);
    if (!task) {
      return {
        llmContent: `Error: Task '${this.params.taskId}' not found in task list '${this.params.tasksId}'.`,
        returnDisplay: `❌ Error: Task '${this.params.taskId}' not found.`,
      };
    }

    // Check if task is already completed
    if (task.status === 'completed') {
      return {
        llmContent: `Task '${this.params.taskId}' is already completed.`,
        returnDisplay: `✅ Task '${task.title}' is already completed.`,
      };
    }

    // Check dependencies
    const dependencyCheck = specManager.checkDependencies(
      this.params.tasksId,
      this.params.taskId
    );
    if (!dependencyCheck.canExecute) {
      const blockingTasks = dependencyCheck.blockingTasks.join(', ');
      return {
        llmContent: `Error: Cannot execute task '${this.params.taskId}' because it has uncompleted dependencies: ${blockingTasks}. Please complete these tasks first.`,
        returnDisplay: `❌ Task '${task.title}' is blocked by dependencies: ${blockingTasks}`,
      };
    }

    // Update task status to in_progress
    specManager.updateTaskStatus(
      this.params.tasksId,
      this.params.taskId,
      'in_progress'
    );

    // Create formatted output
    let output = '';
    output += `🚀 **Executing Task**\n\n`;
    output += `**Task**: ${task.title} (\`${this.params.taskId}\`)\n`;
    output += `**Type**: ${task.type}\n`;
    output += `**Priority**: ${task.priority}\n`;
    output += `**Estimated Time**: ${task.estimatedTime}\n\n`;

    output += `### 📝 Description\n\n`;
    output += `${task.description}\n\n`;

    output += `### 📂 Files to Modify\n\n`;
    task.files.forEach((file, idx) => {
      output += `${idx + 1}. \`${file}\`\n`;
    });
    output += '\n';

    if (task.dependencies && task.dependencies.length > 0) {
      output += `### ✅ Dependencies (Completed)\n\n`;
      task.dependencies.forEach((dep, idx) => {
        const depTask = taskList.tasks.find((t) => t.id === dep);
        output += `${idx + 1}. ${depTask?.title || dep}\n`;
      });
      output += '\n';
    }

    if (task.notes) {
      output += `### 💡 Notes\n\n`;
      output += `${task.notes}\n\n`;
    }

    output += `---\n\n`;
    output += `**Implementation Instructions**:\n\n`;
    output += `Please implement this task according to the description and file list above. `;
    output += `When you complete the implementation:\n\n`;
    output += `1. Verify the implementation works correctly\n`;
    output += `2. Update task status: Use \`update_task_status\` tool with taskId: \`${this.params.taskId}\`, tasksId: \`${this.params.tasksId}\`, status: \`completed\`\n`;
    output += `3. If you encounter errors, update status to \`blocked\` and add execution notes\n\n`;

    const attempts = (task.execution?.attempts || 0) + 1;
    output += `*Execution attempt #${attempts}*\n`;

    // Build llmContent with Constitution context if available
    let llmContent = '';
    if (constitution) {
      llmContent += formatConstitutionForAI(constitution) + '\n\n';
    }
    llmContent += `Started executing task '${this.params.taskId}': ${task.title}. Task type: ${task.type}, priority: ${task.priority}. Files to modify: ${task.files.join(', ')}. This is execution attempt #${attempts}. After completing the implementation, IMMEDIATELY update the task status using update_task_status tool with status='completed' (or 'blocked' if errors). Then check for the next pending task and execute it automatically if in batch mode.`;

    return {
      llmContent,
      returnDisplay: output,
    };
  }
}

export class ExecuteTaskTool extends BaseDeclarativeTool<
  ExecuteTaskParams,
  ToolResult
> {
  static readonly Name: string = 'execute_task';

  constructor(private readonly config: Config) {
    super(
      ExecuteTaskTool.Name,
      'Execute Task',
      description,
      Kind.Other,
      {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'The ID of the task to execute',
          },
          tasksId: {
            type: 'string',
            description: 'The ID of the task list containing the task',
          },
        },
        required: ['taskId', 'tasksId'],
      }
    );
  }

  protected override validateToolParamValues(
    params: ExecuteTaskParams,
  ): string | null {
    if (!params.taskId || params.taskId.trim() === '') {
      return 'Task ID is required';
    }

    if (!params.tasksId || params.tasksId.trim() === '') {
      return 'Task list ID is required';
    }

    return null;
  }

  protected createInvocation(
    params: ExecuteTaskParams,
  ): ToolInvocation<ExecuteTaskParams, ToolResult> {
    return new ExecuteTaskToolInvocation(params, this.config);
  }
}

export function createExecuteTaskTool(config: Config): ExecuteTaskTool {
  return new ExecuteTaskTool(config);
}
