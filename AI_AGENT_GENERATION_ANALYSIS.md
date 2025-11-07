# AI Agent 内容生成功能详细解析

> 本文档详细分析 fuxi-cli 中 `agents create` 交互式创建流程的第 7 步（Content Creation Method）选择 "AI Generate" 后的实现机制。

---

## 📖 目录

1. [功能概述](#功能概述)
2. [核心流程](#核心流程)
3. [关键模块解析](#关键模块解析)
4. [详细实现流程](#详细实现流程)
5. [Prompt 工程](#prompt-工程)
6. [数据结构](#数据结构)
7. [代码示例](#代码示例)
8. [流程图](#流程图)

---

## 功能概述

### 什么是 AI Generate？

在创建 Agent 的过程中，用户可以选择两种内容创建方式：

1. **Manual Template** - 创建空模板，用户手动填写
2. **AI Generate** ⭐ - 描述 Agent 的用途，AI 自动生成完整内容

AI Generate 功能会基于用户提供的 `purpose` 描述，自动生成包含以下内容的 Agent 配置：

- **Role**: Agent 的角色定义
- **Responsibilities**: Agent 的职责列表（3-5 条）
- **Guidelines**: Agent 的操作指南（3-5 条）
- **Constraints**: Agent 的限制条件（2-4 条）

---

## 核心流程

### 整体流程概览

```
用户选择 AI Generate
         ↓
    输入 Purpose
         ↓
  AgentContentGenerator.generateContent()
         ↓
  构建 Prompt → ModelService.generateContent()
         ↓
    AI 生成内容（结构化 Markdown）
         ↓
  parseGeneratedContent() 解析
         ↓
  buildSystemPrompt() 构建最终 Prompt
         ↓
  展示给用户 + 保存到 Agent 文件
```

---

## 关键模块解析

### 模块 1: AgentCreationSession

**文件位置**: `packages/core/src/agents/AgentCreationSession.ts`

**职责**: 管理 Agent 创建的多步骤交互状态

#### 关键步骤枚举

```typescript
export enum CreationStep {
  NAME = 'name',                  // 步骤 1: Agent 名称
  TITLE = 'title',                // 步骤 2: 显示标题
  DESCRIPTION = 'description',    // 步骤 3: 描述
  SCOPE = 'scope',                // 步骤 4: 作用域（项目/全局）
  MODEL = 'model',                // 步骤 5: 模型选择
  CONTEXT_MODE = 'context_mode',  // 步骤 6: 上下文模式
  CONTENT_METHOD = 'content_method', // 步骤 7: 内容创建方式 ⭐
  PURPOSE = 'purpose',            // 步骤 8: 用途描述（AI 模式）⭐
  TOOL_CATEGORIES = 'tool_categories', // 步骤 9: 工具类别
  CONFIRM = 'confirm',            // 步骤 10: 确认
  COMPLETE = 'complete',          // 完成
}
```

#### 步骤 7: 内容创建方式选择

**代码位置**: `AgentCreationSession.ts:365-373`

```typescript
case CreationStep.CONTENT_METHOD:
  return `📝 **Step 7/9: Content Creation Method**

How would you like to create the agent content?

  **1** or **ai** - AI Generate ⭐ - Describe purpose, AI creates content
  **2** or **manual** - Manual Template - Create empty template to fill yourself

Enter your choice:`;
```

**处理逻辑**: `agentsCommand.ts:324-333`

```typescript
case CreationStep.CONTENT_METHOD:
  const methodInput = input.toLowerCase();
  if (methodInput === '1' || methodInput === 'ai') {
    session.setContentMethod('ai');  // 进入 AI 模式
  } else if (methodInput === '2' || methodInput === 'manual') {
    session.setContentMethod('manual');  // 进入手动模式
  } else {
    error = 'Please enter 1/ai (AI) or 2/manual (Manual).';
  }
  break;
```

#### 步骤 8: Purpose 输入（AI 模式特有）

**Prompt**: `AgentCreationSession.ts:375-385`

```typescript
case CreationStep.PURPOSE:
  return `📝 **Step 8/9: Agent Purpose** (for AI generation)

Describe in detail what this agent should do.

Be specific! Good examples:
  ✅ "Debug Python and JavaScript errors with detailed explanations and step-by-step solutions"
  ✅ "Review code for security vulnerabilities following OWASP top 10 guidelines"
  ❌ "Debug code" (too vague)

Enter the purpose:`;
```

**关键验证**: `agentsCommand.ts:335-386`

```typescript
case CreationStep.PURPOSE:
  // 1. 验证输入不为空
  if (!input) {
    error = 'Purpose description is required for AI generation.';
  }
  // 2. 验证长度至少 10 个字符
  else if (input.length < 10) {
    error = 'Purpose description is too short. Please provide more detail (at least 10 characters).';
  }
  // 3. 立即调用 AI 生成内容
  else {
    session.setPurpose(input);

    if (state.contentMethod === 'ai' && context.services.config) {
      // 显示正在生成提示
      context.ui.addItem({
        type: MessageType.INFO,
        text: '🤖 **Generating AI content...**\n\nThis may take a few seconds...',
      }, Date.now());

      try {
        // 创建 ModelService 和 AgentContentGenerator
        const modelService = new ModelService(context.services.config);
        const generator = new AgentContentGenerator(modelService);

        // 调用 AI 生成
        const generated = await generator.generateContent(
          input,        // purpose
          state.name!,  // agentName
          state.title!  // agentTitle
        );

        // 保存生成的内容
        session.setGeneratedContent(generated.systemPrompt);

        // 展示生成结果
        context.ui.addItem({
          type: MessageType.INFO,
          text: `✨ **AI Generated Content:**
${'─'.repeat(70)}
${generated.systemPrompt}
${'─'.repeat(70)}

📊 **Content Summary:**
  - Role: ${generated.role.substring(0, 60)}...
  - Responsibilities: ${generated.responsibilities.length} items
  - Guidelines: ${generated.guidelines.length} items
  - Constraints: ${generated.constraints.length} items`,
        }, Date.now());

      } catch (genError) {
        error = `Failed to generate AI content: ${genError.message}`;
      }
    }
  }
  break;
```

---

### 模块 2: AgentContentGenerator

**文件位置**: `packages/core/src/agents/AgentContentGenerator.ts`

**职责**: 使用 AI 生成 Agent 内容的核心逻辑

#### 核心接口

```typescript
export interface GeneratedAgentContent {
  systemPrompt: string;      // 最终的系统 Prompt
  role: string;              // 角色描述
  responsibilities: string[]; // 职责列表
  guidelines: string[];      // 指南列表
  constraints: string[];     // 约束列表
}
```

#### 主方法: generateContent()

**代码位置**: `AgentContentGenerator.ts:25-53`

```typescript
async generateContent(
  purpose: string,      // 用户输入的用途描述
  agentName: string,    // Agent 名称
  agentTitle: string,   // Agent 标题
): Promise<GeneratedAgentContent> {
  // 1. 构建 Prompt
  const prompt = this.buildPrompt(purpose, agentName, agentTitle);

  // 2. 创建请求对象
  const request: UnifiedRequest = {
    messages: [
      {
        role: MessageRole.USER,
        content: [{ type: 'text', text: prompt }],
      },
    ],
    systemMessage: 'You are an expert at designing AI agent specifications. Generate clear, concise, and actionable agent definitions.',
  };

  // 3. 调用模型服务
  const response = await this.modelService.generateContent(request);

  // 4. 提取文本内容
  const textParts = response.content.filter((part: any) => part.type === 'text');
  const generatedText = textParts.map((p: any) => p.text).join('\n');

  // 5. 解析生成的内容
  return this.parseGeneratedContent(generatedText);
}
```

---

## 详细实现流程

### 步骤 1: 构建 Prompt

**方法**: `buildPrompt()` (`AgentContentGenerator.ts:55-88`)

```typescript
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
[A clear, concise description of the agent's role in 2-3 sentences]

## Responsibilities
[List 3-5 specific responsibilities, each as a bullet point]

## Guidelines
[List 3-5 guidelines for how the agent should operate, each as a bullet point]

## Constraints
[List 2-4 constraints or limitations, each as a bullet point]

**Important:**
- Be specific and actionable
- Use imperative language ("Analyze errors", "Provide suggestions")
- Keep each point concise (1-2 sentences max)
- Focus on the agent's unique purpose: ${purpose}

Generate the content now:`;
}
```

#### Prompt 设计要点

1. **清晰的结构要求**: 使用 Markdown 格式明确定义各个部分
2. **数量约束**: 明确每个部分的条目数量（如 3-5 条职责）
3. **语言风格指导**: 要求使用祈使句、简洁明了
4. **聚焦用途**: 强调围绕用户提供的 `purpose` 展开

---

### 步骤 2: 调用 AI 模型

**代码位置**: `AgentContentGenerator.ts:32-44`

```typescript
// 创建统一请求对象
const request: UnifiedRequest = {
  messages: [
    {
      role: MessageRole.USER,
      content: [{ type: 'text', text: prompt }],
    },
  ],
  systemMessage: 'You are an expert at designing AI agent specifications. Generate clear, concise, and actionable agent definitions.',
};

// 调用模型服务（支持多种模型）
const response = await this.modelService.generateContent(request);
```

**System Message 作用**:
- 定义 AI 的身份：AI Agent 规格设计专家
- 设定输出风格：清晰、简洁、可执行

---

### 步骤 3: 解析 AI 响应

**方法**: `parseGeneratedContent()` (`AgentContentGenerator.ts:90-147`)

#### 解析逻辑

```typescript
private parseGeneratedContent(text: string): GeneratedAgentContent {
  const lines = text.split('\n');
  let role = '';
  const responsibilities: string[] = [];
  const guidelines: string[] = [];
  const constraints: string[] = [];

  let currentSection: 'role' | 'responsibilities' | 'guidelines' | 'constraints' | null = null;
  let roleLines: string[] = [];

  // 逐行解析
  for (const line of lines) {
    const trimmed = line.trim();

    // 检测章节标题
    if (trimmed.startsWith('# Role')) {
      currentSection = 'role';
      continue;
    } else if (trimmed.startsWith('## Responsibilities')) {
      currentSection = 'responsibilities';
      continue;
    } else if (trimmed.startsWith('## Guidelines')) {
      currentSection = 'guidelines';
      continue;
    } else if (trimmed.startsWith('## Constraints')) {
      currentSection = 'constraints';
      continue;
    }

    // 跳过空行和标题行
    if (!trimmed || trimmed.startsWith('#')) continue;

    // 根据当前章节收集内容
    if (currentSection === 'role') {
      roleLines.push(trimmed);
    } else if (currentSection === 'responsibilities' && trimmed.startsWith('-')) {
      responsibilities.push(trimmed.substring(1).trim()); // 移除 '- '
    } else if (currentSection === 'guidelines' && trimmed.startsWith('-')) {
      guidelines.push(trimmed.substring(1).trim());
    } else if (currentSection === 'constraints' && trimmed.startsWith('-')) {
      constraints.push(trimmed.substring(1).trim());
    }
  }

  // 合并 role 的多行内容
  role = roleLines.join(' ').trim();

  // 构建最终的系统 Prompt
  const systemPrompt = this.buildSystemPrompt(role, responsibilities, guidelines, constraints);

  return {
    systemPrompt,
    role,
    responsibilities,
    guidelines,
    constraints,
  };
}
```

#### 解析策略

1. **状态机模式**: 使用 `currentSection` 跟踪当前解析的章节
2. **Markdown 格式识别**:
   - `# Role` → 角色章节
   - `## Responsibilities` → 职责章节
   - `## Guidelines` → 指南章节
   - `## Constraints` → 约束章节
3. **列表项提取**: 识别以 `-` 开头的项目，去除前缀后存储
4. **多行合并**: Role 可能有多行描述，合并为一段

---

### 步骤 4: 构建最终 System Prompt

**方法**: `buildSystemPrompt()` (`AgentContentGenerator.ts:149-181`)

```typescript
private buildSystemPrompt(
  role: string,
  responsibilities: string[],
  guidelines: string[],
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

  if (guidelines.length > 0) {
    prompt += `## Guidelines\n\n`;
    for (const guide of guidelines) {
      prompt += `- ${guide}\n`;
    }
    prompt += '\n';
  }

  if (constraints.length > 0) {
    prompt += `## Constraints\n\n`;
    for (const constraint of constraints) {
      prompt += `- ${constraint}\n`;
    }
  }

  return prompt.trim();
}
```

#### 输出格式示例

```markdown
# Role

Debug Python and JavaScript errors with detailed explanations and step-by-step solutions

## Responsibilities

- Analyze error messages and stack traces to identify root causes
- Provide clear explanations of why the error occurred
- Suggest multiple solution approaches with pros and cons
- Offer code snippets demonstrating the fix
- Explain best practices to prevent similar errors

## Guidelines

- Always read the full error message and stack trace
- Check for common mistakes first (typos, syntax errors)
- Consider the context and environment (Python version, dependencies)
- Provide working code examples
- Explain technical concepts in simple terms

## Constraints

- Focus only on Python and JavaScript debugging
- Do not modify code without explaining why
- Limit responses to debugging-related topics
```

---

### 步骤 5: 展示和保存

**展示给用户**: `agentsCommand.ts:364-381`

```typescript
context.ui.addItem({
  type: MessageType.INFO,
  text: `✨ **AI Generated Content:**

${'─'.repeat(70)}
${generated.systemPrompt}
${'─'.repeat(70)}

📊 **Content Summary:**
  - Role: ${generated.role.substring(0, 60)}${generated.role.length > 60 ? '...' : ''}
  - Responsibilities: ${generated.responsibilities.length} items
  - Guidelines: ${generated.guidelines.length} items
  - Constraints: ${generated.constraints.length} items`,
}, Date.now());
```

**保存到 Session**: `agentsCommand.ts:362`

```typescript
session.setGeneratedContent(generated.systemPrompt);
```

**写入 Agent 文件**: `agentsCommand.ts:419-433`

```typescript
const finalState = session.getState();
const agentManager = await getAgentManager(context);

await agentManager.createAgent({
  name: finalState.name!,
  title: finalState.title!,
  description: finalState.description,
  model: finalState.model!,
  contextMode: finalState.contextMode,
  scope: finalState.scope!,
  customSystemPrompt: finalState.generatedContent, // ← AI 生成的内容
  allowTools: finalState.allowTools || ['read_file', 'grep', 'glob', 'bash'],
  denyTools: finalState.denyTools || [],
});
```

---

## Prompt 工程

### 输入 Prompt 结构分析

```
You are creating an AI agent specification.

┌─────────────────────────────────────┐
│ 1. 上下文设定                        │
│    - Agent Name                     │
│    - Agent Title                    │
│    - Purpose (用户输入)              │
└─────────────────────────────────────┘
          ↓
┌─────────────────────────────────────┐
│ 2. 输出格式要求                      │
│    - # Role (2-3 sentences)         │
│    - ## Responsibilities (3-5)      │
│    - ## Guidelines (3-5)            │
│    - ## Constraints (2-4)           │
└─────────────────────────────────────┘
          ↓
┌─────────────────────────────────────┐
│ 3. 质量约束                          │
│    - Be specific and actionable     │
│    - Use imperative language        │
│    - Keep concise (1-2 sentences)   │
│    - Focus on purpose               │
└─────────────────────────────────────┘
```

### Prompt 优化技巧

1. **结构化输出**: 使用 Markdown 标记明确各部分边界
2. **数量约束**: 明确列表项数量，避免过长或过短
3. **语言风格**: 要求使用祈使句（"Analyze", "Provide"）而非描述句
4. **示例引导**: 在 Step 8 的提示中给出好坏示例对比

---

## 数据结构

### AgentCreationState

**文件位置**: `AgentCreationSession.ts:44-65`

```typescript
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
  contextMode?: 'isolated' | 'shared';
  contentMethod?: 'manual' | 'ai';  // ← 关键字段
  purpose?: string;                  // ← AI 模式特有
  toolCategories?: ToolCategory[];
  allowTools?: string[];
  denyTools?: string[];

  // AI generation result
  generatedContent?: string;         // ← 存储生成的 systemPrompt
}
```

### GeneratedAgentContent

**文件位置**: `AgentContentGenerator.ts:11-17`

```typescript
export interface GeneratedAgentContent {
  systemPrompt: string;      // 最终合成的完整 Prompt
  role: string;              // 提取的 Role 描述
  responsibilities: string[]; // 提取的职责列表
  guidelines: string[];      // 提取的指南列表
  constraints: string[];     // 提取的约束列表
}
```

---

## 代码示例

### 完整调用示例

```typescript
import { ModelService, AgentContentGenerator } from '@google/gemini-cli-core';

// 1. 创建模型服务
const config = /* 获取 Config 实例 */;
const modelService = new ModelService(config);

// 2. 创建内容生成器
const generator = new AgentContentGenerator(modelService);

// 3. 生成内容
const result = await generator.generateContent(
  "Debug Python and JavaScript errors with detailed explanations",  // purpose
  "debugger",    // agentName
  "Debugger"     // agentTitle
);

// 4. 使用结果
console.log('Role:', result.role);
console.log('Responsibilities:', result.responsibilities);
console.log('Guidelines:', result.guidelines);
console.log('Constraints:', result.constraints);
console.log('\nFull System Prompt:\n', result.systemPrompt);
```

### 预期输出

```markdown
# Role

An AI debugging assistant specialized in analyzing and resolving Python and JavaScript errors through systematic error analysis, clear explanations, and actionable solutions.

## Responsibilities

- Analyze error messages, stack traces, and code context to identify root causes
- Provide detailed explanations of why errors occur and their underlying mechanisms
- Suggest multiple solution approaches with trade-offs
- Demonstrate fixes with working code examples
- Educate users on best practices to prevent similar issues

## Guidelines

- Start with the error message and stack trace analysis
- Check for common mistakes before complex debugging
- Consider environment factors (versions, dependencies, configurations)
- Provide step-by-step debugging strategies
- Explain concepts in accessible language
- Test suggestions before recommending

## Constraints

- Focus exclusively on Python and JavaScript debugging
- Do not modify code without clear explanation
- Limit scope to debugging and error resolution
- Avoid unrelated coding assistance
```

---

## 流程图

### 完整交互流程

```
┌─────────────────────────────────────────────────────────┐
│                    用户启动创建流程                       │
│              /agents create --interactive               │
└─────────────────────┬───────────────────────────────────┘
                      ↓
           ┌──────────────────────┐
           │ Step 1-6: 基础配置   │
           │ • Name               │
           │ • Title              │
           │ • Description        │
           │ • Scope              │
           │ • Model              │
           │ • Context Mode       │
           └──────────┬───────────┘
                      ↓
        ┌─────────────────────────────────┐
        │ Step 7: Content Creation Method │
        │ [1] AI Generate ⭐              │
        │ [2] Manual Template             │
        └──────────┬──────────────────────┘
                   ↓ (选择 1/ai)
        ┌──────────────────────────────┐
        │ Step 8: Purpose 描述          │
        │ 用户输入详细的用途描述         │
        └──────────┬───────────────────┘
                   ↓
        ┌──────────────────────────────┐
        │ 显示: 🤖 Generating...        │
        └──────────┬───────────────────┘
                   ↓
    ┌──────────────────────────────────────┐
    │  AgentContentGenerator.generateContent()  │
    │  1. buildPrompt()                    │
    │  2. ModelService.generateContent()   │
    │  3. parseGeneratedContent()          │
    │  4. buildSystemPrompt()              │
    └──────────────┬───────────────────────┘
                   ↓
        ┌──────────────────────────────┐
        │ 展示生成结果                  │
        │ • Role                       │
        │ • Responsibilities (N items) │
        │ • Guidelines (N items)       │
        │ • Constraints (N items)      │
        └──────────┬───────────────────┘
                   ↓
        ┌──────────────────────────────┐
        │ Step 9: Tool Categories      │
        └──────────┬───────────────────┘
                   ↓
        ┌──────────────────────────────┐
        │ Step 10: Confirmation        │
        │ 用户确认所有配置              │
        └──────────┬───────────────────┘
                   ↓ (yes)
        ┌──────────────────────────────┐
        │ AgentManager.createAgent()   │
        │ 保存 AI 生成的 systemPrompt  │
        └──────────┬───────────────────┘
                   ↓
        ┌──────────────────────────────┐
        │ 成功创建 Agent                │
        │ 文件: .gemini/agents/xxx.md  │
        └───────────────────────────────┘
```

### AI 生成核心流程

```
┌─────────────────────────────────────────────────┐
│             buildPrompt(purpose, name, title)    │
│                                                  │
│  构建包含:                                       │
│  • Agent 元信息 (name, title, purpose)          │
│  • 输出格式要求 (Role, Responsibilities, etc.)   │
│  • 质量约束 (specific, actionable, concise)     │
└────────────────────┬────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│         ModelService.generateContent(request)    │
│                                                  │
│  SystemMessage: "You are an expert at           │
│                  designing AI agent specs..."    │
│  UserMessage: [上述构建的 Prompt]                │
└────────────────────┬────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│                AI 生成 Markdown 内容             │
│                                                  │
│  # Role                                          │
│  [描述]                                          │
│                                                  │
│  ## Responsibilities                             │
│  - Item 1                                        │
│  - Item 2                                        │
│  ...                                             │
│                                                  │
│  ## Guidelines                                   │
│  - Item 1                                        │
│  ...                                             │
│                                                  │
│  ## Constraints                                  │
│  - Item 1                                        │
│  ...                                             │
└────────────────────┬────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│          parseGeneratedContent(text)             │
│                                                  │
│  状态机解析:                                     │
│  1. 识别章节标题 (# Role, ## Responsibilities)   │
│  2. 提取各章节内容                               │
│  3. 处理列表项 (移除 '- ' 前缀)                 │
│  4. 合并多行文本                                 │
└────────────────────┬────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│   buildSystemPrompt(role, resp, guide, const)   │
│                                                  │
│  重新组装为规范化的 Markdown 格式:               │
│  • 统一格式                                      │
│  • 确保章节顺序                                  │
│  • 添加分隔符                                    │
└────────────────────┬────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│           返回 GeneratedAgentContent             │
│                                                  │
│  {                                               │
│    systemPrompt: "完整的 Markdown 内容",         │
│    role: "角色描述",                             │
│    responsibilities: ["职责1", "职责2", ...],    │
│    guidelines: ["指南1", "指南2", ...],          │
│    constraints: ["约束1", "约束2", ...]          │
│  }                                               │
└──────────────────────────────────────────────────┘
```

---

## 关键设计亮点

### 1. **分离的职责**

- **AgentCreationSession**: 管理交互流程和状态
- **AgentContentGenerator**: 专注于内容生成逻辑
- **AgentManager**: 负责文件创建和持久化

清晰的职责分离使代码易于测试和维护。

### 2. **结构化 Prompt 设计**

通过 Markdown 格式明确输出结构，使 AI 响应更可预测和易于解析。

### 3. **容错机制**

```typescript
try {
  const generated = await generator.generateContent(...);
  session.setGeneratedContent(generated.systemPrompt);
} catch (genError) {
  error = `Failed to generate AI content: ${genError.message}`;
  // 用户可以选择继续使用手动模板
}
```

### 4. **即时反馈**

在生成过程中显示 "🤖 Generating..." 提示，提升用户体验。

### 5. **模型服务抽象**

通过 `ModelService` 抽象层，支持多种 AI 模型（Gemini、Claude、OpenAI 等）。

---

## 可扩展点

### 1. **增强 Prompt 模板**

可以为不同类型的 Agent（调试、代码审查、文档生成）设计专门的 Prompt 模板。

### 2. **多语言支持**

根据用户语言自动调整 Prompt 和输出语言。

### 3. **模板库**

预定义常见 Agent 类型的模板，用户可选择基于模板生成。

### 4. **反馈循环**

允许用户对生成结果提供反馈，进一步优化生成质量。

### 5. **增量生成**

先生成 Role，让用户确认后再生成 Responsibilities，逐步完善。

---

## 总结

AI Agent 内容生成功能是 fuxi-cli 的一个优秀设计示例，展示了：

1. ✅ **清晰的架构分层**: Session 管理、内容生成、持久化各司其职
2. ✅ **优秀的 Prompt 工程**: 结构化输出、明确约束、质量控制
3. ✅ **健壮的错误处理**: 验证输入、捕获异常、提供降级方案
4. ✅ **良好的用户体验**: 即时反馈、详细展示、清晰指引
5. ✅ **可扩展的设计**: 模型无关、易于测试、便于迭代

通过这个功能，用户只需描述 Agent 的用途，AI 就能自动生成高质量的 Agent 配置，大大降低了创建 Agent 的门槛，提升了开发效率。

---

**相关文件**:
- `packages/core/src/agents/AgentCreationSession.ts` - 交互流程管理
- `packages/core/src/agents/AgentContentGenerator.ts` - 内容生成核心
- `packages/cli/src/ui/commands/agentsCommand.ts` - CLI 命令实现
- `packages/core/src/services/modelService.ts` - 模型服务抽象层
