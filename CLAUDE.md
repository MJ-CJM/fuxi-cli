# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Fuxi CLI** is an enhanced fork of Google Gemini CLI, optimized for Chinese developers with extensive custom model support, intelligent agents system, and workflow orchestration capabilities. The project maintains full compatibility with the original Gemini CLI while adding powerful enterprise-grade features.

## Development Commands

### Build System
- **Build entire project**: `npm run build` (builds all packages)
- **Minimal build**: `npm run build:minimal` (faster build without full dependencies)
- **Build with sandbox**: `npm run build:all` (includes Docker sandbox container)
- **Bundle for distribution**: `npm run bundle` (creates distributable bundle)
- **Clean build artifacts**: `npm run clean`

### Testing
- **Run unit tests**: `npm run test` (runs tests in all packages)
- **Run integration tests**: `npm run test:e2e`
- **Run all integration tests**: `npm run test:integration:all`
- **Run tests with CI coverage**: `npm run test:ci`
- **Run single test**: Navigate to package directory and use `npm run test -- --reporter=verbose path/to/test.ts`

### Code Quality
- **Lint code**: `npm run lint`
- **Fix linting issues**: `npm run lint:fix`
- **Format code**: `npm run format` (uses Prettier)
- **Type check**: `npm run typecheck`
- **Full preflight check**: `npm run preflight` (runs format, lint, build, typecheck, and tests)

### Development Workflow
- **Start CLI from source**: `npm start`
- **Start in debug mode**: `npm run debug`
- **Start in development mode**: `DEV=true npm start`

## Architecture Overview

### Monorepo Structure

This is a **monorepo** with clear separation of concerns:

#### Core Packages

**`packages/cli/`** - Frontend Terminal Interface
- Built with React/Ink for terminal UI
- Main entry point: `packages/cli/src/gemini.tsx`
- Handles user input, display rendering, and UI interactions
- Contains UI components (`ui/`), slash commands (`commands/`), and services (`services/`)
- Uses Ink's declarative component model for terminal rendering

**`packages/core/`** - Backend Logic and API Communication
- Main exports: `packages/core/src/index.ts`
- Core chat orchestration: `packages/core/src/core/geminiChat.ts`
- Key subsystems:
  - `adapters/` - Multi-model support (OpenAI, Claude, custom providers)
  - `agents/` - Agents system (executor, router, handoff, workflows)
  - `tools/` - Tool registry and execution
  - `core/` - Chat engine, tool scheduler, content generator
  - `config/` - Configuration management
  - `spec/` - Specification-driven development system
  - `services/` - File operations, shell execution, Git integration

**`packages/test-utils/`** - Shared testing utilities

**`packages/vscode-ide-companion/`** - VSCode extension companion

**`packages/a2a-server/`** - Agent-to-Agent communication server

### Key Data Flow

1. **User Input** → CLI package captures via Ink components
2. **Command Processing** → CLI routes to command handlers or main chat
3. **Prompt Construction** → Core package builds context with agents/tools
4. **Model Invocation** → ModelRouter selects provider (Gemini/OpenAI/Claude/Custom)
5. **Tool Execution** → Core executes requested tools (with approval gates)
6. **Response Rendering** → Results flow back to CLI for terminal display

### Fuxi-Specific Enhancements

#### 1. Universal Model Support (`packages/core/src/adapters/`)
- **ModelRouter** (`modelRouter.ts`) - Routes requests to appropriate model provider
- **Adapters**:
  - `openai/` - OpenAI-compatible models (Qwen, DeepSeek, local models)
  - `claude/` - Anthropic Claude integration
  - `custom/` - Custom provider implementations
- **Configuration-driven**: Models defined in `~/.gemini/config.json`
- **Zero-code integration**: Add any OpenAI-compatible model via config

#### 2. Agents System (`packages/core/src/agents/`)
- **AgentExecutor** - Executes agent tasks with isolated/shared context
- **AgentManager** - Manages agent lifecycle and registry
- **Router** - Intelligent routing (rule-based, LLM-based, hybrid)
- **HandoffManager** - Agent-to-agent task handoff with cycle detection
- **WorkflowExecutor** - Sequential and parallel workflow orchestration
- **ContextManager** - Manages agent conversation context
- **Creation Tools**: Interactive agent creation with AI assistance

#### 3. Plan+Todo System (`packages/core/src/tools/plan-todo/`)
- **Plan Mode**: Read-only analysis and planning phase
- **Todo Execution**: Structured task execution with dependency tracking
- **Batch Execution**: Execute multiple todos with `execute-all` command

#### 4. Spec-Driven Development (`packages/core/src/spec/`)
- **SpecManager** - Manages specifications, plans, and tasks
- **ConstitutionFormatter** - Project-wide engineering principles
- **SpecValidator** - Validates spec documents
- Flow: Constitution → Specification → Technical Plan → Tasks → Implementation

## Configuration Management

### Configuration Files

**Global Settings**: `~/.gemini/settings.json`
- Model selection, security settings, experimental features
- Routing configuration, trusted folders

**Global Config**: `~/.gemini/config.json`
- Model definitions with provider-specific settings
- MCP server configurations

**Project Settings**: `.gemini/settings.json`
- Project-specific overrides

**Environment Variables**: `.env`
- API keys, feature flags

### Hierarchical Precedence
defaults → system → user → project → env vars → CLI args

### Important Settings

**Enable Custom Models** (Both files required):
```json
// ~/.gemini/config.json
{
  "useModelRouter": true,
  "defaultModel": "qwen3-coder-flash",
  "models": { /* model configs */ }
}

// ~/.gemini/settings.json
{
  "experimental": {
    "useModelRouter": true
  },
  "security": {
    "auth": {
      "selectedType": "custom-model"
    }
  }
}
```

## Development Patterns

### TypeScript Configuration
- **Strict mode enabled**: Comprehensive type checking
- **ESM modules**: `"type": "module"` throughout
- **Composite project**: Incremental builds with project references
- **Target**: ES2022, Node.js 20+ required
- **verbatimModuleSyntax**: Enforces explicit import/export types

### Testing Framework
- **Vitest** for unit tests
- **React Testing Library** for Ink components
- **MSW** for API mocking in tests
- **Integration tests**: Full CLI execution in `integration-tests/`

### Code Style
- **ESLint**: TypeScript rules with import restrictions
- **License headers**: `@license` format required on all files
- **Prettier**: Automated formatting
- **No default exports**: Preferred in CLI package
- **React patterns**: Functional components with hooks

### React/Ink Patterns
- **Terminal UI**: Ink (React for CLIs)
- **State management**: Context API and React hooks
- **Custom hooks**: Terminal-specific (keyboard, completion, etc.)
- **Streaming**: Real-time response updates

## Important File Locations

### Entry Points
- `packages/cli/src/gemini.tsx` - Main CLI application
- `packages/core/src/index.ts` - Core package exports
- `bundle/fuxi-cli.js` - Bundled CLI executable
- `scripts/start.js` - Development startup script

### Configuration
- `package.json` (root) - Workspace setup and scripts
- `tsconfig.json` - Root TypeScript configuration
- `eslint.config.js` - Linting rules
- `esbuild.config.js` - Production build configuration
- `scripts/build.js` - Build orchestration

### Core Services
- `packages/core/src/core/geminiChat.ts` - Main chat orchestration
- `packages/core/src/core/client.ts` - LLM client abstraction
- `packages/core/src/core/coreToolScheduler.ts` - Tool execution scheduling
- `packages/core/src/tools/tool-registry.ts` - Tool management
- `packages/cli/src/services/CommandService.ts` - Slash command handling

### Custom Features
- `packages/core/src/adapters/modelRouter.ts` - Model routing logic
- `packages/core/src/agents/AgentExecutor.ts` - Agent execution engine
- `packages/core/src/agents/Router.ts` - Intelligent agent routing
- `packages/core/src/agents/WorkflowExecutor.ts` - Workflow orchestration
- `packages/core/src/spec/SpecManager.ts` - Spec-driven development

## Build System

### Build Scripts (`scripts/`)
- `build.js` - Main build orchestrator
- `build_package.js` - Individual package builder
- `build_sandbox.js` - Docker sandbox image builder
- `esbuild-minimal.js` - Fast minimal build
- `copy_bundle_assets.js` - Asset bundling for distribution

### Bundle System
- **ESBuild**: Fast TypeScript compilation
- **Asset bundling**: Includes sandbox profiles, templates
- **Incremental builds**: Composite project setup
- **Distribution**: Creates standalone `bundle/` directory

## Security and Sandboxing

### Sandboxing
- **macOS**: Seatbelt (sandbox-exec) with profiles in `.gemini/sandbox-macos-*.sb`
- **Cross-platform**: Docker/Podman containerization
- **YOLO mode**: Auto-sandboxing for high-risk operations

### Tool Safety
- **Read-only tools**: Auto-approve by default
- **Write/execute tools**: Require user confirmation
- **Approval modes**: Configurable via `autoAccept` settings
- **MCP servers**: Can be marked as trusted

## Key Slash Commands

### Model Management
- `/model list` - List available models
- `/model use <name>` - Switch to a model
- `/model info` - Show current model details

### Agent Management
- `/agents create -i` - Interactive agent creation
- `/agents list` - List all agents
- `/agents run <name> <prompt>` - Execute agent
- `/agents config enable` - Enable intelligent routing
- `/agents route <prompt>` - Test routing (dry-run)

### Workflow Management
- `/workflow list` - List workflows
- `/workflow run <name> <input>` - Execute workflow
- `/workflow validate <name>` - Validate workflow definition

### Plan+Todo
- `Ctrl+P` - Toggle Plan mode
- `/plan show` - Display current plan
- `/plan to-todos` - Convert plan to todos
- `/todos list` - List all todos
- `/todos execute-all` - Batch execute todos

### Spec-Driven Development
- `/spec new` - Create new specification
- `/spec plan new <spec-id>` - Generate technical plan
- `/spec tasks new <plan-id>` - Generate task list
- `/spec execute start <tasks-id>` - Execute tasks

## Context Files

### GEMINI.md / FUXI.md
- Project-specific AI instructions
- Loaded hierarchically from root to subdirectories
- Use `/memory show` and `/memory refresh` to manage

### Agent Files (`.gemini/agents/*.md`)
- YAML frontmatter with agent configuration
- Markdown body with system prompt
- Supports triggers, tool filtering, handoffs

### Workflow Files (`.gemini/workflows/*.yaml`)
- YAML-based workflow definitions
- Supports sequential and parallel execution
- Template variables for data passing

## Common Development Tasks

### Adding a New Model
1. Edit `~/.gemini/config.json` to add model definition
2. Set `useModelRouter: true` in both config.json and settings.json
3. Test with `/model use <new-model-name>`

### Creating a Custom Agent
1. Run `/agents create -i` for interactive creation
2. Edit `.gemini/agents/<agent-name>.md` to customize
3. Test with `@<agent-name> <prompt>` or `/agents run <agent-name> <prompt>`

### Building and Testing
1. Make code changes in `packages/*/src/`
2. Run `npm run build` to rebuild
3. Run `npm run test` to verify tests pass
4. Run `npm run preflight` before committing

### Debugging
1. Use `npm run debug` to start with Node.js debugger
2. Set breakpoints in TypeScript source (source maps enabled)
3. Use `DEBUG=1 npm start` for verbose logging

## Design Documentation

Comprehensive design docs in `design/`:
- `design/models/` - Universal model support
- `design/agents/` - Agents system architecture
- `design/workflows/` - Workflow orchestration
- `design/plan-todo/` - Plan+Todo system
- `design/spec-driven/` - Spec-driven development

See `design/README.md` for complete documentation index.

## Version Information

- **Node.js**: >= 20.0.0 required
- **Package Manager**: npm (workspaces)
- **Base**: Google Gemini CLI (forked and enhanced)
- **License**: Apache 2.0

Run `npm run preflight` before submitting changes to ensure all checks pass.
