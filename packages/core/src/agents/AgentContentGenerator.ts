/**
 * @license
 * Copyright 2025 Gemini CLI
 * SPDX-License-Identifier: MIT
 */

import type { ModelService } from '../services/modelService.js';
import type { UnifiedRequest } from '../adapters/base/types.js';
import { MessageRole } from '../adapters/base/types.js';

export interface GeneratedAgentContent {
  systemPrompt: string;
  role: string;
  responsibilities: string[];
  workflow: string[];
  guidelines: string[];
  examples: string[];
  constraints: string[];
}

/**
 * Generates agent content using AI based on a purpose description
 */
export class AgentContentGenerator {
  constructor(private modelService: ModelService) {}

  async generateContent(
    purpose: string,
    agentName: string,
    agentTitle: string,
  ): Promise<GeneratedAgentContent> {
    const prompt = this.buildPrompt(purpose, agentName, agentTitle);

    const request: UnifiedRequest = {
      messages: [
        {
          role: MessageRole.USER,
          content: [{ type: 'text', text: prompt }],
        },
      ],
      systemMessage:
        'You are an expert at designing AI agent specifications. Generate clear, concise, and actionable agent definitions.',
    };

    // Call the model service
    const response = await this.modelService.generateContent(request);

    // Extract text from response
    const textParts = response.content.filter(
      (part: any) => part.type === 'text',
    );
    const generatedText = textParts.map((p: any) => p.text).join('\n');

    return this.parseGeneratedContent(generatedText);
  }

  private buildPrompt(
    purpose: string,
    agentName: string,
    agentTitle: string,
  ): string {
    return `You are creating an AI agent specification.

**Agent Details:**
- Name: ${agentName}
- Title: ${agentTitle}
- Purpose: ${purpose}

Please generate a complete agent specification in the following format:

# Role
[A clear description of the agent's role in 2-3 sentences.
Include what the agent does and its primary focus areas.]

## Responsibilities
[List 4-5 specific, actionable responsibilities. Each should be concrete.
Format: "- **Category**: Brief action description (1 sentence)"]

## Workflow
[Describe 3-4 key steps this agent follows when working on a task.
Use numbered list format: "1. Brief step description"]

## Guidelines
[List 3-4 operational guidelines explaining HOW the agent should work.
Keep each guideline to 1 sentence.]

## Examples
[Provide 2 concrete examples showing: Input → Action → Output.
Keep each example brief (1-2 lines). Use bullet points starting with "- "]

## Constraints
[List 2-3 clear limitations. What the agent should NOT do.
Keep each constraint to 1 sentence.]

**Note**: A "Response Format" section will be automatically added to prevent infinite tool calling loops. You don't need to include it in your output.

**Critical Requirements:**
1. **Length Control**: Target total length ~500 words
   - Role: 2-3 sentences (~60 words)
   - Responsibilities: 4-5 items (~15 words each = 75 words)
   - Workflow: 3-4 steps (~20 words each = 80 words)
   - Guidelines: 3-4 items (~20 words each = 80 words)
   - Examples: 2 scenarios (~40 words each = 80 words)
   - Constraints: 2-3 items (~20 words each = 60 words)

2. **Conciseness**: Be specific but concise
   - ✅ "Analyze Python traceback to identify exception type"
   - ❌ Long explanations with excessive detail

3. **Structure**: Use the EXACT format shown above
   - Use "## " for section headers
   - Use "- " for list items in Responsibilities, Guidelines, Examples, Constraints
   - Use numbered lists (1. 2. 3...) ONLY for Workflow
   - Use bold (**text**) for category labels in responsibilities

4. **Focus**: Base all content on: ${purpose}

Generate concise, high-quality content now:`;
  }

  private parseGeneratedContent(text: string): GeneratedAgentContent {
    const lines = text.split('\n');
    let role = '';
    const responsibilities: string[] = [];
    const workflow: string[] = [];
    const guidelines: string[] = [];
    const examples: string[] = [];
    const constraints: string[] = [];

    let currentSection: 'role' | 'responsibilities' | 'workflow' | 'guidelines' | 'examples' | 'constraints' | null = null;
    let roleLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('# Role')) {
        currentSection = 'role';
        continue;
      } else if (trimmed.startsWith('## Responsibilities')) {
        currentSection = 'responsibilities';
        continue;
      } else if (trimmed.startsWith('## Workflow')) {
        currentSection = 'workflow';
        continue;
      } else if (trimmed.startsWith('## Guidelines')) {
        currentSection = 'guidelines';
        continue;
      } else if (trimmed.startsWith('## Examples')) {
        currentSection = 'examples';
        continue;
      } else if (trimmed.startsWith('## Constraints')) {
        currentSection = 'constraints';
        continue;
      }

      if (!trimmed || trimmed.startsWith('#')) continue;

      if (currentSection === 'role') {
        roleLines.push(trimmed);
      } else if (currentSection === 'responsibilities' && trimmed.startsWith('-')) {
        responsibilities.push(trimmed.substring(1).trim());
      } else if (currentSection === 'workflow' && /^\d+\./.test(trimmed)) {
        // Parse numbered list items for workflow (e.g., "1. Step description")
        workflow.push(trimmed.replace(/^\d+\.\s*/, '').trim());
      } else if (currentSection === 'guidelines' && trimmed.startsWith('-')) {
        guidelines.push(trimmed.substring(1).trim());
      } else if (currentSection === 'examples' && trimmed.startsWith('-')) {
        examples.push(trimmed.substring(1).trim());
      } else if (currentSection === 'constraints' && trimmed.startsWith('-')) {
        constraints.push(trimmed.substring(1).trim());
      }
    }

    role = roleLines.join(' ').trim();

    // Build system prompt
    const systemPrompt = this.buildSystemPrompt(
      role,
      responsibilities,
      workflow,
      guidelines,
      examples,
      constraints,
    );

    return {
      systemPrompt,
      role,
      responsibilities,
      workflow,
      guidelines,
      examples,
      constraints,
    };
  }

  private buildSystemPrompt(
    role: string,
    responsibilities: string[],
    workflow: string[],
    guidelines: string[],
    examples: string[],
    constraints: string[],
  ): string {
    let prompt = `# Role\n\n${role}\n\n`;

    if (responsibilities.length > 0) {
      prompt += `## Responsibilities\n\n`;
      for (const resp of responsibilities) {
        prompt += `- ${resp}\n`;
      }
      prompt += '\n';
    }

    if (workflow.length > 0) {
      prompt += `## Workflow\n\n`;
      workflow.forEach((step, index) => {
        prompt += `${index + 1}. ${step}\n`;
      });
      prompt += '\n';
    }

    if (guidelines.length > 0) {
      prompt += `## Guidelines\n\n`;
      for (const guide of guidelines) {
        prompt += `- ${guide}\n`;
      }
      prompt += '\n';
    }

    if (examples.length > 0) {
      prompt += `## Examples\n\n`;
      for (const example of examples) {
        prompt += `- ${example}\n`;
      }
      prompt += '\n';
    }

    if (constraints.length > 0) {
      prompt += `## Constraints\n\n`;
      for (const constraint of constraints) {
        prompt += `- ${constraint}\n`;
      }
      prompt += '\n';
    }

    // Always add Response Format section to prevent infinite tool calling loops
    prompt += `## Response Format\n\n`;
    prompt += `**CRITICAL**: After gathering necessary information through tool calls, you MUST provide a final text response. Follow this structure:\n\n`;
    prompt += `1. **Use tools** to collect relevant data (if applicable)\n`;
    prompt += `2. **Analyze** the collected information\n`;
    prompt += `3. **STOP calling tools** and provide a comprehensive text summary\n\n`;
    prompt += `Your final response should be clear, actionable, and directly answer the user's question.\n\n`;
    prompt += `**Important**: Do NOT continue calling tools indefinitely. Once you have sufficient information to answer the user's question, provide your analysis as text and stop.`;

    return prompt.trim();
  }
}
