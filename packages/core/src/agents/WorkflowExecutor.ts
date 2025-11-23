/**
 * @license
 * Copyright 2025 Gemini CLI
 * SPDX-License-Identifier: MIT
 */

import type { AgentExecutor } from './AgentExecutor.js';
import type { WorkflowManager } from './WorkflowManager.js';
import type {
  WorkflowDefinition,
  WorkflowStep,
  WorkflowContext,
  WorkflowStepResult,
  WorkflowExecutionResult,
} from './types.js';
import { WorkflowError } from './types.js';
import type { UnifiedMessage } from '../adapters/base/types.js';
import { MessageRole } from '../adapters/base/types.js';

/**
 * Workflow Executor
 * Executes workflow steps sequentially, handling templates and conditions
 */
export class WorkflowExecutor {
  constructor(
    private agentExecutor: AgentExecutor,
    private workflowManager: WorkflowManager
  ) {}

  /**
   * Execute a workflow
   */
  async execute(
    workflowName: string,
    input: string,
    options?: {
      onStepStart?: (step: WorkflowStep, index: number, total: number) => void;
      onStepComplete?: (result: WorkflowStepResult) => void;
      onStepError?: (error: Error, step: WorkflowStep) => void;
      onToolCall?: (toolName: string, args: any, stepId: string) => void;
      onToolResult?: (toolName: string, result: any, stepId: string) => void;
      writeToMainSession?: boolean;
      customSummary?: (result: WorkflowExecutionResult) => string;
    }
  ): Promise<WorkflowExecutionResult> {
    const workflow = this.workflowManager.getWorkflow(workflowName);
    if (!workflow) {
      throw new WorkflowError(
        `Workflow '${workflowName}' not found`,
        'WORKFLOW_NOT_FOUND'
      );
    }

    const startTime = Date.now();
    const context: WorkflowContext = {
      workflowName,
      input,
      stepResults: new Map(),
      currentStepIndex: 0,
      startTime,
      metadata: {},
    };

    const results: WorkflowStepResult[] = [];
    let finalStatus: 'completed' | 'failed' | 'timeout' = 'completed';
    let finalError: string | undefined;

    try {
      // Execute each step
      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        context.currentStepIndex = i;

        // Notify step start
        if (options?.onStepStart) {
          options.onStepStart(step, i + 1, workflow.steps.length);
        }

        // Check if step should be executed (evaluate condition)
        if (step.when) {
          const shouldExecute = this.evaluateCondition(step.when, context);
          if (!shouldExecute) {
            const skippedResult: WorkflowStepResult = {
              stepId: step.id,
              agentName: step.agent,
              status: 'skipped',
              output: '',
              startTime: Date.now(),
              endTime: Date.now(),
            };
            results.push(skippedResult);
            context.stepResults.set(step.id, skippedResult);
            continue;
          }
        }

        // Execute step
        try {
          const result = await this.executeStep(step, context, workflow, options);
          results.push(result);
          context.stepResults.set(step.id, result);

          // Notify step complete
          if (options?.onStepComplete) {
            options.onStepComplete(result);
          }

          // Handle step failure
          if (result.status === 'failed') {
            const errorHandling = workflow.error_handling || {
              on_error: 'stop',
            };

            if (errorHandling.on_error === 'stop') {
              finalStatus = 'failed';
              finalError = `Step '${step.id}' failed: ${result.error}`;
              break;
            }
            // If 'continue', just move to next step
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          // Notify error
          if (options?.onStepError) {
            options.onStepError(
              error instanceof Error ? error : new Error(errorMessage),
              step
            );
          }

          const failedResult: WorkflowStepResult = {
            stepId: step.id,
            agentName: step.agent,
            status: 'failed',
            output: '',
            error: errorMessage,
            startTime: Date.now(),
            endTime: Date.now(),
          };
          results.push(failedResult);
          context.stepResults.set(step.id, failedResult);

          const errorHandling = workflow.error_handling || {
            on_error: 'stop',
          };
          if (errorHandling.on_error === 'stop') {
            finalStatus = 'failed';
            finalError = errorMessage;
            break;
          }
        }
      }

      // Check timeout
      if (workflow.timeout) {
        const duration = Date.now() - startTime;
        if (duration > workflow.timeout) {
          finalStatus = 'timeout';
          finalError = `Workflow exceeded timeout of ${workflow.timeout}ms`;
        }
      }
    } catch (error) {
      finalStatus = 'failed';
      finalError =
        error instanceof Error ? error.message : 'Unknown error occurred';
    }

    // Build final output
    const finalOutput = this.buildFinalOutput(results, workflow);

    const result: WorkflowExecutionResult = {
      workflowName,
      status: finalStatus,
      steps: results,
      output: finalOutput,
      error: finalError,
      duration: Date.now() - startTime,
    };

    // If requested, write summary to main session (hybrid mode for workflows)
    if (options?.writeToMainSession) {
      const contextManager = this.agentExecutor.getContextManager();

      const summaryText = options.customSummary
        ? options.customSummary(result)
        : this.buildWorkflowSummary(result);

      const summaryMessage: UnifiedMessage = {
        role: MessageRole.ASSISTANT,
        content: [{ type: 'text', text: summaryText }]
      };

      contextManager.addHybridSummary(`workflow_${workflowName}`, summaryMessage);
    }

    return result;
  }

  /**
   * Execute a single step (routes to sequential or parallel execution)
   */
  private async executeStep(
    step: WorkflowStep,
    context: WorkflowContext,
    workflow: WorkflowDefinition,
    options?: {
      onToolCall?: (toolName: string, args: any, stepId: string) => void;
      onToolResult?: (toolName: string, result: any, stepId: string) => void;
    }
  ): Promise<WorkflowStepResult> {
    // Route to parallel or sequential execution
    if (step.type === 'parallel') {
      return await this.executeParallelStep(step, context, workflow, options);
    } else {
      return await this.executeSequentialStep(step, context, workflow, options);
    }
  }

  /**
   * Execute a sequential step (single agent)
   */
  private async executeSequentialStep(
    step: WorkflowStep,
    context: WorkflowContext,
    workflow: WorkflowDefinition,
    options?: {
      onToolCall?: (toolName: string, args: any, stepId: string) => void;
      onToolResult?: (toolName: string, result: any, stepId: string) => void;
    }
  ): Promise<WorkflowStepResult> {
    const startTime = Date.now();

    try {
      // Validate required fields for sequential step
      if (!step.agent) {
        throw new WorkflowError(
          `Sequential step '${step.id}' missing required field: agent`,
          'INVALID_DEFINITION'
        );
      }
      if (!step.input) {
        throw new WorkflowError(
          `Sequential step '${step.id}' missing required field: input`,
          'INVALID_DEFINITION'
        );
      }

      // Render input template
      const renderedInput = this.renderTemplate(step.input, context);

      // Execute agent with tool callbacks
      const agentResult = await this.agentExecutor.execute(
        step.agent,
        renderedInput,
        {
          onToolCall: options?.onToolCall ? (toolName: string, args: any) => {
            options.onToolCall!(toolName, args, step.id);
          } : undefined,
          onToolResult: options?.onToolResult ? (toolName: string, result: any) => {
            options.onToolResult!(toolName, result, step.id);
          } : undefined,
        }
      );

      const output = agentResult.text || '';

      return {
        stepId: step.id,
        agentName: step.agent,
        status: 'completed',
        output,
        startTime,
        endTime: Date.now(),
        data: this.extractData(output, step.id),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        stepId: step.id,
        agentName: step.agent,
        status: 'failed',
        output: '',
        error: errorMessage,
        startTime,
        endTime: Date.now(),
      };
    }
  }

  /**
   * Execute a parallel step (multiple agents concurrently)
   */
  private async executeParallelStep(
    step: WorkflowStep,
    context: WorkflowContext,
    workflow: WorkflowDefinition,
    options?: {
      onToolCall?: (toolName: string, args: any, stepId: string) => void;
      onToolResult?: (toolName: string, result: any, stepId: string) => void;
    }
  ): Promise<WorkflowStepResult> {
    const startTime = Date.now();

    try {
      // Validate parallel step
      if (!step.parallel || step.parallel.length === 0) {
        throw new WorkflowError(
          `Parallel step '${step.id}' has no substeps`,
          'INVALID_DEFINITION'
        );
      }

      const parallelSteps = step.parallel;
      const parallelResults = new Map<string, WorkflowStepResult>();

      // Execute all substeps in parallel using Promise.allSettled
      const promises = parallelSteps.map(async (subStep) => {
        try {
          // Execute substep (always sequential inside parallel group)
          return await this.executeSequentialStep(subStep, context, workflow, options);
        } catch (error) {
          // Return failed result instead of throwing
          return {
            stepId: subStep.id,
            agentName: subStep.agent || 'unknown',
            status: 'failed' as const,
            output: '',
            error: error instanceof Error ? error.message : String(error),
            startTime: Date.now(),
            endTime: Date.now(),
          };
        }
      });

      const settledResults = await Promise.allSettled(promises);

      // Process results
      let successCount = 0;
      let failedCount = 0;
      const outputs: string[] = [];
      const errors: string[] = [];

      settledResults.forEach((settled, index) => {
        const subStep = parallelSteps[index];
        let result: WorkflowStepResult;

        if (settled.status === 'fulfilled') {
          result = settled.value;
        } else {
          // Promise rejected (shouldn't happen with our try-catch, but handle it)
          result = {
            stepId: subStep.id,
            agentName: subStep.agent || 'unknown',
            status: 'failed',
            output: '',
            error: settled.reason instanceof Error ? settled.reason.message : String(settled.reason),
            startTime,
            endTime: Date.now(),
          };
        }

        // Store result
        parallelResults.set(subStep.id, result);

        // Count successes and failures
        if (result.status === 'completed') {
          successCount++;
          outputs.push(`**${subStep.id}**: ${result.output}`);
        } else if (result.status === 'failed') {
          failedCount++;
          errors.push(`**${subStep.id}**: ${result.error}`);
        }
      });

      // Determine overall status based on error handling config
      const errorHandling = step.error_handling || {
        on_error: 'continue',
        min_success: parallelSteps.length, // All must succeed by default
      };

      const minSuccess = errorHandling.min_success || parallelSteps.length;
      const overallSuccess = successCount >= minSuccess;

      // Build aggregated output
      let aggregatedOutput = `# Parallel Group: ${step.id}\n\n`;
      aggregatedOutput += `**Results**: ${successCount}/${parallelSteps.length} succeeded`;
      if (failedCount > 0) {
        aggregatedOutput += `, ${failedCount} failed`;
      }
      aggregatedOutput += `\n\n`;

      if (outputs.length > 0) {
        aggregatedOutput += `## Successful Results:\n\n${outputs.join('\n\n')}\n\n`;
      }

      if (errors.length > 0) {
        aggregatedOutput += `## Errors:\n\n${errors.join('\n\n')}\n\n`;
      }

      // Return parallel group result
      return {
        stepId: step.id,
        status: overallSuccess ? 'completed' : 'failed',
        output: aggregatedOutput,
        error: overallSuccess ? undefined : `Only ${successCount}/${parallelSteps.length} succeeded, required: ${minSuccess}`,
        startTime,
        endTime: Date.now(),
        parallelResults,
        data: {
          success_count: successCount,
          failed_count: failedCount,
          total_count: parallelSteps.length,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        stepId: step.id,
        status: 'failed',
        output: '',
        error: errorMessage,
        startTime,
        endTime: Date.now(),
      };
    }
  }

  /**
   * Evaluate a condition expression
   * Simple implementation: supports basic comparisons
   */
  private evaluateCondition(
    condition: string,
    context: WorkflowContext
  ): boolean {
    try {
      // Replace template variables first
      const renderedCondition = this.renderTemplate(condition, context);

      // Very basic evaluation - just check if the string is truthy
      // In a full implementation, you'd use a safe expression evaluator
      // For now, support simple patterns like:
      // - "true" / "false"
      // - "${stepId.data.someValue}" (already rendered)

      const trimmed = renderedCondition.trim().toLowerCase();

      if (trimmed === 'true' || trimmed === '1') {
        return true;
      }
      if (trimmed === 'false' || trimmed === '0' || trimmed === '') {
        return false;
      }

      // If it's a number > 0, consider it true
      const num = Number(trimmed);
      if (!isNaN(num)) {
        return num > 0;
      }

      // Default: if the condition has any content, it's true
      return renderedCondition.length > 0;
    } catch (error) {
      console.error('Condition evaluation error:', error);
      return false;
    }
  }

  /**
   * Render template variables in a string
   * Supports:
   * - ${workflow.input}
   * - ${stepId.output}
   * - ${stepId.data.key}
   * - ${parallelGroupId.subStepId.output} (for parallel groups)
   * - ${parallelGroupId.subStepId.data.key}
   */
  private renderTemplate(template: string, context: WorkflowContext): string {
    let rendered = template;

    // Replace ${workflow.input}
    rendered = rendered.replace(/\$\{workflow\.input\}/g, context.input);

    // Replace ${parallelGroupId.subStepId.data.key} FIRST (most specific)
    const parallelDataRegex = /\$\{(\w+)\.(\w+)\.data\.(\w+)\}/g;
    rendered = rendered.replace(parallelDataRegex, (match, groupId, subStepId, key) => {
      const groupResult = context.stepResults.get(groupId);
      if (groupResult?.parallelResults) {
        const subResult = groupResult.parallelResults.get(subStepId);
        if (subResult?.data && key in subResult.data) {
          return String(subResult.data[key]);
        }
      }
      return '';
    });

    // Replace ${parallelGroupId.subStepId.output} (parallel group substep output)
    const parallelOutputRegex = /\$\{(\w+)\.(\w+)\.output\}/g;
    rendered = rendered.replace(parallelOutputRegex, (match, groupId, subStepId) => {
      const groupResult = context.stepResults.get(groupId);
      if (groupResult?.parallelResults) {
        const subResult = groupResult.parallelResults.get(subStepId);
        const output = subResult?.output || '';
        console.log(`[WorkflowExecutor] Resolved parallel template: ${match} → ${output.substring(0, 100)}...`);
        return output;
      }
      // If not a parallel group, leave it for the next regex to handle
      return match;
    });

    // Replace ${stepId.data.key} (normal step data)
    const dataRegex = /\$\{(\w+)\.data\.(\w+)\}/g;
    rendered = rendered.replace(dataRegex, (match, stepId, key) => {
      const result = context.stepResults.get(stepId);
      if (result?.data && key in result.data) {
        return String(result.data[key]);
      }
      return '';
    });

    // Replace ${stepId.output} (normal step output) - LAST
    const outputRegex = /\$\{(\w+)\.output\}/g;
    rendered = rendered.replace(outputRegex, (match, stepId) => {
      const result = context.stepResults.get(stepId);
      const output = result?.output || '';
      console.log(`[WorkflowExecutor] Resolved template: ${match} → ${output.substring(0, 100)}...`);
      return output;
    });

    console.log(`[WorkflowExecutor] Template rendering complete. Input length: ${template.length}, Output length: ${rendered.length}`);
    return rendered;
  }

  /**
   * Extract data from step output for use in templates
   * Simple implementation: looks for key-value patterns
   */
  private extractData(
    output: string,
    stepId: string
  ): Record<string, any> {
    const data: Record<string, any> = {};

    // Look for patterns like "issues_found: 3" or "status: success"
    const patterns = [
      /(\w+):\s*(\d+)/g, // numbers
      /(\w+):\s*"([^"]+)"/g, // quoted strings
      /(\w+):\s*'([^']+)'/g, // single quoted
      /(\w+):\s*(\w+)/g, // simple words
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(output)) !== null) {
        const key = match[1];
        const value = match[2];

        // Try to parse as number
        const numValue = Number(value);
        data[key] = isNaN(numValue) ? value : numValue;
      }
    }

    return data;
  }

  /**
   * Build final output from all step results
   */
  private buildFinalOutput(
    results: WorkflowStepResult[],
    workflow: WorkflowDefinition
  ): string {
    let output = `# Workflow: ${workflow.title}\n\n`;

    const completedSteps = results.filter((r) => r.status === 'completed');
    const failedSteps = results.filter((r) => r.status === 'failed');
    const skippedSteps = results.filter((r) => r.status === 'skipped');

    output += `**Summary**: ${completedSteps.length}/${results.length} steps completed`;
    if (failedSteps.length > 0) {
      output += `, ${failedSteps.length} failed`;
    }
    if (skippedSteps.length > 0) {
      output += `, ${skippedSteps.length} skipped`;
    }
    output += `\n\n---\n\n`;

    // Include output from each completed step
    results.forEach((result, index) => {
      const step = workflow.steps.find((s) => s.id === result.stepId);
      if (!step) return;

      output += `## Step ${index + 1}: ${step.description || step.id}\n`;
      output += `**Agent**: ${result.agentName}\n`;
      output += `**Status**: ${result.status}\n\n`;

      if (result.status === 'completed' && result.output) {
        output += result.output + '\n\n';
      } else if (result.status === 'failed' && result.error) {
        output += `**Error**: ${result.error}\n\n`;
      } else if (result.status === 'skipped') {
        output += `*Skipped (condition not met)*\n\n`;
      }

      output += `---\n\n`;
    });

    return output;
  }

  /**
   * Build workflow execution summary for main session (hybrid mode)
   *
   * @param result - Workflow execution result
   * @returns Summary text
   */
  private buildWorkflowSummary(result: WorkflowExecutionResult): string {
    let summary = `# Workflow: ${result.workflowName}\n\n`;
    summary += `**Status**: ${result.status}\n`;
    summary += `**Duration**: ${result.duration}ms\n`;
    summary += `**Steps Completed**: ${result.steps.filter(s => s.status === 'completed').length}/${result.steps.length}\n\n`;

    if (result.status === 'failed' && result.error) {
      summary += `**Error**: ${result.error}\n\n`;
    }

    summary += `## Results\n\n`;
    summary += result.output;

    return summary;
  }
}
