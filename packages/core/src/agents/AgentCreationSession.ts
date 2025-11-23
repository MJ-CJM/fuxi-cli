/**
 * @license
 * Copyright 2025 Gemini CLI
 * SPDX-License-Identifier: MIT
 */

import {
  ToolCategory,
  TOOL_CATEGORIES,
  getToolsForCategories,
  getCategoryDisplayText,
} from './ToolCategories.js';

/**
 * Agent Creation Session - Multi-step interactive creation state
 *
 * This class manages the state for creating an agent through multiple steps:
 * 1. Name
 * 2. Title (optional)
 * 3. Description (required)
 * 4. Scope (project/global)
 * 5. Model selection
 * 6. Context mode (isolated/shared)
 * 7. Content creation method (manual/AI)
 * 8. Purpose (for AI generation)
 * 9. Tool categories selection
 * 10. Final confirmation
 */

export enum CreationStep {
  NAME = 'name',
  TITLE = 'title',
  DESCRIPTION = 'description',
  SCOPE = 'scope',
  MODEL = 'model',
  CONTEXT_MODE = 'context_mode',
  CONTENT_METHOD = 'content_method',
  PURPOSE = 'purpose',
  TOOL_CATEGORIES = 'tool_categories',
  CONFIRM = 'confirm',
  COMPLETE = 'complete',
}

export interface AgentCreationState {
  // Session metadata
  sessionId: string;
  currentStep: CreationStep;
  createdAt: number;

  // Agent configuration
  name?: string;
  title?: string;
  description?: string;
  scope?: 'project' | 'global';
  model?: string;
  contextMode?: 'isolated' | 'shared' | 'hybrid';
  contentMethod?: 'manual' | 'ai';
  purpose?: string;
  toolCategories?: ToolCategory[];
  allowTools?: string[];
  denyTools?: string[];

  // AI generation result
  generatedContent?: string;
}

export class AgentCreationSession {
  private state: AgentCreationState;

  constructor(sessionId?: string) {
    this.state = {
      sessionId: sessionId || this.generateSessionId(),
      currentStep: CreationStep.NAME,
      createdAt: Date.now(),
    };
  }

  private generateSessionId(): string {
    return `agent-create-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Get the current step in the creation process
   */
  getCurrentStep(): CreationStep {
    return this.state.currentStep;
  }

  /**
   * Get the current state
   */
  getState(): Readonly<AgentCreationState> {
    return { ...this.state };
  }

  /**
   * Set the agent name and move to next step
   */
  setName(name: string): CreationStep {
    this.state.name = name;
    this.state.currentStep = CreationStep.TITLE;
    return this.state.currentStep;
  }

  /**
   * Set the title (optional) and move to next step
   */
  setTitle(title: string): CreationStep {
    this.state.title = title;
    this.state.currentStep = CreationStep.DESCRIPTION;
    return this.state.currentStep;
  }

  /**
   * Skip title (use default) and move to next step
   */
  skipTitle(): CreationStep {
    // Auto-generate title from name if not provided
    if (!this.state.title && this.state.name) {
      this.state.title = this.generateTitleFromName(this.state.name);
    }
    this.state.currentStep = CreationStep.DESCRIPTION;
    return this.state.currentStep;
  }

  /**
   * Set the description (required) and move to next step
   */
  setDescription(description: string): CreationStep {
    this.state.description = description;
    this.state.currentStep = CreationStep.SCOPE;
    return this.state.currentStep;
  }

  /**
   * Skip description (will be filled from purpose in AI mode)
   */
  skipDescription(): CreationStep {
    // Leave description empty for now, will be filled from purpose in AI mode
    this.state.currentStep = CreationStep.SCOPE;
    return this.state.currentStep;
  }

  /**
   * Update description without advancing step (for AI mode fallback)
   */
  updateDescription(description: string): void {
    this.state.description = description;
  }

  /**
   * Set the scope and move to next step
   */
  setScope(scope: 'project' | 'global'): CreationStep {
    this.state.scope = scope;
    this.state.currentStep = CreationStep.MODEL;
    return this.state.currentStep;
  }

  /**
   * Set the model and move to next step
   */
  setModel(model: string): CreationStep {
    this.state.model = model;
    this.state.currentStep = CreationStep.CONTEXT_MODE;
    return this.state.currentStep;
  }

  /**
   * Set the context mode and move to next step
   */
  setContextMode(mode: 'isolated' | 'shared' | 'hybrid'): CreationStep {
    this.state.contextMode = mode;
    this.state.currentStep = CreationStep.CONTENT_METHOD;
    return this.state.currentStep;
  }

  /**
   * Skip context mode (use default: isolated) and move to next step
   */
  skipContextMode(): CreationStep {
    // Use default: isolated
    this.state.contextMode = 'isolated';
    this.state.currentStep = CreationStep.CONTENT_METHOD;
    return this.state.currentStep;
  }

  /**
   * Set content creation method and move to appropriate next step
   */
  setContentMethod(method: 'manual' | 'ai'): CreationStep {
    this.state.contentMethod = method;

    if (method === 'ai') {
      // AI needs purpose
      this.state.currentStep = CreationStep.PURPOSE;
    } else {
      // Manual template, skip to tool categories
      this.state.currentStep = CreationStep.TOOL_CATEGORIES;
    }

    return this.state.currentStep;
  }

  /**
   * Set the purpose for AI generation and move to next step
   */
  setPurpose(purpose: string): CreationStep {
    this.state.purpose = purpose;
    this.state.currentStep = CreationStep.TOOL_CATEGORIES;
    return this.state.currentStep;
  }

  /**
   * Set tool categories and move to confirmation
   */
  setToolCategories(categories: ToolCategory[]): CreationStep {
    this.state.toolCategories = categories;
    // Convert categories to actual tools
    this.state.allowTools = getToolsForCategories(categories);
    this.state.denyTools = [];
    this.state.currentStep = CreationStep.CONFIRM;
    return this.state.currentStep;
  }

  /**
   * Skip tool configuration (use safe defaults) and move to confirmation
   */
  skipToolCategories(): CreationStep {
    // Use safe read-only tools by default
    this.state.toolCategories = [ToolCategory.READ];
    this.state.allowTools = getToolsForCategories([ToolCategory.READ]);
    this.state.denyTools = [];
    this.state.currentStep = CreationStep.CONFIRM;
    return this.state.currentStep;
  }

  /**
   * Set AI generated content (after generation)
   */
  setGeneratedContent(content: string): void {
    this.state.generatedContent = content;
  }

  /**
   * Mark creation as complete
   */
  markComplete(): void {
    this.state.currentStep = CreationStep.COMPLETE;
  }

  /**
   * Check if all required fields are filled
   */
  isReadyToCreate(): boolean {
    if (!this.state.name || !this.state.scope || !this.state.model) {
      return false;
    }

    if (this.state.contentMethod === 'ai' && !this.state.purpose) {
      return false;
    }

    return true;
  }

  /**
   * Reset the session
   */
  reset(): void {
    this.state = {
      sessionId: this.generateSessionId(),
      currentStep: CreationStep.NAME,
      createdAt: Date.now(),
    };
  }

  /**
   * Serialize state to JSON
   */
  toJSON(): string {
    return JSON.stringify(this.state);
  }

  /**
   * Restore from JSON
   */
  static fromJSON(json: string): AgentCreationSession {
    const state = JSON.parse(json) as AgentCreationState;
    const session = new AgentCreationSession(state.sessionId);
    session.state = state;
    return session;
  }

  private generateTitleFromName(name: string): string {
    return name
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get prompt text for current step
   * @param availableModels - Optional list of available models for model selection step
   */
  getPromptForCurrentStep(availableModels?: Array<{ id: string; name: string; description?: string }> | null): string {
    switch (this.state.currentStep) {
      case CreationStep.NAME:
        return `📝 **Step 1/9: Agent Name**

Enter the agent name (lowercase letters, numbers, hyphens, underscores):
Examples: "my-agent", "code_reviewer", "debug-helper"`;

      case CreationStep.TITLE:
        return `📝 **Step 2/9: Display Title** (Optional)

Current name: ${this.state.name}
Suggested title: ${this.generateTitleFromName(this.state.name || '')}

Enter a custom title or press Enter to use the suggestion:`;

      case CreationStep.DESCRIPTION:
        return `📝 **Step 3/9: Description** (Optional)

Name: ${this.state.name}
Title: ${this.state.title}

Enter a short description or press Enter to skip:`;

      case CreationStep.SCOPE:
        return `📝 **Step 4/9: Scope**

Where should this agent be saved?

Reply with:
  **1** or **project** - Project (.gemini/agents/) - Only this project
  **2** or **global** - Global (~/.gemini/agents/) - All projects

Enter your choice:`;

      case CreationStep.MODEL:
        const models = availableModels || AgentCreationSession.getAvailableModels();
        const modelList = models.map((m, i) => {
          const desc = m.description ? ` (${m.description})` : '';
          return `  **${i + 1}** - ${m.name}${desc}`;
        }).join('\n');

        return `📝 **Step 5/9: Model Selection**

Choose the AI model for this agent:

${modelList}

Enter 1-${models.length} or model name:`;

      case CreationStep.CONTEXT_MODE:
        return `📝 **Step 6/9: Context Mode** (Optional)

How should this agent manage conversation context?

  **1** or **isolated** - Isolated ⭐ (Default)
    • Agent has its own independent conversation history
    • Messages are separate from main CLI session
    • Best for specialized tasks

  **2** or **shared** - Shared
    • Agent references the main session conversation history
    • All messages (including tool calls) are added to main session
    • Can see the full context but may clutter main conversation

  **3** or **hybrid** - Hybrid 🔥 (Recommended for automation)
    • Agent reads from main session (sees context)
    • Executes in isolated context (clean tool calls)
    • Only writes final summary to main session (no clutter)
    • Ideal for plan-todos, spec tasks, workflows

Enter your choice (or press Enter for isolated):`;

      case CreationStep.CONTENT_METHOD:
        return `📝 **Step 7/9: Content Creation Method**

How would you like to create the agent content?

  **1** or **ai** - AI Generate ⭐ - Describe purpose, AI creates content
  **2** or **manual** - Manual Template - Create empty template to fill yourself

Enter your choice:`;

      case CreationStep.PURPOSE:
        return `📝 **Step 8/9: Agent Purpose** (for AI generation)

Describe in detail what this agent should do.

Be specific! Good examples:
  ✅ "Debug Python and JavaScript errors with detailed explanations and step-by-step solutions"
  ✅ "Review code for security vulnerabilities following OWASP top 10 guidelines"
  ❌ "Debug code" (too vague)

Enter the purpose:`;

      case CreationStep.TOOL_CATEGORIES:
        const categoryList = TOOL_CATEGORIES.map((cat, i) => {
          const safeTag = cat.requiresConfirmation ? '' : ' (safe)';
          const toolList = cat.tools.join(', ');
          return `  **${i + 1}** - ${cat.name}${safeTag}\n    ${cat.description}\n    Tools: ${toolList}`;
        }).join('\n\n');

        return `📝 **Step 9/9: Tool Categories** (Optional)

Choose which types of tools this agent can use:

${categoryList}

**How to select:**
  - Enter numbers (e.g., "1" for Read only, "1 2" for Read + Write, "1 2 3" for Read + Write + Execute)
  - Press Enter to use safe defaults (Read only)

**Recommendations:**
  ✅ Read-only agents: Enter "1" (safest)
  ⚠️  Code modification agents: Enter "1 2" (Read + Write)
  ⚠️  Full access agents: Enter "1 2 3" (Read + Write + Execute)

Enter your choice (space-separated numbers):`;

      case CreationStep.CONFIRM:
        return this.getConfirmationPrompt();

      default:
        return '';
    }
  }

  private getConfirmationPrompt(): string {
    const lines = ['📋 **Review Your Configuration:**', ''];

    lines.push(`  Name:        ${this.state.name}`);
    lines.push(`  Title:       ${this.state.title}`);
    lines.push(`  Description: ${this.state.description || '(none)'}`);
    lines.push(`  Scope:       ${this.state.scope}`);
    lines.push(`  Model:       ${this.state.model}`);
    lines.push(`  Context Mode: ${this.state.contextMode || 'isolated'}`);
    lines.push(`  Method:      ${this.state.contentMethod === 'ai' ? 'AI Generated' : 'Manual Template'}`);

    if (this.state.contentMethod === 'ai' && this.state.purpose) {
      lines.push(`  Purpose:     ${this.state.purpose}`);
    }

    // Show tool categories and actual tools
    if (this.state.toolCategories && this.state.toolCategories.length > 0) {
      const categoryText = getCategoryDisplayText(this.state.toolCategories);
      lines.push(`  Tool Categories: ${categoryText}`);

      const tools = this.state.allowTools || [];
      if (tools.length > 0) {
        lines.push(`  Allowed Tools:   ${tools.join(', ')}`);
      }
    } else {
      const tools = this.state.allowTools || getToolsForCategories([ToolCategory.READ]);
      lines.push(`  Tools:       ${tools.join(', ')}`);
    }

    lines.push('');
    lines.push('Reply with:');
    lines.push('  **yes** - Create this agent');
    lines.push('  **no** - Cancel');
    lines.push('  **edit <field>** - Modify a field (e.g., "edit name")');

    return lines.join('\n');
  }

  /**
   * Get available model options
   */
  static getAvailableModels(): Array<{ id: string; name: string; description: string }> {
    return [
      { id: '1', name: 'gemini-2.0-flash', description: 'Fast, efficient (Recommended)' },
      { id: '2', name: 'gemini-2.0-flash-exp', description: 'Experimental features' },
      { id: '3', name: 'gemini-1.5-pro', description: 'More capable, slower' },
      { id: '4', name: 'claude-3.5-sonnet', description: 'Anthropic Claude' },
      { id: '5', name: 'gpt-4o', description: 'OpenAI GPT-4' },
      { id: '6', name: 'qwen-coder-turbo', description: 'Coding specialist' },
    ];
  }

  /**
   * Parse model choice (number or name) to model name
   * @param choice - The user's input (number or model name)
   * @param availableModels - Optional list of available models. If not provided, uses default models.
   */
  static parseModelChoice(
    choice: string,
    availableModels?: Array<{ id: string; name: string; description?: string }> | null
  ): string | null {
    const models = availableModels || this.getAvailableModels();
    const input = choice.trim().toLowerCase();

    // Try to match by number (id)
    const numMatch = models.find((m) => m.id === input);
    if (numMatch) return numMatch.name;

    // Try to match by index (1-based)
    const index = parseInt(input, 10);
    if (!isNaN(index) && index >= 1 && index <= models.length) {
      return models[index - 1].name;
    }

    // Try to match by name (case-insensitive)
    const nameMatch = models.find((m) => m.name.toLowerCase() === input);
    if (nameMatch) return nameMatch.name;

    return null;
  }
}
