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
import type { SpecTask, TaskList } from '../spec/types.js';
import { SpecManager } from '../spec/SpecManager.js';
import { formatConstitutionForAI } from '../spec/ConstitutionFormatter.js';

/**
 * Parameters for the spec_to_tasks tool
 */
export interface SpecToTasksParams {
  planId: string;
  variant?: string;
  description?: string;
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    type: 'implementation' | 'testing' | 'documentation' | 'review';
    priority: 'high' | 'medium' | 'low';
    dependencies?: string[];
    files: string[];
    estimatedTime: string;
    notes?: string;
  }>;
}

const description = `Generate executable tasks from a technical plan.

This tool breaks down a technical plan into concrete, actionable tasks that can be
executed sequentially or in parallel. Tasks are organized by type and dependencies.

The generated tasks should:
- Be specific and actionable
- Include clear file references
- Identify dependencies between tasks
- Estimate effort required
- Be organized by type (implementation, testing, documentation, review)

Task types:
- implementation: Core functionality implementation
- testing: Writing and running tests
- documentation: Code comments, README, API docs
- review: Code review, quality checks

Input: Specification ID, Plan ID, and list of tasks
Output: Task list saved to .gemini/specs/tasks/<spec-id>-tasks.json`;

class SpecToTasksToolInvocation extends BaseToolInvocation<
  SpecToTasksParams,
  ToolResult
> {
  constructor(
    params: SpecToTasksParams,
    private readonly config: Config,
  ) {
    super(params);
  }

  getDescription(): string {
    return `Generate tasks for plan ${this.params.planId}`;
  }

  async execute(
    _signal: AbortSignal,
    _updateOutput?: (output: string) => void,
  ): Promise<ToolResult> {
    const specManager = new SpecManager(this.config);

    // Load constitution for context
    const constitution = specManager.loadConstitution();

    // Verify plan exists and get plan info
    const plan = specManager.getPlanById(this.params.planId);
    if (!plan) {
      return {
        llmContent: `Error: Technical plan '${this.params.planId}' not found.`,
        returnDisplay: `❌ Error: Technical plan '${this.params.planId}' not found.`,
      };
    }

    // Ensure tasks directory exists
    const tasksDir = path.join(
      this.config.getWorkingDir(),
      '.gemini',
      'specs',
      'tasks'
    );
    if (!fs.existsSync(tasksDir)) {
      fs.mkdirSync(tasksDir, { recursive: true });
    }

    // Auto-generate tasksId based on planId and variant
    const variant = this.params.variant || 'default';
    const tasksId = `${this.params.planId}-${variant}`;
    const specId = plan.specId;

    // Validate task IDs are unique
    const taskIds = this.params.tasks.map(t => t.id);
    const duplicates = taskIds.filter((id, index) => taskIds.indexOf(id) !== index);
    if (duplicates.length > 0) {
      return {
        llmContent: `Error: Duplicate task IDs found: ${duplicates.join(', ')}. Each task must have a unique ID.`,
        returnDisplay: `❌ Error: Duplicate task IDs: ${duplicates.join(', ')}`,
      };
    }

    // Validate dependencies reference valid task IDs
    for (const task of this.params.tasks) {
      if (task.dependencies) {
        const invalidDeps = task.dependencies.filter(dep => !taskIds.includes(dep));
        if (invalidDeps.length > 0) {
          return {
            llmContent: `Error: Task '${task.id}' has invalid dependencies: ${invalidDeps.join(', ')}. Dependencies must reference existing task IDs.`,
            returnDisplay: `❌ Error: Invalid dependencies in task '${task.id}'`,
          };
        }
      }
    }

    // Create task list structure - matching TaskList interface
    const taskList: TaskList = {
      id: tasksId,
      specId: specId,
      planId: this.params.planId,
      planVersion: plan.version,
      variant: variant,
      description: this.params.description,
      tasks: this.params.tasks.map(task => {
        const specTask: SpecTask = {
          id: task.id,
          specId: specId,
          planId: this.params.planId,
          title: task.title,
          description: task.description,
          type: task.type,
          status: 'pending',
          priority: task.priority,
          dependencies: task.dependencies || [],
          files: task.files,
          estimatedTime: task.estimatedTime,
          notes: task.notes,
          createdAt: new Date(),
        };
        return specTask;
      }),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save tasks
    const tasksPath = path.join(tasksDir, `${tasksId}.json`);
    const existingTasks = fs.existsSync(tasksPath);

    // Convert to JSON-serializable format
    const tasksData = {
      ...taskList,
      createdAt: taskList.createdAt.toISOString(),
      updatedAt: taskList.updatedAt.toISOString(),
      tasks: taskList.tasks.map(task => ({
        ...task,
        createdAt: task.createdAt.toISOString(),
        completedAt: task.completedAt?.toISOString(),
      })),
    };

    fs.writeFileSync(
      tasksPath,
      JSON.stringify(tasksData, null, 2),
      'utf-8'
    );

    // Create formatted output
    let output = '';

    if (existingTasks) {
      output += '✅ Task List Updated Successfully\n\n';
    } else {
      output += '✅ Task List Created Successfully\n\n';
    }

    output += `📁 Saved to: \`${tasksPath}\`\n\n`;
    output += `## Task Breakdown\n\n`;
    output += `**Total Tasks**: ${this.params.tasks.length}\n\n`;

    // Group by type
    const tasksByType = new Map<string, typeof this.params.tasks>();
    for (const task of this.params.tasks) {
      const existing = tasksByType.get(task.type) || [];
      existing.push(task);
      tasksByType.set(task.type, existing);
    }

    // Display by type
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

      output += `### ${typeEmoji[type]} ${type.toUpperCase()} (${tasks.length})\n\n`;

      tasks.forEach((task, idx) => {
        const priorityIcon = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
        output += `${idx + 1}. ${priorityIcon} **${task.title}** (\`${task.id}\`)\n`;
        output += `   - ${task.description}\n`;

        if (task.dependencies && task.dependencies.length > 0) {
          output += `   - Dependencies: ${task.dependencies.join(', ')}\n`;
        }

        output += `   - Estimated: ${task.estimatedTime}\n`;
        output += `   - Files: ${task.files.length} file(s)\n`;

        output += '\n';
      });
    }

    // Show execution order guidance
    output += `### 📋 Execution Order\n\n`;
    output += `Tasks should be executed considering their dependencies.\n`;
    output += `Tasks without dependencies can be executed first or in parallel.\n\n`;

    output += `---\n\n`;
    output += `**Next Steps**:\n`;
    output += `- View tasks: \`/spec tasks show ${tasksId}\`\n`;
    output += `- List all task lists: \`/spec tasks list ${this.params.planId}\`\n`;
    output += `- Start implementation following the task order\n`;
    output += `- Update task status as you progress\n`;

    // Build llmContent with Constitution context if available
    let llmContent = '';
    if (constitution) {
      llmContent += formatConstitutionForAI(constitution) + '\n\n';
    }
    llmContent += `Successfully generated ${this.params.tasks.length} tasks (ID: '${tasksId}', variant: '${variant}') for plan '${this.params.planId}' (spec: '${specId}'). Tasks are organized by type (implementation, testing, documentation, review) and include dependencies and file references. Saved to ${tasksPath}`;

    return {
      llmContent,
      returnDisplay: output,
    };
  }
}

export class SpecToTasksTool extends BaseDeclarativeTool<
  SpecToTasksParams,
  ToolResult
> {
  static readonly Name: string = 'spec_to_tasks';

  constructor(private readonly config: Config) {
    super(
      SpecToTasksTool.Name,
      'Generate Tasks from Spec',
      description,
      Kind.Other,
      {
        type: 'object',
        properties: {
          planId: {
            type: 'string',
            description: 'The ID of the technical plan to generate tasks for',
          },
          variant: {
            type: 'string',
            description: 'Optional variant name for this task list (e.g., "detailed", "simplified", "milestones"). Defaults to "default"',
          },
          description: {
            type: 'string',
            description: 'Optional description of this task list variant',
          },
          tasks: {
            type: 'array',
            description: 'List of tasks to be executed',
            minItems: 1,
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Unique task ID (e.g., task-001)',
                },
                title: {
                  type: 'string',
                  description: 'Task title',
                },
                description: {
                  type: 'string',
                  description: 'Detailed task description',
                },
                type: {
                  type: 'string',
                  enum: ['implementation', 'testing', 'documentation', 'review'],
                  description: 'Type of task',
                },
                priority: {
                  type: 'string',
                  enum: ['high', 'medium', 'low'],
                  description: 'Task priority',
                },
                dependencies: {
                  type: 'array',
                  description: 'IDs of tasks that must be completed first',
                  items: { type: 'string' },
                },
                files: {
                  type: 'array',
                  description: 'Files that need to be created or modified',
                  items: { type: 'string' },
                },
                estimatedTime: {
                  type: 'string',
                  description: 'Estimated time to complete (e.g., "2 hours", "1 day")',
                },
                notes: {
                  type: 'string',
                  description: 'Additional technical notes or guidance',
                },
              },
              required: ['id', 'title', 'description', 'type', 'priority', 'files', 'estimatedTime'],
            },
          },
        },
        required: ['planId', 'tasks'],
      }
    );
  }

  protected override validateToolParamValues(
    params: SpecToTasksParams,
  ): string | null {
    // Validate plan ID
    if (!params.planId || params.planId.trim() === '') {
      return 'Plan ID is required';
    }

    // Validate at least one task
    if (!params.tasks || params.tasks.length === 0) {
      return 'At least one task is required';
    }

    // Validate each task has files
    for (const task of params.tasks) {
      if (!task.files || task.files.length === 0) {
        return `Task '${task.id}' must reference at least one file`;
      }
    }

    return null;
  }

  protected createInvocation(
    params: SpecToTasksParams,
  ): ToolInvocation<SpecToTasksParams, ToolResult> {
    return new SpecToTasksToolInvocation(params, this.config);
  }
}

export function createSpecToTasksTool(config: Config): SpecToTasksTool {
  return new SpecToTasksTool(config);
}
