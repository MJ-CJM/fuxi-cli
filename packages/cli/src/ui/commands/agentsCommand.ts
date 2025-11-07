/**
 * @license
 * Copyright 2025 Gemini CLI
 * SPDX-License-Identifier: MIT
 */

import {
  AgentContentGenerator,
} from '@google/gemini-cli-core';
import { MessageType, ToolCallStatus, type IndividualToolCallDisplay } from '../types.js';
import {
  type CommandContext,
  type SlashCommand,
  CommandKind,
} from './types.js';

/**
 * Get AgentManager from config's AgentExecutor
 */
async function getAgentManager(context: CommandContext) {
  if (!context.services.config) {
    throw new Error('Config not available');
  }
  const executor = await context.services.config.getAgentExecutor();
  return executor.getAgentManager();
}

/**
 * Get available models from config
 */
function getAvailableModelsFromConfig(
  context: CommandContext
): Array<{ id: string; name: string; description?: string }> {
  const config = context.services.config;
  const models: Array<{ id: string; name: string; description?: string }> = [];

  if (config) {
    try {
      // Get custom models from Config.getCustomModels()
      const customModels = config.getCustomModels();
      const modelNames = Object.keys(customModels);
      const defaultModel = config.getModel();

      // Add default model first if it exists in custom models
      if (defaultModel && modelNames.includes(defaultModel)) {
        const modelDef = customModels[defaultModel];
        models.push({
          id: '1',
          name: defaultModel,
          description: `Default ⭐ - ${modelDef.provider || 'custom'}`,
        });
      }

      // Add other custom models
      modelNames.forEach((modelName: string) => {
        if (modelName !== defaultModel) {
          const modelDef = customModels[modelName];
          models.push({
            id: String(models.length + 1),
            name: modelName,
            description: modelDef.provider || 'custom',
          });
        }
      });
    } catch (error) {
      console.error('Error getting custom models:', error);
    }
  }

  // If no models found, return defaults
  if (models.length === 0) {
    return [
      { id: '1', name: 'gemini-2.0-flash', description: 'Recommended - Fast, efficient' },
      { id: '2', name: 'gemini-2.0-flash-exp', description: 'Experimental features' },
      { id: '3', name: 'gemini-1.5-pro', description: 'More capable, slower' },
      { id: '4', name: 'claude-3.5-sonnet', description: 'Anthropic Claude' },
      { id: '5', name: 'gpt-4o', description: 'OpenAI GPT-4' },
      { id: '6', name: 'qwen-coder-turbo', description: 'Coding specialist' },
    ];
  }

  return models;
}

export const agentsCommand: SlashCommand = {
  name: 'agents',
  description: 'Manage specialized AI agents - create, list, info, validate, delete, run, clear, context, route, config',
  kind: CommandKind.BUILT_IN,
  subCommands: [
    {
      name: 'list',
      description: 'List all available agents',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext) => {
        try {
          // Get AgentManager from executor
          const agentManager = await getAgentManager(context);

          const agents = agentManager.listAgents();

          if (agents.length === 0) {
            context.ui.addItem(
              {
                type: MessageType.INFO,
                text: 'No agents found. Create one with: /agents create <name>',
              },
              Date.now()
            );
            return;
          }

          // Group by scope
          const globalAgents = agents.filter((a) => a.scope === 'global');
          const projectAgents = agents.filter((a) => a.scope === 'project');

          let message = `📋 Available Agents (${agents.length} total)\n\n`;

          if (projectAgents.length > 0) {
            message += '**Project Agents** (.gemini/agents/):\n';
            for (const agent of projectAgents) {
              message += `  • **${agent.name}** - ${agent.title}\n`;
              if (agent.description) {
                message += `    ${agent.description}\n`;
              }
              if (agent.model) {
                message += `    Model: ${agent.model}\n`;
              }
            }
            message += '\n';
          }

          if (globalAgents.length > 0) {
            message += '**Global Agents** (~/.gemini/agents/):\n';
            for (const agent of globalAgents) {
              message += `  • **${agent.name}** - ${agent.title}\n`;
              if (agent.description) {
                message += `    ${agent.description}\n`;
              }
              if (agent.model) {
                message += `    Model: ${agent.model}\n`;
              }
            }
          }

          context.ui.addItem(
            {
              type: MessageType.INFO,
              text: message.trim(),
            },
            Date.now()
          );
        } catch (error) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: `Failed to list agents: ${error instanceof Error ? error.message : String(error)}`,
            },
            Date.now()
          );
        }
      },
    },

    {
      name: 'create',
      description: 'Create a new agent: /agents create <name> [options] OR /agents create --interactive',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext, args?: string) => {
        try {
          // Check for interactive mode
          if (args && (args.trim() === '--interactive' || args.trim() === '-i')) {
            // Start interactive mode
            const { AgentCreationSession } = await import('@google/gemini-cli-core');
            const {
              saveSession,
            } = await import('../../services/AgentCreationSessionStore.js');

            const session = new AgentCreationSession();
            const state = session.getState();
            const sessionId = state.sessionId;

            // Save session to store
            saveSession(sessionId, session);

            // Get available models from config
            const availableModels = getAvailableModelsFromConfig(context);

            // Get first prompt
            const prompt = session.getPromptForCurrentStep(availableModels);

            context.ui.addItem(
              {
                type: MessageType.INFO,
                text: `🎬 **Interactive Agent Creation Started!**

Session ID: \`${sessionId}\`

${prompt}

${'━'.repeat(70)}

**To continue, reply with:**
\`\`\`
/agents create --next ${sessionId} <your-answer>
\`\`\`

**Tips:**
  - Press Enter alone to skip optional fields
  - Use \`/agents create --status ${sessionId}\` to see current progress
  - Use \`/agents create --cancel ${sessionId}\` to cancel

${'━'.repeat(70)}
`,
              },
              Date.now()
            );
            return;
          }

          // Check for --next flag (interactive continuation)
          if (args && args.trim().startsWith('--next ')) {
            const {
              AgentCreationSession,
              CreationStep,
              AgentContentGenerator,
              ModelService,
            } = await import('@google/gemini-cli-core');
            const {
              loadSession,
              saveSession,
              deleteSession,
            } = await import('../../services/AgentCreationSessionStore.js');

            const parts = args.trim().substring(7).split(/\s+/); // Remove '--next '
            const sessionId = parts[0];
            const input = parts.slice(1).join(' ').trim();

            // Load session
            const session = loadSession(sessionId);
            if (!session) {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text: `❌ Session \`${sessionId}\` not found. Start a new session with \`/agents create --interactive\``,
                },
                Date.now()
              );
              return;
            }

            const currentStep = session.getCurrentStep();
            const state = session.getState();
            let error: string | null = null;
            let skipToNext = false;

            // Process input based on current step
            switch (currentStep) {
              case CreationStep.NAME:
                if (!input) {
                  error = 'Agent name is required.';
                } else if (!/^[a-z][a-z0-9_-]*$/.test(input)) {
                  error = 'Invalid name format. Use lowercase letters, numbers, hyphens, and underscores only.';
                } else {
                  session.setName(input);
                }
                break;

              case CreationStep.TITLE:
                if (input) {
                  session.setTitle(input);
                } else {
                  session.skipTitle();
                  skipToNext = true;
                }
                break;

              case CreationStep.DESCRIPTION:
                if (input) {
                  session.setDescription(input);
                } else {
                  session.skipDescription();
                  skipToNext = true;
                }
                break;

              case CreationStep.SCOPE:
                const scopeInput = input.toLowerCase();
                if (scopeInput === '1' || scopeInput === 'project') {
                  session.setScope('project');
                } else if (scopeInput === '2' || scopeInput === 'global') {
                  session.setScope('global');
                } else {
                  error = 'Please enter 1/project (project) or 2/global (global).';
                }
                break;

              case CreationStep.MODEL:
                const availableModels = getAvailableModelsFromConfig(context);
                const model = AgentCreationSession.parseModelChoice(input, availableModels);
                if (model) {
                  session.setModel(model);
                } else {
                  error = `Please enter a valid model number (1-${availableModels.length}) or model name.`;
                }
                break;

              case CreationStep.CONTEXT_MODE:
                if (!input) {
                  // Empty input = use default (isolated)
                  session.skipContextMode();
                  skipToNext = true;
                } else {
                  const contextModeInput = input.toLowerCase();
                  if (contextModeInput === '1' || contextModeInput === 'isolated') {
                    session.setContextMode('isolated');
                  } else if (contextModeInput === '2' || contextModeInput === 'shared') {
                    session.setContextMode('shared');
                  } else {
                    error = 'Please enter 1/isolated (Isolated) or 2/shared (Shared), or press Enter for default.';
                  }
                }
                break;

              case CreationStep.CONTENT_METHOD:
                const methodInput = input.toLowerCase();
                if (methodInput === '1' || methodInput === 'ai') {
                  session.setContentMethod('ai');
                } else if (methodInput === '2' || methodInput === 'manual') {
                  session.setContentMethod('manual');
                } else {
                  error = 'Please enter 1/ai (AI) or 2/manual (Manual).';
                }
                break;

              case CreationStep.PURPOSE:
                if (!input) {
                  error = 'Purpose description is required for AI generation.';
                } else if (input.length < 10) {
                  error = 'Purpose description is too short. Please provide more detail (at least 10 characters).';
                } else {
                  session.setPurpose(input);

                  // Generate AI content immediately
                  if (state.contentMethod === 'ai' && context.services.config) {
                    context.ui.addItem(
                      {
                        type: MessageType.INFO,
                        text: '🤖 **Generating AI content...**\n\nThis may take a few seconds...',
                      },
                      Date.now()
                    );

                    try {
                      const modelService = new ModelService(context.services.config);
                      const generator = new AgentContentGenerator(modelService);
                      const generated = await generator.generateContent(
                        input,
                        state.name!,
                        state.title!
                      );

                      session.setGeneratedContent(generated.systemPrompt);

                      context.ui.addItem(
                        {
                          type: MessageType.INFO,
                          text: `✨ **AI Generated Content:**

${'─'.repeat(70)}
${generated.systemPrompt}
${'─'.repeat(70)}

📊 **Content Summary:**
  - Role: ${generated.role.substring(0, 60)}${generated.role.length > 60 ? '...' : ''}
  - Responsibilities: ${generated.responsibilities.length} items
  - Workflow: ${generated.workflow.length} steps
  - Guidelines: ${generated.guidelines.length} items
  - Examples: ${generated.examples.length} scenarios
  - Constraints: ${generated.constraints.length} items
`,
                        },
                        Date.now()
                      );
                    } catch (genError) {
                      error = `Failed to generate AI content: ${genError instanceof Error ? genError.message : String(genError)}`;
                    }
                  }
                }
                break;

              case CreationStep.TOOL_CATEGORIES:
                if (input) {
                  // Parse tool category selection (space-separated numbers)
                  const { TOOL_CATEGORIES } = await import('@google/gemini-cli-core');
                  const selections = input.trim().split(/\s+/);
                  const categories: any[] = [];

                  for (const sel of selections) {
                    const num = parseInt(sel, 10);
                    if (!isNaN(num) && num >= 1 && num <= TOOL_CATEGORIES.length) {
                      categories.push(TOOL_CATEGORIES[num - 1].category);
                    }
                  }

                  if (categories.length > 0) {
                    session.setToolCategories(categories);
                  } else {
                    error = `Please enter valid category numbers (1-${TOOL_CATEGORIES.length})`;
                  }
                } else {
                  // Use safe defaults (read-only)
                  session.skipToolCategories();
                  skipToNext = true;
                }
                break;

              case CreationStep.CONFIRM:
                const answer = input.toLowerCase();
                if (answer === 'yes' || answer === 'y') {
                  // Create the agent
                  try {
                    const finalState = session.getState();
                    const agentManager = await getAgentManager(context);

                    await agentManager.createAgent({
                      name: finalState.name!,
                      title: finalState.title!,
                      description: finalState.description,
                      model: finalState.model!,
                      contextMode: finalState.contextMode,
                      scope: finalState.scope!,
                      customSystemPrompt: finalState.generatedContent,
                      allowTools: finalState.allowTools || ['read_file', 'grep', 'glob', 'bash'],
                      denyTools: finalState.denyTools || [],
                    });

                    session.markComplete();
                    deleteSession(sessionId);

                    context.ui.addItem(
                      {
                        type: MessageType.INFO,
                        text: `✅ **Agent "${finalState.name}" Created Successfully!**

📁 **File Location:**
   ${finalState.scope === 'global' ? '~/' : ''}.gemini/agents/${finalState.name}.md

📝 **Next Steps:**
   1. Review: \`cat .gemini/agents/${finalState.name}.md\`
   2. Edit: \`vim .gemini/agents/${finalState.name}.md\`
   3. Validate: \`/agents validate ${finalState.name}\`
   4. Info: \`/agents info ${finalState.name}\`
   5. List: \`/agents list\`

${'━'.repeat(70)}

🎉 Your agent is ready to use!
`,
                      },
                      Date.now()
                    );
                    return;
                  } catch (createError) {
                    error = `Failed to create agent: ${createError instanceof Error ? createError.message : String(createError)}`;
                  }
                } else if (answer === 'no' || answer === 'n') {
                  deleteSession(sessionId);
                  context.ui.addItem(
                    {
                      type: MessageType.INFO,
                      text: '❌ Agent creation cancelled.',
                    },
                    Date.now()
                  );
                  return;
                } else {
                  error = 'Please enter "yes" (or "y") to create, or "no" (or "n") to cancel.';
                }
                break;

              default:
                error = 'Unknown step. Session may be corrupted.';
            }

            // If error, show it and don't advance
            if (error) {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text: `❌ ${error}

Please try again with the correct input.`,
                },
                Date.now()
              );
              return;
            }

            // Save updated session
            saveSession(sessionId, session);

            // Check if complete
            const nextStep = session.getCurrentStep();
            if (nextStep === CreationStep.COMPLETE) {
              return;
            }

            // Show next prompt
            const nextAvailableModels = getAvailableModelsFromConfig(context);
            const nextPrompt = session.getPromptForCurrentStep(nextAvailableModels);

            let continueText = '';
            if (!skipToNext) {
              continueText = `✅ Input accepted.

`;
            }

            context.ui.addItem(
              {
                type: MessageType.INFO,
                text: `${continueText}${nextPrompt}

${'━'.repeat(70)}

**To continue:**
\`\`\`
/agents create --next ${sessionId} <your-answer>
\`\`\`

**Other commands:**
  - \`/agents create --status ${sessionId}\` - View current progress
  - \`/agents create --cancel ${sessionId}\` - Cancel creation
`,
              },
              Date.now()
            );
            return;
          }

          // Check for --status flag
          if (args && args.trim().startsWith('--status ')) {
            const { CreationStep } = await import('@google/gemini-cli-core');
            const { loadSession } = await import('../../services/AgentCreationSessionStore.js');

            const sessionId = args.trim().substring(9).trim();
            const session = loadSession(sessionId);

            if (!session) {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text: `Session \`${sessionId}\` not found.`,
                },
                Date.now()
              );
              return;
            }

            const state = session.getState();
            const stepNames: Record<string, string> = {
              [CreationStep.NAME]: 'Name',
              [CreationStep.TITLE]: 'Title',
              [CreationStep.DESCRIPTION]: 'Description',
              [CreationStep.SCOPE]: 'Scope',
              [CreationStep.MODEL]: 'Model',
              [CreationStep.CONTENT_METHOD]: 'Content Method',
              [CreationStep.PURPOSE]: 'Purpose',
              [CreationStep.TOOL_CATEGORIES]: 'Tool Categories',
              [CreationStep.CONFIRM]: 'Confirmation',
              [CreationStep.COMPLETE]: 'Complete',
            };

            let message = `📊 **Creation Session Status**

**Session ID:** \`${sessionId}\`
**Current Step:** ${stepNames[state.currentStep] || state.currentStep}
**Started:** ${new Date(state.createdAt).toLocaleString()}

**Progress:**
`;

            const steps = [
              CreationStep.NAME,
              CreationStep.TITLE,
              CreationStep.DESCRIPTION,
              CreationStep.SCOPE,
              CreationStep.MODEL,
              CreationStep.CONTENT_METHOD,
              CreationStep.PURPOSE,
              CreationStep.TOOL_CATEGORIES,
              CreationStep.CONFIRM,
            ];

            const currentIndex = steps.indexOf(state.currentStep);
            steps.forEach((step, index) => {
              const status = index < currentIndex ? '✅' : index === currentIndex ? '⏳' : '⬜';
              message += `  ${status} ${stepNames[step]}\n`;
            });

            message += '\n**Collected Data:**\n';
            if (state.name) message += `  Name: ${state.name}\n`;
            if (state.title) message += `  Title: ${state.title}\n`;
            if (state.description) message += `  Description: ${state.description}\n`;
            if (state.scope) message += `  Scope: ${state.scope}\n`;
            if (state.model) message += `  Model: ${state.model}\n`;
            if (state.contentMethod) message += `  Content Method: ${state.contentMethod}\n`;
            if (state.purpose) message += `  Purpose: ${state.purpose.substring(0, 50)}...\n`;

            context.ui.addItem(
              {
                type: MessageType.INFO,
                text: message,
              },
              Date.now()
            );
            return;
          }

          // Check for --cancel flag
          if (args && args.trim().startsWith('--cancel ')) {
            const { deleteSession, hasSession } = await import('../../services/AgentCreationSessionStore.js');

            const sessionId = args.trim().substring(9).trim();

            if (!hasSession(sessionId)) {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text: `Session \`${sessionId}\` not found.`,
                },
                Date.now()
              );
              return;
            }

            deleteSession(sessionId);

            context.ui.addItem(
              {
                type: MessageType.INFO,
                text: `✅ Session \`${sessionId}\` cancelled and deleted.`,
              },
              Date.now()
            );
            return;
          }

          // Show help if no args
          if (!args || args.trim().length === 0) {
            const availableModels = getAvailableModelsFromConfig(context);
            const modelList = availableModels.map((m) => {
              const desc = m.description ? ` (${m.description})` : '';
              return `  - ${m.name}${desc}`;
            }).join('\n');

            context.ui.addItem(
              {
                type: MessageType.INFO,
                text: `Usage: /agents create <name> [options] OR /agents create --interactive

**Quick Start - Interactive Mode** (recommended for beginners):
  /agents create --interactive
  /agents create -i

**Quick Start - One Command** (for experienced users):
  /agents create <name> --ai --purpose "description"

**Options:**
  --interactive, -i        Start interactive step-by-step creation ⭐
  --title "Title"          Display title (default: auto-generated from name)
  --description "text"     Short description (optional)
  --model model-name       AI model to use (default: first configured model)
  --scope project|global   Where to save (default: project)
  --ai                     Use AI to generate agent content ⭐
  --purpose "text"         Purpose for AI generation (required with --ai)
  --preview                Preview mode - don't create agent yet

**Available Models:**
${modelList}

**Examples:**

1. **Interactive mode** (easiest):
   /agents create --interactive

2. **Quick AI generation**:
   /agents create debugger --ai --purpose "Debug Python errors"

3. **Full options**:
   /agents create reviewer --ai \\
     --purpose "Review code for security vulnerabilities" \\
     --title "Security Reviewer" \\
     --description "Checks code for OWASP top 10" \\
     --model claude-3.5-sonnet \\
     --scope global

4. **Manual template**:
   /agents create my-agent`,
              },
              Date.now()
            );
            return;
          }

          // Parse arguments
          const parts = args.trim().split(/\s+/);
          const name = parts[0];

          let title = name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          let description = '';
          let model = 'gemini-2.0-flash';
          let scope: 'global' | 'project' = 'project';
          let useAI = false;
          let purpose = '';
          let previewMode = false;

          // Parse options
          for (let i = 1; i < parts.length; i++) {
            // Skip if this looks like a flag
            if (parts[i].startsWith('--')) {
              const flag = parts[i];

              if (flag === '--ai') {
                useAI = true;
                continue;
              }

              if (flag === '--preview') {
                previewMode = true;
                continue;
              }

              // All other flags require a value
              if (i + 1 >= parts.length || parts[i + 1].startsWith('--')) {
                continue; // Skip flags without values
              }

              if (flag === '--title') {
                // Handle quoted titles
                if (parts[i + 1].startsWith('"')) {
                  let quotedTitle = parts[i + 1];
                  i++;
                  while (i + 1 < parts.length && !quotedTitle.endsWith('"')) {
                    quotedTitle += ' ' + parts[i + 1];
                    i++;
                  }
                  title = quotedTitle.replace(/^"|"$/g, '');
                } else {
                  title = parts[i + 1];
                  i++;
                }
              } else if (flag === '--description') {
                // Handle quoted descriptions
                if (parts[i + 1].startsWith('"')) {
                  let quotedDesc = parts[i + 1];
                  i++;
                  while (i + 1 < parts.length && !quotedDesc.endsWith('"')) {
                    quotedDesc += ' ' + parts[i + 1];
                    i++;
                  }
                  description = quotedDesc.replace(/^"|"$/g, '');
                } else {
                  description = parts[i + 1];
                  i++;
                }
              } else if (flag === '--model') {
                model = parts[i + 1];
                i++;
              } else if (flag === '--scope') {
                const scopeValue = parts[i + 1];
                if (scopeValue === 'global' || scopeValue === 'project') {
                  scope = scopeValue;
                }
                i++;
              } else if (flag === '--purpose') {
                // Handle quoted purpose
                if (parts[i + 1].startsWith('"')) {
                  let quotedPurpose = parts[i + 1];
                  i++;
                  while (i + 1 < parts.length && !quotedPurpose.endsWith('"')) {
                    quotedPurpose += ' ' + parts[i + 1];
                    i++;
                  }
                  purpose = quotedPurpose.replace(/^"|"$/g, '');
                } else {
                  purpose = parts[i + 1];
                  i++;
                }
              }
            }
          }

          // Validate AI options
          if (useAI && !purpose) {
            context.ui.addItem(
              {
                type: MessageType.ERROR,
                text: 'Error: --purpose is required when using --ai flag.\n\nExample:\n  /agents create analyzer --ai --purpose "Analyze code for security vulnerabilities"',
              },
              Date.now()
            );
            return;
          }

          // Show configuration summary
          const configSummary = `📋 **Agent Configuration**

┌────────────────────────────────────────────┐
│ Name:        ${name.padEnd(28)}│
│ Title:       ${title.padEnd(28)}│
│ Description: ${(description || '(none)').substring(0, 28).padEnd(28)}│
│ Scope:       ${scope.padEnd(28)}│
│ Model:       ${model.padEnd(28)}│
│ Mode:        ${(useAI ? 'AI Generated' : 'Manual Template').padEnd(28)}│
${useAI ? `│ Purpose:     ${purpose.substring(0, 28).padEnd(28)}│` : ''}
│ Tools:       read_file, grep, glob, bash   │
└────────────────────────────────────────────┘`;

          context.ui.addItem(
            {
              type: MessageType.INFO,
              text: configSummary,
            },
            Date.now()
          );

          let customSystemPrompt: string | undefined;

          // Show processing message if using AI
          if (useAI && context.services.config) {
            context.ui.addItem(
              {
                type: MessageType.INFO,
                text: `\n🤖 Generating agent content using AI...\n\nThis may take a few seconds...`,
              },
              Date.now()
            );

            try {
              // Import ModelService dynamically to avoid circular dependency
              const { ModelService } = await import('@google/gemini-cli-core');
              const modelService = new ModelService(context.services.config);
              const generator = new AgentContentGenerator(modelService);
              const generated = await generator.generateContent(purpose, name, title);
              customSystemPrompt = generated.systemPrompt;

              // Show FULL generated content with nice formatting
              context.ui.addItem(
                {
                  type: MessageType.INFO,
                  text: `\n✨ **AI Generated Content:**

${'─'.repeat(70)}
${generated.systemPrompt}
${'─'.repeat(70)}

📊 **Content Summary:**
  - Role: ${generated.role.substring(0, 60)}${generated.role.length > 60 ? '...' : ''}
  - Responsibilities: ${generated.responsibilities.length} items
  - Workflow: ${generated.workflow.length} steps
  - Guidelines: ${generated.guidelines.length} items
  - Examples: ${generated.examples.length} scenarios
  - Constraints: ${generated.constraints.length} items`,
                },
                Date.now()
              );
            } catch (error) {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text: `❌ Failed to generate AI content: ${error instanceof Error ? error.message : String(error)}\n\nCreating with empty template instead...`,
                },
                Date.now()
              );
              customSystemPrompt = undefined;
            }
          }

          // In preview mode, DON'T create the agent yet
          if (previewMode) {
            context.ui.addItem(
              {
                type: MessageType.INFO,
                text: `\n${'━'.repeat(70)}

🎯 **PREVIEW MODE** - Agent NOT Created Yet!

${'━'.repeat(70)}

**This is what will be created:**

📁 **File:** ${scope === 'global' ? `~/.gemini/agents/${name}.md` : `.gemini/agents/${name}.md`}

**To CREATE this agent, run:**

\`\`\`
/agents create ${name} --ai --purpose "${purpose}"${title !== name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) ? ` --title "${title}"` : ''}${description ? ` --description "${description}"` : ''}${model !== 'gemini-2.0-flash' ? ` --model ${model}` : ''}${scope !== 'project' ? ` --scope ${scope}` : ''}
\`\`\`

**To REGENERATE with different purpose:**

\`\`\`
/agents create ${name} --ai --purpose "<new description>" --preview
\`\`\`

**To CANCEL:**

Just don't run the create command. Nothing has been saved.

${'━'.repeat(70)}`,
              },
              Date.now()
            );
            return;
          }

          // Actually create the agent
          const agentManager = await getAgentManager(context);
          const agent = await agentManager.createAgent({
            name,
            title,
            description,
            model,
            contextMode: undefined, // Single command mode doesn't specify contextMode
            scope,
            customSystemPrompt,
            allowTools: ['read_file', 'grep', 'glob', 'bash'],
            denyTools: [],
          });

          // Final success message with next steps
          const successMessage = `\n✅ **Agent "${agent.name}" Created Successfully!**

📁 **File Location:**
   ${agent.filePath}

${useAI ? `🤖 **AI Generated:**
   The agent has been created with AI-generated role, responsibilities,
   guidelines, and constraints based on your purpose description.

` : ''}📝 **Next Steps:**

   1. **Review the content:**
      \`cat ${agent.filePath}\`

   2. **Edit if needed:**
      \`vim ${agent.filePath}\`
      (or use your preferred editor)

   3. **Validate the agent:**
      \`/agents validate ${agent.name}\`

   4. **View agent info:**
      \`/agents info ${agent.name}\`

   5. **List all agents:**
      \`/agents list\`

${useAI ? `💡 **Tip:**
   Review the AI-generated content and adjust it to match your specific
   needs. You can modify tools, add constraints, or refine guidelines.
` : `💡 **Tip:**
   The template includes placeholder sections. Fill in the Role,
   Responsibilities, Guidelines, and Constraints to define your agent.
`}
🎉 Your agent is ready to use!`;

          context.ui.addItem(
            {
              type: MessageType.INFO,
              text: successMessage,
            },
            Date.now()
          );
        } catch (error) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: `Failed to create agent: ${error instanceof Error ? error.message : String(error)}`,
            },
            Date.now()
          );
        }
      },
    },

    {
      name: 'validate',
      description: 'Validate an agent: /agents validate <name>',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext, args?: string) => {
        try {
          if (!args || args.trim().length === 0) {
            context.ui.addItem(
              {
                type: MessageType.ERROR,
                text: 'Usage: /agents validate <name>',
              },
              Date.now()
            );
            return;
          }

          const name = args.trim();
          const agentManager = await getAgentManager(context);

          if (!agentManager.hasAgent(name)) {
            context.ui.addItem(
              {
                type: MessageType.ERROR,
                text: `Agent "${name}" not found. Use /agents list to see available agents.`,
              },
              Date.now()
            );
            return;
          }

          const validation = agentManager.validateAgent(name);

          let message = `🔍 Validation Results for "${name}":\n\n`;

          if (validation.valid) {
            message += '✅ All validations passed!\n';
          } else {
            message += '❌ Validation failed:\n\n';
            for (const error of validation.errors) {
              message += `  • ${error}\n`;
            }
          }

          if (validation.warnings.length > 0) {
            message += '\n⚠️  Warnings:\n';
            for (const warning of validation.warnings) {
              message += `  • ${warning}\n`;
            }
          }

          context.ui.addItem(
            {
              type: validation.valid ? MessageType.INFO : MessageType.ERROR,
              text: message.trim(),
            },
            Date.now()
          );
        } catch (error) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: `Failed to validate agent: ${error instanceof Error ? error.message : String(error)}`,
            },
            Date.now()
          );
        }
      },
    },

    {
      name: 'delete',
      description: 'Delete an agent: /agents delete <name>',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext, args?: string) => {
        try {
          if (!args || args.trim().length === 0) {
            context.ui.addItem(
              {
                type: MessageType.ERROR,
                text: 'Usage: /agents delete <name>',
              },
              Date.now()
            );
            return;
          }

          const name = args.trim();
          const agentManager = await getAgentManager(context);

          const deleted = await agentManager.deleteAgent(name);

          if (deleted) {
            context.ui.addItem(
              {
                type: MessageType.INFO,
                text: `✅ Deleted agent "${name}"`,
              },
              Date.now()
            );
          } else {
            context.ui.addItem(
              {
                type: MessageType.ERROR,
                text: `Agent "${name}" not found.`,
              },
              Date.now()
            );
          }
        } catch (error) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: `Failed to delete agent: ${error instanceof Error ? error.message : String(error)}`,
            },
            Date.now()
          );
        }
      },
    },

    {
      name: 'info',
      description: 'Show agent details: /agents info <name>',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext, args?: string) => {
        try {
          if (!args || args.trim().length === 0) {
            context.ui.addItem(
              {
                type: MessageType.ERROR,
                text: 'Usage: /agents info <name>',
              },
              Date.now()
            );
            return;
          }

          const name = args.trim();
          const agentManager = await getAgentManager(context);

          const agent = agentManager.getAgent(name);

          if (!agent) {
            context.ui.addItem(
              {
                type: MessageType.ERROR,
                text: `Agent "${name}" not found.`,
              },
              Date.now()
            );
            return;
          }

          let message = `📋 Agent: **${agent.title}** (${agent.name})\n\n`;

          if (agent.description) {
            message += `**Description**: ${agent.description}\n\n`;
          }

          message += `**Scope**: ${agent.scope}\n`;
          message += `**Model**: ${agent.model || 'default'}\n`;
          if (agent.contextMode) {
            message += `**Context Mode**: ${agent.contextMode}\n`;
          }
          message += `**File**: ${agent.filePath}\n\n`;

          if (agent.tools) {
            message += '**Tool Configuration**:\n';
            if (agent.tools.allow) {
              message += `  Allow: ${agent.tools.allow.join(', ')}\n`;
            }
            if (agent.tools.deny) {
              message += `  Deny: ${agent.tools.deny.join(', ')}\n`;
            }
          }

          if (agent.mcp?.servers && agent.mcp.servers.length > 0) {
            message += `\n**MCP Servers**: ${agent.mcp.servers.join(', ')}\n`;
          }

          message += `\n**Created**: ${agent.createdAt.toLocaleString()}`;
          message += `\n**Updated**: ${agent.updatedAt.toLocaleString()}`;

          context.ui.addItem(
            {
              type: MessageType.INFO,
              text: message,
            },
            Date.now()
          );
        } catch (error) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: `Failed to show agent info: ${error instanceof Error ? error.message : String(error)}`,
            },
            Date.now()
          );
        }
      },
    },

    {
      name: 'run',
      description: 'Run an agent with a prompt: /agents run [--context isolated|shared] <name> <prompt>',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext, args?: string) => {
        try {
          if (!args || args.trim().length === 0) {
            context.ui.addItem(
              {
                type: MessageType.ERROR,
                text: 'Usage: /agents run [--context isolated|shared] <name> <prompt>',
              },
              Date.now()
            );
            return;
          }

          // Parse context mode parameter if present
          let contextMode: 'isolated' | 'shared' | undefined;
          let trimmed = args.trim();

          if (trimmed.startsWith('--context ')) {
            const parts = trimmed.substring(10).split(' ');
            const modeValue = parts[0];

            if (modeValue === 'isolated' || modeValue === 'shared') {
              contextMode = modeValue;
              trimmed = parts.slice(1).join(' ').trim();
            } else {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text: `Invalid context mode: ${modeValue}. Must be 'isolated' or 'shared'.`,
                },
                Date.now()
              );
              return;
            }
          }

          // Parse: first word is agent name, rest is prompt
          const firstSpaceIndex = trimmed.indexOf(' ');

          if (firstSpaceIndex === -1) {
            context.ui.addItem(
              {
                type: MessageType.ERROR,
                text: 'Usage: /agents run [--context isolated|shared] <name> <prompt>\nExample: /agents run code_review Check this file for issues',
              },
              Date.now()
            );
            return;
          }

          const agentName = trimmed.substring(0, firstSpaceIndex);
          const prompt = trimmed.substring(firstSpaceIndex + 1).trim();

          if (!prompt) {
            context.ui.addItem(
              {
                type: MessageType.ERROR,
                text: 'Please provide a prompt for the agent',
              },
              Date.now()
            );
            return;
          }

          // Get AgentManager from executor (shares same instance with executor)
          const agentManager = await getAgentManager(context);

          // Get agent definition
          const agent = agentManager.getAgent(agentName);
          if (!agent) {
            context.ui.addItem(
              {
                type: MessageType.ERROR,
                text: `Agent '${agentName}' not found. Use /agents list to see available agents.`,
              },
              Date.now()
            );
            return;
          }

          // Show agent info
          const modeInfo = contextMode ? `\nContext: ${contextMode}` : '';
          context.ui.addItem(
            {
              type: MessageType.INFO,
              text: `🤖 Running agent: **${agent.title}**\nModel: ${agent.model || 'default'}${modeInfo}\nPrompt: ${prompt}`,
            },
            Date.now()
          );

          if (!context.services.config) {
            throw new Error('Config not available');
          }

          // Sync main session context to agent executor (for shared context mode)
          try {
            const geminiClient = context.services.config.getGeminiClient();
            if (geminiClient) {
              const mainHistory = await geminiClient.getHistory();
              await context.services.config.syncMainSessionContext(mainHistory);
            }
          } catch (error) {
            // Silently ignore sync errors - agents will work in isolated mode
            console.warn('[AgentRun] Failed to sync main session context:', error);
          }

          // Get global AgentExecutor (maintains context across invocations)
          const executor = await context.services.config.getAgentExecutor();

          // Execute agent with callbacks
          const result = await executor.execute(agentName, prompt, {
            contextMode,
            // Callback when handoff is initiated
            onHandoff: (fromAgent: string, toAgent: string, reason: string) => {
              const fromAgentDef = agentManager.getAgent(fromAgent);
              const toAgentDef = agentManager.getAgent(toAgent);

              context.ui.addItem(
                {
                  type: MessageType.INFO,
                  text: `🔄 **Agent Handoff**: ${fromAgentDef?.title || fromAgent} → ${toAgentDef?.title || toAgent}\n\n` +
                        `📝 Reason: ${reason}\n\n` +
                        `🚀 Switching to **${toAgentDef?.title || toAgent}** agent...`,
                },
                Date.now()
              );
            },
            // Callback when tool is called
            onToolCall: (toolName: string, args: any) => {
              // Create a tool display similar to workflow and main session
              const toolDisplay: IndividualToolCallDisplay = {
                callId: `agent-${agentName}-${toolName}-${Date.now()}`,
                name: toolName,
                description: toolName,
                status: ToolCallStatus.Success,
                resultDisplay: undefined,
                confirmationDetails: undefined,
              };

              context.ui.addItem(
                {
                  type: 'tool_group',
                  tools: [toolDisplay],
                } as any,
                Date.now()
              );
            },

            // Callback when tool completes (optional, for errors)
            onToolResult: (toolName: string, result: any, error?: Error) => {
              if (error) {
                context.ui.addItem(
                  {
                    type: MessageType.ERROR,
                    text: `Tool ${toolName} failed: ${error.message}`,
                  },
                  Date.now()
                );
              }
            },
          });

          // Display result
          context.ui.addItem(
            {
              type: MessageType.GEMINI,
              text: result.text,
            },
            Date.now()
          );

          // Show usage stats if available
          if (result.metadata?.tokensUsed) {
            const stats = [`📊 Tokens used: ${result.metadata.tokensUsed}`];

            if (result.metadata.contextMode) {
              stats.push(`Context: ${result.metadata.contextMode}`);
            }

            if (result.metadata.iterations && result.metadata.iterations > 1) {
              stats.push(`Iterations: ${result.metadata.iterations}`);
            }

            if (result.metadata.durationMs) {
              stats.push(`Duration: ${Math.round(result.metadata.durationMs)}ms`);
            }

            context.ui.addItem(
              {
                type: MessageType.INFO,
                text: stats.join(' | '),
              },
              Date.now()
            );
          }
        } catch (error) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: `Failed to run agent: ${error instanceof Error ? error.message : String(error)}`,
            },
            Date.now()
          );
        }
      },
    },

    {
      name: 'clear',
      description: 'Clear conversation history for an agent: /agents clear <name>',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext, args?: string) => {
        try {
          if (!args || args.trim().length === 0) {
            context.ui.addItem(
              {
                type: MessageType.ERROR,
                text: 'Usage: /agents clear <name>\nExample: /agents clear code_review',
              },
              Date.now()
            );
            return;
          }

          const agentName = args.trim();

          if (!context.services.config) {
            throw new Error('Config not available');
          }

          // Get global AgentExecutor
          const executor = await context.services.config.getAgentExecutor();

          // Clear context
          executor.clearContext(agentName);

          context.ui.addItem(
            {
              type: MessageType.INFO,
              text: `✓ Cleared conversation history for agent: ${agentName}`,
            },
            Date.now()
          );
        } catch (error) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: `Failed to clear context: ${error instanceof Error ? error.message : String(error)}`,
            },
            Date.now()
          );
        }
      },
    },

    {
      name: 'context',
      description: 'View or manage agent context: /agents context <name>',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext, args?: string) => {
        try {
          if (!args || args.trim().length === 0) {
            context.ui.addItem(
              {
                type: MessageType.ERROR,
                text: 'Usage: /agents context <name>\nExample: /agents context code_review',
              },
              Date.now()
            );
            return;
          }

          const agentName = args.trim();

          if (!context.services.config) {
            throw new Error('Config not available');
          }

          // Get global AgentExecutor
          const executor = await context.services.config.getAgentExecutor();

          // Get context manager
          const contextManager = executor.getContextManager();

          // Check if context exists
          if (!contextManager.hasContext(agentName)) {
            context.ui.addItem(
              {
                type: MessageType.INFO,
                text: `Agent '${agentName}' has no active context yet. Run the agent to create a context.`,
              },
              Date.now()
            );
            return;
          }

          // Get context stats
          const stats = contextManager.getContextStats(agentName);
          if (!stats) {
            context.ui.addItem(
              {
                type: MessageType.ERROR,
                text: `Failed to get context stats for agent: ${agentName}`,
              },
              Date.now()
            );
            return;
          }

          // Get context mode
          const mode = stats.mode || 'isolated';

          // Format stats message
          let message = `📊 **Context for agent: ${agentName}**\n\n`;
          message += `**Mode**: ${mode}\n`;
          message += `**Messages**: ${stats.messageCount}\n`;
          message += `**Created**: ${stats.createdAt.toLocaleString()}\n`;
          message += `**Last accessed**: ${stats.lastAccessedAt.toLocaleString()}\n`;
          message += `**Duration**: ${Math.round(stats.durationMs / 1000)}s\n\n`;

          if (mode === 'shared') {
            message += '💡 This agent shares context with the main session.\n';
            message += 'All messages are part of your main conversation.\n';
          } else {
            message += '💡 This agent has isolated context.\n';
            message += 'Messages are independent from the main session.\n';
          }

          context.ui.addItem(
            {
              type: MessageType.INFO,
              text: message,
            },
            Date.now()
          );
        } catch (error) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: `Failed to show context: ${error instanceof Error ? error.message : String(error)}`,
            },
            Date.now()
          );
        }
      },
    },
    {
      name: 'route',
      description: 'Test routing for a given prompt (shows which agent would be selected)',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext, args?: string) => {
        try {
          if (!args || args.trim() === '') {
            context.ui.addItem(
              {
                type: MessageType.ERROR,
                text: 'Usage: /agents route <prompt> [--execute]\n\nExamples:\n  /agents route "实现登录功能"          # Test routing only\n  /agents route "实现登录功能" --execute  # Test and execute',
              },
              Date.now()
            );
            return;
          }

          if (!context.services.config) {
            context.ui.addItem(
              {
                type: MessageType.ERROR,
                text: 'Configuration service not available.',
              },
              Date.now()
            );
            return;
          }

          const executor = await context.services.config.getAgentExecutor();
          const router = executor.getRouter();

          if (!router) {
            context.ui.addItem(
              {
                type: MessageType.ERROR,
                text: 'Router not initialized. Please restart the application.',
              },
              Date.now()
            );
            return;
          }

          if (!router.isEnabled()) {
            context.ui.addItem(
              {
                type: MessageType.INFO,
                text: '⚠️  Routing is currently disabled.\n\nEnable it with: /agents config enable',
              },
              Date.now()
            );
            return;
          }

          // Parse arguments: check for --execute flag
          const trimmedArgs = args.trim();
          const executeFlag = trimmedArgs.includes('--execute');
          const prompt = trimmedArgs.replace(/\s*--execute\s*$/, '').replace(/\s*--execute\s+/, ' ').trim();

          if (!prompt) {
            context.ui.addItem(
              {
                type: MessageType.ERROR,
                text: 'Prompt cannot be empty.\n\nUsage: /agents route <prompt> [--execute]',
              },
              Date.now()
            );
            return;
          }

          context.ui.addItem(
            {
              type: MessageType.INFO,
              text: `🔍 ${executeFlag ? 'Routing and executing' : 'Testing routing for'}: "${prompt}"\n\nPlease wait...`,
            },
            Date.now()
          );

          const result = await router.route(prompt);

          if (!result) {
            context.ui.addItem(
              {
                type: MessageType.INFO,
                text: '❌ No suitable agent found for this prompt.\n\nTry adjusting your routing configuration or creating more agents.',
              },
              Date.now()
            );
            return;
          }

          let message = `✅ **Routing Result**\n\n`;
          message += `**Selected Agent**: ${result.agent.name}\n`;
          message += `**Title**: ${result.agent.title}\n`;
          message += `**Score**: ${result.score}\n`;
          message += `**Confidence**: ${result.confidence}%\n\n`;

          if (result.matchedKeywords.length > 0) {
            message += `**Matched Keywords**: ${result.matchedKeywords.join(', ')}\n`;
          }
          if (result.matchedPatterns.length > 0) {
            message += `**Matched Patterns**: ${result.matchedPatterns.length} pattern(s)\n`;
          }

          if (!executeFlag) {
            message += `\n💡 Use \`@${result.agent.name} ${prompt}\` to execute with this agent.`;
            message += `\n💡 Or use \`/agents route "${prompt}" --execute\` to route and execute in one step.`;
          }

          context.ui.addItem(
            {
              type: MessageType.INFO,
              text: message,
            },
            Date.now()
          );

          // If --execute flag is present, execute the agent
          if (executeFlag) {
            context.ui.addItem(
              {
                type: MessageType.INFO,
                text: `\n🚀 Executing with agent: **${result.agent.title || result.agent.name}**\n`,
              },
              Date.now()
            );

            // Execute the agent by calling the run command's action
            // Find the 'run' subcommand in the same subCommands array
            const runSubCommand = agentsCommand.subCommands?.find((cmd) => cmd.name === 'run');
            if (runSubCommand && runSubCommand.action) {
              await runSubCommand.action(context, `${result.agent.name} ${prompt}`);
            } else {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text: 'Failed to execute agent: run command not found.',
                },
                Date.now()
              );
            }
          }
        } catch (error) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: `Failed to test routing: ${error instanceof Error ? error.message : String(error)}`,
            },
            Date.now()
          );
        }
      },
    },
    {
      name: 'config',
      description: 'View or modify routing configuration',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext, args?: string) => {
        try {
          if (!context.services.config) {
            context.ui.addItem(
              {
                type: MessageType.ERROR,
                text: 'Configuration service not available.',
              },
              Date.now()
            );
            return;
          }

          const executor = await context.services.config.getAgentExecutor();
          const router = executor.getRouter();

          if (!router) {
            context.ui.addItem(
              {
                type: MessageType.ERROR,
                text: 'Router not initialized. Please restart the application.',
              },
              Date.now()
            );
            return;
          }

          // Parse subcommand
          const parts = args?.trim().split(/\s+/) || [];
          const subCmd = parts[0] || 'show';

          if (subCmd === 'show') {
            // Show current configuration
            const config = router.getConfig();
            const currentSessionModel = context.services.config?.getModel() || 'unknown';

            let message = `⚙️  **Routing Configuration**\n\n`;
            message += `**Enabled**: ${config.enabled ? '✅ Yes' : '❌ No'}\n`;
            message += `**Strategy**: ${config.strategy}\n`;
            message += `**Confidence Threshold**: ${config.rule.confidence_threshold}\n`;
            message += `**Fallback**: ${config.fallback}\n\n`;
            message += `📊 **Model Configuration**:\n`;
            message += `**Current Session Model**: ${currentSessionModel}\n`;
            message += `  └─ Used for: Main chat, agent execution\n`;
            message += `**Routing LLM Model**: ${config.llm.model}\n`;
            message += `  └─ Used for: Intelligent agent selection (LLM/Hybrid routing)\n`;
            message += `**LLM Timeout**: ${config.llm.timeout}ms\n\n`;
            message += `💡 **Available Commands**:\n`;
            message += `- \`/agents config show\` - Show current config\n`;
            message += `- \`/agents config enable\` - Enable routing\n`;
            message += `- \`/agents config disable\` - Disable routing\n`;
            message += `- \`/agents config set <key> <value>\` - Update config\n\n`;
            message += `**Examples**:\n`;
            message += `- \`/agents config set strategy hybrid\`\n`;
            message += `- \`/agents config set rule.confidence_threshold 80\`\n`;
            message += `- \`/agents config set llm.model gemini-2.0-flash\`\n`;

            context.ui.addItem(
              {
                type: MessageType.INFO,
                text: message,
              },
              Date.now()
            );
          } else if (subCmd === 'enable') {
            router.enable();
            context.ui.addItem(
              {
                type: MessageType.INFO,
                text: '✅ Routing enabled!\n\nYou can now use auto-routing features.',
              },
              Date.now()
            );
          } else if (subCmd === 'disable') {
            router.disable();
            context.ui.addItem(
              {
                type: MessageType.INFO,
                text: '❌ Routing disabled.\n\nManual agent selection is required.',
              },
              Date.now()
            );
          } else if (subCmd === 'set') {
            const key = parts[1];
            const value = parts.slice(2).join(' ');

            if (!key || !value) {
              context.ui.addItem(
                {
                  type: MessageType.ERROR,
                  text: 'Usage: /agents config set <key> <value>\n\nExample: /agents config set strategy hybrid',
                },
                Date.now()
              );
              return;
            }

            // Parse and update configuration
            const updates: any = {};
            if (key === 'strategy') {
              if (value === 'rule' || value === 'llm' || value === 'hybrid') {
                updates.strategy = value;
              } else {
                throw new Error('Invalid strategy. Must be: rule, llm, or hybrid');
              }
            } else if (key === 'rule.confidence_threshold') {
              const threshold = parseInt(value, 10);
              if (isNaN(threshold) || threshold < 0 || threshold > 100) {
                throw new Error('Invalid threshold. Must be between 0 and 100');
              }
              updates.rule = { confidence_threshold: threshold };
            } else if (key === 'llm.model') {
              updates.llm = { model: value, timeout: router.getConfig().llm.timeout };
            } else if (key === 'llm.timeout') {
              const timeout = parseInt(value, 10);
              if (isNaN(timeout) || timeout < 1000) {
                throw new Error('Invalid timeout. Must be at least 1000ms');
              }
              updates.llm = { model: router.getConfig().llm.model, timeout };
            } else if (key === 'fallback') {
              if (value === 'none' || value === 'prompt_user' || value === 'default_agent') {
                updates.fallback = value;
              } else {
                throw new Error('Invalid fallback. Must be: none, prompt_user, or default_agent');
              }
            } else {
              throw new Error(`Unknown config key: ${key}`);
            }

            router.updateConfig(updates);
            context.ui.addItem(
              {
                type: MessageType.INFO,
                text: `✅ Configuration updated!\n\n**${key}** = ${value}\n\n💡 This is a runtime change and won't persist after restart.\nTo make it permanent, update your settings.json file.`,
              },
              Date.now()
            );
          } else {
            context.ui.addItem(
              {
                type: MessageType.ERROR,
                text: `Unknown subcommand: ${subCmd}\n\nAvailable: show, enable, disable, set`,
              },
              Date.now()
            );
          }
        } catch (error) {
          context.ui.addItem(
            {
              type: MessageType.ERROR,
              text: `Failed to modify config: ${error instanceof Error ? error.message : String(error)}`,
            },
            Date.now()
          );
        }
      },
    },
  ],
};
