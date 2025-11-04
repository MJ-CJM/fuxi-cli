<p align="center">
  <img src="./images/logo.jpg" alt="伏羲 CLI Logo" width="200"/>
</p>

<p align="center">
  <strong>
    <a href="README.md">简体中文</a> | 
    <a href="README_EN.md">English</a>
  </strong>
</p>

# 伏羲 CLI (fuxi-cli)

<p align="center">
  <strong>基于 Gemini CLI 的增强版 AI 命令行工具</strong>
</p>

<p align="center">
  支持自定义模型 • Agents 智能体系统 • 智能路由与协作 • Plan-Todo 模式 • 规格驱动开发
</p>

---

## 📖 项目简介

**伏羲 CLI** 是基于 [Google Gemini CLI](https://github.com/google-gemini/gemini-cli) 开发的增强版本，专为国内开发者优化。在保留原有强大功能的基础上，提供了丰富的核心扩展功能：

### 🎯 核心扩展功能

| 功能 | 说明 | 状态 |
|------|------|------|
| 🤖 **自定义模型支持** | 零代码配置接入通义千问、DeepSeek、本地模型等 | ✅ 已完成 |
| 🎭 **Agents 智能体系统** | 创建专业化 AI 助手，独立上下文和工具权限 | ✅ 已完成 |
| 🧭 **智能路由与移交** | 自动选择最佳 Agent，支持 Agent 间协作 | ✅ 已完成 |
| 🔄 **Workflow 工作流** | 多 Agent 编排，支持顺序和并行执行 | ✅ 已完成 |
| 📋 **Plan+Todo 模式** | 先规划后执行，结构化任务分解和管理 | ✅ 已完成 |
| 📐 **Spec 规格驱动开发** | Constitution → Spec → Plan → Tasks → Execute 完整链路 | ✅ 已完成 |

### ⚡ 继承的强大功能

- 🧠 **超大上下文窗口**：支持 1M token 上下文
- 🔧 **丰富的内置工具**：文件操作、Shell 命令、Git 集成
- 🔌 **MCP 协议支持**：扩展外部服务集成
- 💻 **终端优先设计**：为命令行用户深度优化
- 🛡️ **开源**：Apache 2.0 许可证

<!-- > 💡 完整的 Gemini CLI 功能文档请参考：[README-CLI.md](./README-CLI.md) -->

---

## 🚀 快速开始

### 安装

#### 方式一：NPM 全局安装（推荐）

```bash
# 全局安装
npm install -g fuxi-cli

# 启动
fuxi-cli
```

#### 方式二：源码安装

```bash
# 克隆仓库
git clone https://github.com/chenjiamin/fuxi-cli.git
cd fuxi-cli

# 安装依赖
npm install

# 构建项目
npm run build

# 启动 CLI
npm start
```

### 系统要求

- Node.js 20.0.0 或更高版本
- macOS、Linux 或 Windows

---

## 🎯 核心功能

### 1️⃣ 自定义模型支持

通过简单的配置文件即可接入任意 OpenAI 兼容的 AI 模型，无需修改代码。

#### 支持的模型类型

- ✅ 国内大模型：通义千问、DeepSeek、智谱 GLM、文心一言
- ✅ 本地模型：Ollama、LM Studio
- ✅ 企业自部署模型
- ✅ 任何 OpenAI 兼容 API

#### 快速配置示例

##### 步骤 1：配置模型（`~/.gemini/config.json`）

**通义千问 (Qwen)**

```json
{
  "useModelRouter": true,                    // 必须：启用自定义模型支持
  "defaultModel": "qwen3-coder-flash",       // 推荐：默认使用的模型
  "models": {
    "qwen3-coder-flash": {
      "provider": "openai",                  // 必须：使用 OpenAI 兼容适配器
      "model": "qwen3-coder-flash",         // 必须：API 调用的模型名
      "apiKey": "sk-your-api-key",          // 必须：通义千问 API Key
      "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",  // 必须：通义千问 API 地址
      "metadata": {
        "providerName": "qwen",             // 推荐：身份标识（AI 会说"我是通义千问"）
        "displayName": "通义千问"            // 可选：UI 显示名称
      },
      "capabilities": {
        "maxOutputTokens": 8192,            // 推荐：最大输出 token 数
        "supportsFunctionCalling": true,   // 重要：Qwen 支持工具调用（必须 true）
        "supportsMultimodal": true         // 重要：Qwen 支持数组格式（必须 true）
      }
    }
  }
}
```

**DeepSeek**

```json
{
  "models": {
    "deepseek-coder": {
      "provider": "openai",
      "model": "deepseek-coder",
      "apiKey": "sk-your-api-key",
      "baseUrl": "https://api.deepseek.com",
      "metadata": {
        "providerName": "deepseek",
        "displayName": "DeepSeek"
      },
      "capabilities": {
        "maxOutputTokens": 4096,
        "supportsFunctionCalling": false,  // 重要：DeepSeek 不支持（必须 false）
        "supportsMultimodal": false        // 重要：DeepSeek 不支持（必须 false）
      }
    }
  }
}
```

**⚠️ 重要**：
- 通义千问：`supportsFunctionCalling` 和 `supportsMultimodal` 必须为 `true`
- DeepSeek：`supportsFunctionCalling` 和 `supportsMultimodal` 必须为 `false`

##### 步骤 2：配置系统设置（`~/.gemini/settings.json`）

```json
{
  "experimental": {
    "useModelRouter": true                   // 必须：与 config.json 配合启用自定义模型
  },
  "security": {
    "auth": {
      "selectedType": "custom-model"         // 推荐：使用自定义模型认证
    }
  },
  "model": {
    "name": "qwen3-coder-flash"             // 可选：当前使用的模型
  }
}
```

##### 步骤 3：使用自定义模型

```bash
# 切换模型
/model use qwen3-coder-flash

# 查看当前模型
/model info

# 列出所有模型
/model list
```

📚 **详细文档**：[添加新模型指南](./design/models/add-new-model-guide.md) | [模型系统设计](./design/models/universal-model-support.md) | [模型系统概述](./design/models/README.md)

---

### 2️⃣ Agents 智能体系统

创建专业化的 AI 智能体，每个 Agent 具有独立的上下文、工具权限和行为特征。

#### 什么是 Agent？

Agent 是一个专门化的 AI 助手，具有：

- 🔄 **灵活的上下文模式**：
  - `isolated`：独立上下文，对话历史与主会话隔离
  - `shared`：共享上下文，可以访问主会话的对话历史
- 🛠️ **工具控制**：精确控制可用工具（白名单/黑名单）
- 📝 **自定义提示词**：为特定任务定制行为
- 🔌 **MCP 集成**：连接外部服务
- 🧭 **智能路由**：通过触发器自动匹配用户意图

#### 快速创建 Agent

**方式一：交互式创建（推荐）** ⭐

```bash
# 启动交互式创建向导
/agents create -i

# 按照提示依次输入：
# 1. Agent 名称（如：code_review）
# 2. 显示标题（如：代码审查助手）
# 3. 描述（可选）
# 4. 作用域（project/global）
# 5. 选择模型
# 6. 上下文模式（isolated/shared）
# 7. 创建方式（AI 生成/手动模板）
# 8. Agent 用途描述（AI 会自动生成内容）
# 9. 工具权限配置
```

**方式二：命令行快速创建**

```bash
# 创建代码审查 Agent
/agents create code-review \
  --title "代码审查助手" \
  --model qwen-coder-plus

# 使用 AI 生成内容
/agents create debug-analyzer \
  --title "调试专家" \
  --ai \
  --purpose "系统性分析代码错误，提供详细的调试步骤和根因分析" \
  --model deepseek-coder
```

**创建完成后的提示**

```
✅ Agent "code_review" Created Successfully!

📁 File Location:
   .gemini/agents/code_review.md

📝 Next Steps:
   1. Review: cat .gemini/agents/code_review.md
   2. Edit: vim .gemini/agents/code_review.md
   3. Validate: /agents validate code_review
   4. Info: /agents info code_review
   5. List: /agents list
```

#### Agent 配置示例

查看生成的 `.gemini/agents/code_review.md`：

```yaml
---
kind: agent
name: code_review
title: Code_review
description: code review
model: deepseek-coder
scope: project
version: 1.0.0
contextMode: shared
tools:
  allow: ["read_file","read_many_files","ls","glob","grep","rg","web_fetch","web_search"]
  deny: []
mcp:
  servers: []
handoffs:
  - to: code_imple
    when: manual
    description: "当用户需要实现代码、修复bug或编写功能时，移交给 code_imple agent"
    include_context: true
---

# Role

⚠️ **你是代码审查专家 - 只负责审查代码质量，不实现代码**

## 关键规则 - 首先判断任务类型

在做任何事情之前，先判断任务类型：

1. **如果用户要求实现/修复/编写代码**（关键词：实现、修复、编写、开发、写代码、implement、fix、write、develop）：
   - ❌ 不要读取任何文件
   - ❌ 不要进行任何分析
   - ✅ 立即使用 `transfer_to_code_imple` 工具移交任务

2. **如果用户要求审查/检查/分析代码**（关键词：审查、检查、分析、review、check、analyze）：
   - ✅ 读取必要的文件
   - ✅ 分析代码质量
   - ✅ 提供审查反馈
```

**字段说明**：

- `contextMode`: `shared`（共享主会话上下文）或 `isolated`（独立上下文）
- `tools.allow`: 允许使用的工具列表（JSON 数组格式）
- `tools.deny`: 禁止使用的工具列表
- `scope`: `project`（项目级）或 `global`（全局）
- `mcp.servers`: MCP 服务器列表（如 `["github", "slack"]`）

#### 使用 Agent

```bash
# 运行 Agent
/agents run code-review 帮我审查 src/main.ts

# 或使用 @ 语法
@code-review 检查这个文件的代码质量

# 列出所有 Agent
/agents list

# 查看 Agent 详情
/agents info code-review
```

📚 **详细文档**：[Agents 快速开始](./design/agents/QUICK_START.md) | [Agents 系统设计](./design/agents/DESIGN.md) | [实现细节](./design/agents/IMPLEMENTATION.md) | [命令参考](./design/agents/COMMANDS.md)

---

### 3️⃣ 智能路由与移交

根据用户输入自动选择最合适的 Agent，并支持 Agent 之间的智能协作。

#### 智能路由

系统会根据关键词、正则表达式或 AI 推理，自动选择最适合的 Agent。

**配置路由触发器**

编辑 Agent 文件，添加 `triggers`：

```yaml
---
kind: agent
name: code-review
title: 代码审查助手
triggers:
  keywords:
    - 审查
    - review
    - 检查
    - 代码质量
  patterns:
    - "检查.*代码"
    - "review.*code"
  priority: 80
---
```

**三种路由策略**

| 策略 | 性能 | 准确度 | 适用场景 |
|------|------|--------|----------|
| `rule` | 极快 (< 10ms) | 中等 | 明确的关键词触发 |
| `llm` | 较慢 (1-3s) | 高 | 复杂语义理解 |
| `hybrid` | 快速 (10-100ms) | 高 | 推荐默认使用 ⭐ |

**启用和测试路由**

```bash
# 启用智能路由
/agents config enable
/agents config set strategy hybrid

# 测试路由（不执行）
/agents route "帮我审查这段代码"

# 输出示例：
# ✅ Routing Result
# Selected Agent: code-review
# Confidence: 92%
# Matched Keywords: 审查

# 一步完成路由和执行
/agents route "帮我审查这段代码" --execute
```

#### Agent 移交

Agent 可以在执行过程中将任务移交给其他专业 Agent。

**配置移交关系**

```yaml
---
kind: agent
name: code_review
title: 代码审查助手
handoffs:
  - to: code_imple
    when: manual
    description: "当用户需要实现代码、修复bug或编写功能时，移交给 code_imple agent"
    include_context: true
---
```

**移交场景说明**

code_review agent 专注于代码审查，当检测到用户实际想要**实现代码**而非**审查代码**时，会自动移交：

```bash
# 场景1：用户误用 code_review agent 请求实现功能
> @code_review 帮我实现一个登录功能

# Agent 行为：
# [code_review]: 检测到这是代码实现任务，正在移交给 code_imple agent...
# [HandoffManager] Initiating handoff: code_review -> code_imple
# [code_imple]: 好的，我来帮你实现登录功能...

# 场景2：审查后发现需要修复
> @code_review 检查 auth.ts 的代码质量

# [code_review]: 发现以下问题：
# - 🔴 SQL 注入风险（必须修复）
# - 🟡 密码强度检查不足
# 
# 需要我移交给 code_imple agent 进行修复吗？
```

**安全机制**

- ✅ 循环检测：自动防止 A → B → A 循环移交
- ✅ 深度限制：最大移交深度 5 层
- ✅ 追踪机制：每个移交链有唯一 correlation_id

📚 **详细文档**：[智能路由系统](./design/agents/routing/README.md) | [Agent 移交系统](./design/agents/handoff/README.md) | [P2 功能总结](./design/agents/completion-summaries/p2-completion.md)

---

### 4️⃣ Workflow 工作流 ✅

多 Agent 编排系统，支持预定义复杂的执行流程，显著提升开发效率。

#### 核心特性

- 📋 **YAML 配置**：使用 YAML 文件定义工作流
- 🔗 **顺序执行**：按步骤依次执行多个 Agent 任务
- ⚡ **并行执行**：多个 Agent 同时运行，时间减半
- 🎯 **条件执行**：支持 when 表达式控制执行逻辑
- 🔄 **错误处理**：continue/stop/retry 策略，min_success 配置
- 📊 **模板变量**：步骤间数据传递和嵌套引用
- 🏷️ **智能路由**：支持触发器自动匹配

#### 顺序工作流示例

```yaml
# .gemini/workflows/code-quality-pipeline.yaml
---
kind: workflow
name: code-quality-pipeline
title: 代码质量流水线
description: 完整的代码质量检查流程

triggers:
  keywords: [质量检查, quality check, 完整审查]
  priority: 90

steps:
  - id: review
    agent: code_review
    description: "审查代码质量"
    input: "${workflow.input}"

  - id: fix
    agent: code_imple
    description: "修复发现的问题"
    when: "${review.data.issues_found} > 0"
    input: "修复以下问题：${review.output}"

  - id: test
    agent: test_writer
    description: "编写测试用例"
    input: "为修复后的代码编写测试"

error_handling:
  on_error: continue
  max_retries: 2

timeout: 600000  # 10 分钟
---
```

#### 并行工作流示例 ⭐

```yaml
# .gemini/workflows/parallel-review.yaml
---
kind: workflow
name: parallel-review
title: 并行代码审查
description: 两个审查员并行审查，专业汇总，统一修复

steps:
  # Step 1: 并行审查（同时执行，时间减半）
  - type: parallel
    id: dual_review
    description: "两个审查员并行审查代码"
    parallel:
      - id: reviewer_a
        agent: code_review
        description: "代码质量审查"
        input: "审查文件：${workflow.input}"
        timeout: 90000

      - id: reviewer_b
        agent: code_review_pro
        description: "安全审查"
        input: "安全审查：${workflow.input}"
        timeout: 90000

    timeout: 120000
    error_handling:
      on_error: continue
      min_success: 1  # 至少一个成功即可

  # Step 2: 汇总审查结果
  - id: aggregate_reviews
    agent: review_aggregator
    description: "汇总两个审查员的意见"
    input: |
      汇总以下审查意见：
      质量审查：${dual_review.reviewer_a.output}
      安全审查：${dual_review.reviewer_b.output}

  # Step 3: 统一修复
  - id: implement_fixes
    agent: code_imple
    description: "根据汇总报告修复代码"
    input: "修复问题：${aggregate_reviews.output}"

error_handling:
  on_error: continue

timeout: 600000
---
```

**并行执行优势**：
- ⚡ **速度提升 50%**：两个审查员同时工作
- 🎯 **多维度分析**：质量 + 安全双重保障
- 📊 **智能汇总**：专业 Agent 去重和分类问题
- 🔧 **一键完成**：审查、汇总、修复全自动

#### 使用工作流

```bash
# 列出所有工作流
/workflow list

# 运行工作流
/workflow run parallel-review "src/auth.ts"

# 查看工作流详情
/workflow info parallel-review

# 验证工作流定义
/workflow validate parallel-review

# 删除工作流
/workflow delete old-workflow
```

#### 模板变量系统

支持丰富的变量引用：

```yaml
# 用户输入
${workflow.input}

# 步骤输出
${stepId.output}

# 提取的数据
${stepId.data.key}

# 并行子步骤输出（嵌套引用）
${parallelGroupId.substepId.output}

# 并行组聚合数据
${parallelGroupId.data.success_count}
${parallelGroupId.data.failed_count}
${parallelGroupId.data.total_count}
```

**当前状态**：✅ 已完成，包括 WorkflowManager、WorkflowExecutor、CLI 集成、并行执行、完整文档

📚 **详细文档**：[Workflow 用户指南](./design/workflows/USER_GUIDE.md) | [系统设计](./design/workflows/design.md) | [Workflow 概述](./design/workflows/README.md)

---

### 5️⃣ Plan+Todo 模式 ✅

**先规划后执行**的两阶段工作流，让复杂任务井然有序。

#### 核心特性

- 🔒 **安全的 Plan 模式**：只读模式，只分析不修改代码
- 📋 **结构化计划**：包含步骤、风险评估、测试策略
- ✅ **智能依赖检查**：自动验证任务依赖关系
- ⚙️ **灵活执行模式**：支持自动（auto_edit）和手动（default）审批
- 🚀 **批量执行**：`/todos execute-all` 一键执行所有待办
- 📊 **进度追踪**：清晰的任务状态显示

#### 工作流程

**1. Plan 阶段（规划）**

```bash
# 按 Ctrl+P 进入 Plan 模式
> [Ctrl+P]
[PLAN] >

# AI 分析需求并创建计划
[PLAN] > 帮我规划实现用户登录功能

✅ Plan Created: "Implement User Login"

Steps (5):
1. step-1: Create User model ⏱️ 30min
2. step-2: Implement JWT [deps: step-1] ⏱️ 45min
3. step-3: Create API endpoints [deps: step-2] ⏱️ 30min
4. step-4: Add frontend login form [deps: step-3] ⏱️ 1h
5. step-5: Write tests [deps: step-1, step-2, step-3] ⏱️ 1h

Risks: Password hashing, Token security
Testing: Unit tests + Integration tests

# 退出 Plan 模式
> [Ctrl+P]
```

**2. Todo 阶段（执行）**

```bash
# 将计划转换为待办任务
> /plan to-todos
✅ Created 5 todos

# 查看任务列表
> /todos list

📋 Todo List (5 total)
⬜ 5 pending

### HIGH Priority
⬜ step-1 - Create User model ⏱️ 30min
⬜ step-2 - Implement JWT [deps: step-1] ⏱️ 45min
  ⚠️  Token security vulnerabilities

# 执行单个任务（自动模式）
> /todos execute step-1 --mode=auto_edit
✓ write_file models/User.ts
✅ Task completed

# 或批量执行所有任务
> /todos execute-all --mode=auto_edit

🚀 Starting Batch Execution
📊 Total todos: 5

▶️  [1/5] Create User model...
✓ write_file models/User.ts

▶️  [2/5] Implement JWT...
✓ write_file auth/jwt.ts

[...]

✅ Batch Execution Complete!
📊 Executed 5/5 todos in 3 minutes
```

#### 执行模式

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| `default` | 每个操作需要确认 | 核心业务逻辑、数据库操作 |
| `auto_edit` | 自动批准所有操作 | UI 组件、测试代码、文档 |

#### 典型使用场景

- 🏗️ **功能开发**：先规划架构和步骤，再逐步实现
- 🔄 **代码重构**：分析风险，制定安全的重构步骤
- 📚 **学习代码库**：使用 Plan 模式分析代码结构
- 💾 **数据库迁移**：详细规划迁移步骤和回滚方案

**当前状态**：✅ 已完成，包括 Plan 模式、Todo 管理、批量执行、完整文档

📚 **详细文档**：[完整用户手册](./design/plan-todo/COMPLETE_USER_MANUAL.md) | [快速指南](./design/plan-todo/USER_GUIDE.md) | [设计与实现](./design/plan-todo/DESIGN_AND_IMPLEMENTATION.md)

---

### 6️⃣ Spec 规格驱动开发 ✅

受 **GitHub Spec Kit** 启发的结构化软件开发系统，将"意图 → 规格 → 方案 → 任务 → 实施"做成可复用、可审查的链路。

#### 核心流程

```
Constitution (宪章) → Specification (规格) → Technical Plan (技术方案) → Tasks (任务) → Implementation (实施)
```

#### 核心特性

- 🏛️ **Constitution 宪章**：定义项目工程原则、质量标准、架构指南
- 📋 **Specification 规格**：业务需求文档化，专注 WHAT 和 WHY
- 🏗️ **Technical Plan 方案**：技术设计，支持多版本（v1, v2...）
- ✅ **Task List 任务**：可执行任务，支持多变体（default, detailed...）
- 🚀 **自动执行**：批量执行任务，依赖解析，进度跟踪

#### 快速使用

```bash
# 1. 创建宪章（一次性）
/spec constitution --init

# 2. 创建业务规格
/spec new
# → AI 引导，生成 feat-user-auth

# 3. 生成技术方案
/spec plan new feat-user-auth
# → AI 设计，生成 plan-feat-user-auth-v1

# 4. 生成任务列表
/spec tasks new plan-feat-user-auth-v1
# → AI 拆分，生成 plan-feat-user-auth-v1-default

# 5. 批量执行任务
/spec execute start plan-feat-user-auth-v1-default
# → AI 自动执行所有任务
```

#### 典型应用场景

- 🆕 **新功能开发**：完整的需求 → 设计 → 实施流程
- 🐛 **Bug 修复**：问题规格化，系统性解决
- 🔄 **代码重构**：风险评估，安全重构
- 📈 **架构升级**：多方案对比，选择最优

📚 **详细文档**：[快速开始](./design/spec-driven/QUICK_START_CN.md) | [用户指南](./design/spec-driven/USER_GUIDE_CN.md) | [命令参考](./design/spec-driven/COMMANDS_CN.md)

---

## 📋 常用命令

### 模型管理

```bash
# 列出所有可用模型
/model list

# 切换模型
/model use qwen-coder-plus

# 查看当前模型
/model info
```

### Agent 管理

```bash
# 列出所有 Agents
/agents list

# 创建 Agent（交互式，推荐）
/agents create -i

# 创建 Agent（命令行方式）
/agents create <name> --title "标题" --model <模型名>

# 创建 Agent（AI 生成内容）
/agents create <name> --ai --purpose "Agent 用途描述"

# 运行 Agent
/agents run <name> <prompt>
@<name> <prompt>

# 查看 Agent 信息
/agents info <name>

# 验证 Agent 配置
/agents validate <name>

# 删除 Agent
/agents delete <name>

# 清除 Agent 对话历史
/agents clear <name>
```

### 路由配置

```bash
# 查看路由配置
/agents config show

# 启用/禁用路由
/agents config enable
/agents config disable

# 设置路由策略
/agents config set strategy hybrid

# 测试路由
/agents route "你的提示词"
/agents route "你的提示词" --execute
```

### Workflow 管理

```bash
# 列出所有 Workflow
/workflow list

# 查看 Workflow 详情
/workflow info <workflow-name>

# 执行 Workflow
/workflow run <workflow-name> "<input>"

# 验证 Workflow 定义
/workflow validate <workflow-name>

# 删除 Workflow
/workflow delete <workflow-name>
```

### Plan+Todo 管理

```bash
# Plan 模式操作
[Ctrl+P]              # 切换 Plan 模式
/plan show            # 显示当前计划
/plan to-todos        # 转换为 todos
/plan clear           # 清除计划

# Todo 管理
/todos list           # 列出所有 todos
/todos execute <id> [--mode=auto_edit|default]  # 执行单个 todo
/todos execute-all [--mode=auto_edit|default]   # 批量执行所有 todos
/todos update <id> <status>  # 更新 todo 状态
/todos export         # 导出为 JSON
/todos clear          # 清除所有 todos
```

### Spec 规格驱动开发

```bash
# Constitution 宪章管理
/spec constitution --init  # 初始化项目宪章
/spec constitution         # 显示当前宪章

# Specification 规格管理
/spec new                  # 创建新规格（AI 引导）
/spec list                 # 列出所有规格
/spec show <spec-id>       # 显示规格详情
/spec search <query>       # 搜索规格
/spec filter category:feature  # 按类别过滤
/spec delete <spec-id>     # 删除规格

# Technical Plan 技术方案
/spec plan new <spec-id>   # 生成技术方案
/spec plan list <spec-id>  # 列出所有方案
/spec plan show <plan-id>  # 显示方案详情
/spec plan activate <plan-id>  # 激活方案

# Task List 任务列表
/spec tasks new <plan-id>  # 生成任务列表
/spec tasks show <tasks-id>  # 显示任务详情

# Execution 执行
/spec execute start <tasks-id>  # 批量执行任务
/spec execute status <tasks-id>  # 查看执行状态
```

### 通用命令

```bash
# 查看帮助
/help

# 初始化项目上下文
/init

# 开始新对话
/chat

# 保存会话
/save

# 加载会话
/load
```

---

## 📚 文档导航

### 用户指南

- 🎭 [Agents 用户指南](./design/agents/USER_GUIDE.md) - Agents 系统完整使用手册
- 🚀 [Agents 快速开始](./design/agents/QUICK_START.md) - 5 分钟上手指南
- 🔄 [Workflow 用户指南](./design/workflows/USER_GUIDE.md) - Workflow 完整使用指南
- 📋 [Plan+Todo 用户手册](./design/plan-todo/COMPLETE_USER_MANUAL.md) - Plan+Todo 完整手册
- 📐 [Spec 规格驱动开发](./design/spec-driven/QUICK_START_CN.md) - Spec-Driven Development 快速开始
- 🤖 [如何添加新模型](./design/models/add-new-model-guide.md) - 自定义模型配置指南

### 设计文档

- 📐 [整体架构设计](./design/README.md) - 所有功能的设计文档索引
- 🎭 [Agents 系统设计](./design/agents/DESIGN.md) - Agents 架构设计
- 🧭 [智能路由系统](./design/agents/routing/README.md) - 路由功能设计
- 🔄 [Workflow 系统设计](./design/workflows/design.md) - 工作流架构
- 📋 [Plan+Todo 设计](./design/plan-todo/DESIGN_AND_IMPLEMENTATION.md) - Plan+Todo 架构设计
- 📐 [Spec 系统概览](./design/spec-driven/README.md) - Spec-Driven Development 系统设计
- 🤖 [模型系统设计](./design/models/universal-model-support.md) - 通用模型支持架构

### 开发文档

- 🏗️ [架构概览](./docs/architecture.md) - 系统架构概览
- 🤝 [贡献指南](./CONTRIBUTING.md) - 如何参与开发
- 📝 [开发环境搭建](./study/06-dev-setup.md) - 开发环境配置

---

## 🎨 配置示例

### `~/.gemini/config.json` - 多模型配置

```json
{
  // ========== 顶层配置 ==========
  "useModelRouter": true,                    // 必须：启用自定义模型支持
  "defaultModel": "qwen3-coder-flash",       // 推荐：默认模型（启动时使用）
  
  // ========== 模型定义 ==========
  "models": {
    // 通义千问 Flash（推荐用于日常开发）
    "qwen3-coder-flash": {
      "provider": "openai",                  // 必须：OpenAI 兼容适配器
      "model": "qwen3-coder-flash",         // 必须：API 调用的模型名
      "apiKey": "sk-your-qwen-api-key",     // 必须：从通义千问控制台获取
      "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",  // 必须：通义千问 API 端点
      "metadata": {
        "providerName": "qwen",             // 推荐：身份标识（AI 会说"我是通义千问"）
        "displayName": "通义千问 Flash"      // 可选：UI 显示名称
      },
      "capabilities": {
        "maxOutputTokens": 8192,            // 推荐：最大输出 token 数
        "supportsFunctionCalling": true,   // 重要：Qwen 支持工具调用（必须 true）
        "supportsMultimodal": true         // 重要：Qwen 支持数组格式（必须 true）
      }
    },
    
    // 通义千问 Plus（高级任务）
    "qwen-coder-plus": {
      "provider": "openai",
      "model": "qwen-coder-plus",
      "apiKey": "sk-your-qwen-api-key",
      "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
      "metadata": {
        "providerName": "qwen",
        "displayName": "通义千问 Plus"
      },
      "capabilities": {
        "maxOutputTokens": 8192,
        "supportsFunctionCalling": true,
        "supportsMultimodal": true
      }
    },
    
    // DeepSeek（代码生成）
    "deepseek-coder": {
      "provider": "openai",
      "model": "deepseek-coder",
      "apiKey": "sk-your-deepseek-key",     // 必须：从 DeepSeek 官网获取
      "baseUrl": "https://api.deepseek.com", // 必须：DeepSeek API 端点
      "metadata": {
        "providerName": "deepseek",
        "displayName": "DeepSeek Coder"
      },
      "capabilities": {
        "maxOutputTokens": 4096,
        "supportsFunctionCalling": false,  // 重要：DeepSeek 不支持（必须 false）
        "supportsMultimodal": false        // 重要：DeepSeek 不支持（必须 false）
      }
    },
    
    // 本地 Ollama（离线开发）
    "local-qwen": {
      "provider": "openai",
      "model": "qwen2.5-coder:32b",
      "apiKey": "ollama",                   // Ollama 不需要真实 key
      "baseUrl": "http://localhost:11434/v1",
      "metadata": {
        "providerName": "qwen",
        "displayName": "本地千问"
      },
      "capabilities": {
        "maxOutputTokens": 4096,
        "supportsFunctionCalling": false   // 本地模型通常不支持
      }
    }
  }
}
```

### `~/.gemini/settings.json` - 系统设置

```json
{
  // ========== 通用设置 ==========
  "general": {
    "disableAutoUpdate": true,               // 推荐：禁用自动更新
    "disableUpdateNag": true                 // 推荐：禁用更新提示
  },
  
  // ========== IDE 集成 ==========
  "ide": {
    "hasSeenNudge": true                     // 内部：已看过提示
  },
  
  // ========== MCP 服务器 ==========
  "mcpServers": {
    "context7": {                            // MCP 服务器名称（可选配置）
      "httpUrl": "https://mcp.context7.com/mcp",  // HTTP MCP 端点
      "headers": {
        "CONTEXT7_API_KEY": "your-api-key",       // API 认证
        "Accept": "application/json, text/event-stream"
      }
    }
  },
  
  // ========== 模型设置 ==========
  "model": {
    "name": "qwen3-coder-flash"              // 当前使用的模型
  },
  
  // ========== 安全设置 ==========
  "security": {
    "auth": {
      "selectedType": "custom-model"         // 必须：使用自定义模型认证
    }
  },
  
  // ========== 实验性功能 ==========
  "experimental": {
    "useModelRouter": true                   // 必须：启用模型路由（与 config.json 配合）
  },
  
  // ========== 受信任文件夹 ==========
  "trustedFolders": [
    "/path/to/your/trusted/project"          // 可选：受信任的项目目录
  ]
}
```

### 配置字段说明

#### config.json 核心字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `useModelRouter` | boolean | ✅ 是 | 启用自定义模型支持，**必须 `true`** |
| `defaultModel` | string | ⚠️ 推荐 | 默认模型名，必须在 `models` 中定义 |
| `models.<name>.provider` | string | ✅ 是 | 提供商：`"openai"`（兼容）、`"gemini"`、`"claude"` |
| `models.<name>.model` | string | ✅ 是 | API 调用的实际模型名 |
| `models.<name>.apiKey` | string | ⚠️ 推荐 | API 密钥（也可用环境变量） |
| `models.<name>.baseUrl` | string | ✅ 是 | API 服务器地址 |
| `metadata.providerName` | string | ⚠️ 推荐 | 身份标识：`"qwen"`、`"deepseek"` 等 |
| `metadata.displayName` | string | ❌ 否 | UI 显示名称 |
| `capabilities.maxOutputTokens` | number | ⚠️ 推荐 | 最大输出 token 数 |
| `capabilities.supportsFunctionCalling` | boolean | ⚠️ 推荐 | 是否支持工具调用（Qwen=true, DeepSeek=false） |
| `capabilities.supportsMultimodal` | boolean | ⚠️ 推荐 | 是否支持数组格式（Qwen=true, DeepSeek=false） |

#### settings.json 核心字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `experimental.useModelRouter` | boolean | ✅ 是 | **必须 `true`**，与 config.json 配合启用自定义模型 |
| `security.auth.selectedType` | string | ⚠️ 推荐 | 认证类型：`"custom-model"`（自定义模型）、`"api-key"`（Gemini） |
| `model.name` | string | ❌ 否 | 当前模型，通过 `/model use` 自动更新 |
| `general.disableAutoUpdate` | boolean | ❌ 否 | 禁用自动更新（推荐 `true`） |
| `mcpServers.<name>` | object | ❌ 否 | MCP 服务器配置（可选） |
| `trustedFolders` | array | ❌ 否 | 受信任的项目目录列表 |

**⚠️ 关键提示**：
1. `config.json` 和 `settings.json` 中的 `useModelRouter` **都必须设为 `true`**
2. 通义千问必须设置 `supportsFunctionCalling: true` 才能使用工具功能
3. DeepSeek 必须设置 `supportsFunctionCalling: false` 和 `supportsMultimodal: false`
4. API Key 也可通过环境变量提供：`QWEN_API_KEY`、`DEEPSEEK_API_KEY`

### Agents 配置

创建 `.gemini/agents/` 目录，添加 Agent 文件：

**代码审查 Agent** (`.gemini/agents/code_review.md`)

```yaml
---
kind: agent
name: code_review
title: 代码审查助手
description: 专业的代码质量审查，只审查不实现
model: deepseek-coder
scope: project
version: 1.0.0
contextMode: shared
triggers:
  keywords: [审查, review, 检查, 代码质量]
  priority: 80
tools:
  allow: ["read_file","read_many_files","ls","glob","grep","rg","web_fetch","web_search"]
  deny: ["write_file","edit_file","bash"]
mcp:
  servers: []
handoffs:
  - to: code_imple
    when: manual
    description: "当用户需要实现代码、修复bug或编写功能时，移交给 code_imple agent"
    include_context: true
---

# Role

⚠️ **你是代码审查专家 - 只负责审查代码质量，不实现代码**

## 关键规则 - 首先判断任务类型

在做任何事情之前，先判断任务类型：

1. **如果用户要求实现/修复/编写代码**（关键词：实现、修复、编写、开发、写代码、implement、fix、write、develop）：
   - ❌ 不要读取任何文件
   - ❌ 不要进行任何分析
   - ✅ 立即使用 `transfer_to_code_imple` 工具移交任务

2. **如果用户要求审查/检查/分析代码**（关键词：审查、检查、分析、review、check、analyze）：
   - ✅ 读取必要的文件
   - ✅ 分析代码质量
   - ✅ 提供审查反馈

## 审查重点

1. 代码可读性和命名规范
2. 潜在的 bug 和逻辑错误
3. 性能优化建议
4. 安全漏洞检测

## 输出格式

- 🔴 严重问题（必须修复）
- 🟡 重要问题（应该修复）
- 🔵 优化建议（可选）
- ✅ 良好实践（继续保持）
```

**调试专家 Agent** (`.gemini/agents/debug_analyzer.md`)

```yaml
---
kind: agent
name: debug_analyzer
title: 调试专家
description: 系统性分析和调试代码错误
model: deepseek-coder
scope: project
version: 1.0.0
contextMode: isolated
triggers:
  keywords: [调试, debug, 错误, bug, 异常]
  priority: 85
tools:
  allow: ["read_file","read_many_files","grep","rg","bash"]
  deny: ["write_file","edit_file"]
mcp:
  servers: []
---

# Role

You are a debugging expert who systematically analyzes errors and provides 
root cause analysis with step-by-step solutions.

## Workflow

1. Read error messages and stack traces
2. Examine relevant code files
3. Search for related code patterns
4. Run diagnostic commands
5. Provide root cause and fix suggestions
```

### 路由配置

在 `.gemini/settings.json` 中配置路由：

```json
{
  "routing": {
    "enabled": true,
    "strategy": "hybrid",
    "rule": {
      "confidence_threshold": 75
    },
    "llm": {
      "model": "gemini-2.0-flash",
      "timeout": 5000
    },
    "fallback": "prompt_user"
  }
}
```

或通过环境变量：

```bash
export GEMINI_ROUTING_ENABLED=true
export GEMINI_ROUTING_STRATEGY=hybrid
export GEMINI_ROUTING_CONFIDENCE_THRESHOLD=75
```

---

## 🔄 与 Gemini CLI 的关系

### 技术基础

伏羲 CLI 基于 Google Gemini CLI 开发，完全兼容原有功能。我们在保留其强大能力的同时，针对国内开发者的需求进行了以下扩展：

### 主要扩展

| 扩展功能 | 原 Gemini CLI | 伏羲 CLI |
|---------|--------------|---------|
| 自定义模型配置 | ❌ 仅支持 Gemini/OpenAI/Claude | ✅ 支持任意 OpenAI 兼容模型 |
| 国内模型支持 | ❌ 无 | ✅ 通义千问、DeepSeek 等开箱即用 |
| Agents 系统 | ⚠️ 基础功能 | ✅ 完整的智能体系统 |
| 智能路由 | ❌ 无 | ✅ 自动选择最佳 Agent |
| Agent 移交 | ❌ 无 | ✅ Agent 间智能协作 |
| Workflow 顺序执行 | ❌ 无 | ✅ 多 Agent 顺序编排 |
| Workflow 并行执行 | ❌ 无 | ✅ 多 Agent 并行执行，显著提速 |
| Plan+Todo 模式 | ❌ 无 | ✅ 先规划后执行，批量执行支持 |
| Spec 规格驱动开发 | ❌ 无 | ✅ Constitution → Spec → Plan → Tasks → Execute |
| 中文文档 | ❌ 英文为主 | ✅ 完整中文文档 |

### 兼容性

- ✅ 完全兼容 Gemini CLI 的配置文件
- ✅ 完全兼容 Gemini CLI 的命令
- ✅ 可以无缝切换回 Gemini CLI
- ✅ 共享相同的 `.gemini/` 配置目录

### 开源协议

两个项目均采用 **Apache 2.0** 开源协议，可自由使用和修改。

---

## 🤝 贡献与支持

### 贡献代码

我们欢迎所有形式的贡献！

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 提交 Pull Request

<!-- 详见：[贡献指南](./CONTRIBUTING.md) -->

### 问题反馈

- 🐛 [提交 Bug](https://github.com/MJ-CJM/fuxi-cli/issues/new?labels=bug)
- 💡 [功能建议](https://github.com/MJ-CJM/fuxi-cli/issues/new?labels=enhancement)
- ❓ [问题讨论](https://github.com/MJ-CJM/fuxi-cli/discussions)

### 开发指南

```bash
# 克隆仓库
git clone https://github.com/MJ-CJM/fuxi-cli/fuxi-cli.git
cd fuxi-cli

# 安装依赖
npm install

# 构建项目
npm run build

# 运行测试
npm test

# 启动开发模式
npm start
```

<!-- 更多信息：[开发环境搭建](./study/06-dev-setup.md) -->

---

## 📄 许可证

本项目采用 [Apache License 2.0](./LICENSE) 开源协议。

基于 [Google Gemini CLI](https://github.com/google-gemini/gemini-cli)（Apache 2.0）开发。

---

## 🙏 致谢

- 感谢 Google Gemini CLI 团队提供优秀的基础框架
- 感谢所有贡献者的支持和参与
- 感谢开源社区的持续推动

---

<p align="center">
  <strong>伏羲 CLI - 让 AI 开发更高效 🚀</strong>
</p>

<p align="center">
  如果这个项目对你有帮助，请给我们一个 ⭐️
</p>
