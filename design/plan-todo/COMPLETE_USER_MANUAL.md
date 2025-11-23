# Fuxi CLI - Plan+Todo 模式使用手册

## 📖 目录

- [功能概述](#功能概述)
- [快速开始](#快速开始)
- [Plan 模式详解](#plan-模式详解)
- [Todo 管理详解](#todo-管理详解)
- [命令参考](#命令参考)
- [使用场景](#使用场景)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)
- [故障排除](#故障排除)

---

## 功能概述

### 什么是 Plan+Todo 模式？

Plan+Todo 模式是 Fuxi CLI 的一项强大功能，它将复杂任务分解为两个阶段：

1. **Plan 阶段（规划）**：AI 分析需求，创建详细的执行计划
2. **Todo 阶段（执行）**：将计划转换为可执行的任务列表，逐步完成

### 为什么需要 Plan+Todo 模式？

**传统方式的问题**：
- ❌ 直接执行复杂任务容易出错
- ❌ 缺少整体规划，步骤混乱
- ❌ 难以追踪进度
- ❌ 依赖关系不清晰

**Plan+Todo 模式的优势**：
- ✅ 先规划后执行，思路清晰
- ✅ 结构化的任务分解
- ✅ 清晰的进度追踪
- ✅ 自动的依赖管理
- ✅ 灵活的执行控制

### 核心特性

| 特性 | 说明 |
|------|------|
| 🔒 **安全的 Plan 模式** | 只读模式，只分析不修改 |
| 📋 **结构化计划** | 包含步骤、风险、测试策略 |
| ✅ **智能依赖检查** | 自动验证任务依赖关系 |
| ⚙️ **灵活执行模式** | 支持自动和手动审批 |
| 📊 **进度追踪** | 清晰的任务状态显示 |
| 💾 **轻量设计** | 内存存储，支持 JSON 导出 |

---

## 快速开始

### 第一次使用（5 分钟教程）

#### 步骤 1：进入 Plan 模式

按下 `Ctrl+P` 快捷键：

```bash
> [Ctrl+P]

📋 Plan Mode Activated

✅ Read-only mode enabled
✅ Only analysis and planning tools available
✅ AI will use create_plan tool for structured output

💡 Press Ctrl+P again to exit Plan mode
```

此时提示符会变为：`[PLAN] >`

#### 步骤 2：让 AI 创建计划

输入您想要实现的功能：

```bash
[PLAN] > 帮我添加用户登录功能
```

AI 会：
1. 📖 读取项目相关代码
2. 🔍 分析技术栈和架构
3. 📋 创建详细的执行计划

输出示例：
```
✅ Plan Created: "Implement User Login"

**Overview**: Add JWT-based authentication with login/logout endpoints

## Steps (5):

1. step-1: Create User model with email and password fields
   - Module: backend/models
   - Estimated: 30min

2. step-2: Implement JWT token generation and validation
   - Module: backend/auth
   - Dependencies: step-1
   - Risks: Token security vulnerabilities
   - Estimated: 45min

3. step-3: Create login and logout API endpoints
   - Module: backend/api
   - Dependencies: step-2
   - Estimated: 30min

4. step-4: Add frontend login form
   - Module: frontend/components
   - Dependencies: step-3
   - Estimated: 1h

5. step-5: Write unit and integration tests
   - Module: tests
   - Dependencies: step-1, step-2, step-3
   - Estimated: 1h

## Overall Risks:
- Password hashing performance issues
- Session management complexity
- Token refresh mechanism

## Testing Strategy:
Unit tests for User model and JWT utils
Integration tests for login/logout flow
E2E tests for frontend form
```

#### 步骤 3：退出 Plan 模式

再次按 `Ctrl+P`：

```bash
[PLAN] > [Ctrl+P]

📋 Exited Plan Mode

📝 Plan "Implement User Login" created
💡 Use /plan to-todos to convert to executable todos
```

#### 步骤 4：查看和转换计划

```bash
# 查看完整计划
> /plan show

# 将计划转换为可执行的 todos
> /plan to-todos

✅ Created 5 todos from plan "Implement User Login"

💡 Next steps:
- /todos list - View all todos
- /todos execute <id> - Execute a todo
- /todos export - Export to JSON
```

#### 步骤 5：查看 Todo 列表

```bash
> /todos list

📋 Todo List (5 total)

✅ 0 completed | 🔄 0 in progress | ⬜ 5 pending | ❌ 0 cancelled

### HIGH Priority

⬜ step-1 - Create User model with email and password fields ⏱️ 30min
   📦 Module: backend/models

⬜ step-2 - Implement JWT token generation and validation ⏱️ 45min
   📦 Module: backend/auth
   🔗 Dependencies: step-1
   ⚠️  Token security vulnerabilities

### MEDIUM Priority

⬜ step-3 - Create login and logout API endpoints ⏱️ 30min
   📦 Module: backend/api
   🔗 Dependencies: step-2

⬜ step-4 - Add frontend login form ⏱️ 1h
   📦 Module: frontend/components
   🔗 Dependencies: step-3

### LOW Priority

⬜ step-5 - Write unit and integration tests ⏱️ 1h
   📦 Module: tests
   🔗 Dependencies: step-1, step-2, step-3
```

#### 步骤 6：执行第一个 Todo

```bash
# 使用自动模式执行（快速，适合信任的任务）
> /todos execute step-1 --mode=auto_edit

🔄 Executing: Create User model with email and password fields

📌 ID: step-1
⚙️ Approval mode: auto_edit
📦 Module: backend/models
⏱️  Estimated: 30min

[AI 开始执行...]

✓ write_file backend/models/User.ts
✓ edit backend/config/database.ts
✓ edit backend/index.ts

✅ Task completed successfully!
```

#### 步骤 7：更新任务状态

```bash
> /todos update step-1 completed

✅ Updated step-1 → completed

📋 Current progress:
✅ 1 completed | 🔄 0 in progress | ⬜ 4 pending
```

#### 步骤 8：继续执行下一个任务

```bash
# 使用默认模式（需要确认，更安全）
> /todos execute step-2 --mode=default

🔄 Executing: Implement JWT token generation and validation

⚠️ edit backend/auth/jwt.ts
This will modify authentication logic.
Confirm? (y/n): y

✓ edit backend/auth/jwt.ts

⚠️ write_file backend/auth/middleware.ts
Confirm? (y/n): y

✓ write_file backend/auth/middleware.ts

✅ Task completed successfully!
```

#### 步骤 9：导出进度（可选）

```bash
> /todos export

📄 Todos JSON Export

{
  "version": "1.0",
  "generatedAt": "2025-10-16T12:30:00.000Z",
  "sourcePlan": "Implement User Login",
  "todos": [
    {
      "id": "step-1",
      "description": "Create User model with email and password fields",
      "status": "completed",
      "priority": "high",
      "module": "backend/models",
      "completedAt": "2025-10-16T12:25:00.000Z"
    },
    {
      "id": "step-2",
      "description": "Implement JWT token generation and validation",
      "status": "completed",
      "priority": "high",
      "dependencies": ["step-1"]
    },
    ...
  ],
  "statistics": {
    "total": 5,
    "pending": 3,
    "in_progress": 0,
    "completed": 2,
    "cancelled": 0
  }
}

💡 Copy this JSON for:
- External automation tools
- Project management systems
- Progress tracking
```

---

## Plan 模式详解

### 什么是 Plan 模式？

Plan 模式是一个**只读的规划模式**，在这个模式下：
- ✅ AI 可以读取代码、搜索文件、分析架构
- ✅ AI 会创建结构化的执行计划
- ❌ AI 不能修改代码、执行命令、写文件

### 为什么需要只读模式？

**安全性**：
- 避免在规划阶段误操作
- 让 AI 专注于分析和思考
- 给用户审查计划的机会

**质量保证**：
- 先想清楚再动手
- 完整的风险分析
- 明确的测试策略

### 如何使用 Plan 模式

#### 1. 进入 Plan 模式

**快捷键**：`Ctrl+P`

**提示符变化**：
```bash
> [Ctrl+P]
[PLAN] >  # 注意提示符前缀
```

#### 2. 提出规划需求

**好的示例**：
```bash
[PLAN] > 帮我规划如何实现用户评论功能，包括评论、回复、点赞

[PLAN] > 分析现有代码，规划如何重构用户认证模块以支持 OAuth

[PLAN] > 我想添加数据导出功能，规划需要修改哪些模块
```

**不太好的示例**：
```bash
[PLAN] > 改代码  # 太模糊

[PLAN] > 添加功能  # 没有说明什么功能

[PLAN] > 帮我写个函数  # Plan 模式用于规划，不是简单任务
```

#### 3. AI 创建计划

AI 会自动调用 `create_plan` 工具，生成包含以下内容的计划：

**计划结构**：
```
✅ Plan Created: "计划标题"

Overview: 计划概述

Steps: 执行步骤（包含 ID、描述、模块、依赖、风险、时间估计）

Overall Risks: 整体风险

Testing Strategy: 测试策略

Estimated Duration: 总体时间估计
```

#### 4. 审查计划

```bash
> /plan show  # 查看完整计划内容
```

仔细检查：
- ✅ 步骤是否完整？
- ✅ 依赖关系是否正确？
- ✅ 风险是否被识别？
- ✅ 测试策略是否充分？

#### 5. 退出 Plan 模式

**快捷键**：再次按 `Ctrl+P`

```bash
[PLAN] > [Ctrl+P]

📋 Exited Plan Mode
📝 Plan "..." created
```

### Plan 模式下 AI 可以使用的工具

| 工具类型 | 工具名称 | 说明 |
|---------|---------|------|
| 📖 读取文件 | `read_file` | 读取单个文件 |
| 📚 批量读取 | `read_many_files` | 一次读取多个文件 |
| 📁 列出文件 | `ls` | 列出目录内容 |
| 🔍 搜索代码 | `grep`, `rg` | 搜索代码内容 |
| 🌐 查找文件 | `glob` | 按模式查找文件 |
| 🌍 网络查询 | `web_fetch`, `web_search` | 查询技术文档 |
| 📋 创建计划 | `create_plan` | **生成结构化计划** |

### Plan 模式下 AI 不能使用的工具

| 工具类型 | 说明 | 原因 |
|---------|------|------|
| ✏️ 编辑文件 | `edit`, `smart_edit` | 只读模式 |
| 📝 写文件 | `write_file` | 只读模式 |
| 🔧 执行命令 | `run_shell_command`, `bash` | 安全考虑 |
| 📝 其他写操作 | 任何修改文件系统的操作 | 只读模式 |

### Plan 模式最佳实践

#### ✅ 适合使用 Plan 模式的场景

1. **复杂的多步骤任务**
   ```bash
   [PLAN] > 规划实现完整的购物车功能
   ```

2. **跨模块的大型重构**
   ```bash
   [PLAN] > 分析并规划如何将单体应用拆分为微服务
   ```

3. **不熟悉的代码库**
   ```bash
   [PLAN] > 分析这个项目的架构，规划如何添加新功能
   ```

4. **需要风险评估的任务**
   ```bash
   [PLAN] > 规划数据库迁移方案，包括风险分析
   ```

#### ❌ 不需要 Plan 模式的场景

1. **简单的单文件修改**
   ```bash
   # 直接执行即可
   > 修改 utils.ts 中的 formatDate 函数
   ```

2. **明确知道怎么做的小任务**
   ```bash
   # 直接执行
   > 给这个函数添加注释
   ```

3. **紧急 Bug 修复**
   ```bash
   # 直接修复
   > 修复登录页面的空指针错误
   ```

---

## Todo 管理详解

### Todo 生命周期

```
Plan 创建
  ↓
/plan to-todos  ← 转换为 todos（内存存储）
  ↓
Todo: pending（待执行）
  ↓
/todos execute  ← 开始执行
  ↓
Todo: in_progress（执行中）
  ↓
执行完成
  ↓
/todos update → completed  ← 标记完成
```

### Todo 状态说明

| 状态 | 图标 | 说明 | 何时使用 |
|------|------|------|----------|
| `pending` | ⬜ | 待执行 | 默认状态 |
| `in_progress` | 🔄 | 执行中 | 自动设置（执行时） |
| `completed` | ✅ | 已完成 | 任务成功完成 |
| `cancelled` | ❌ | 已取消 | 任务不再需要 |

### Todo 优先级

系统自动根据步骤顺序分配优先级：

| 优先级 | 范围 | 说明 |
|--------|------|------|
| **HIGH** | 前 3 个步骤 | 优先执行 |
| **MEDIUM** | 4-6 个步骤 | 中等优先级 |
| **LOW** | 第 7 个及之后 | 后续执行 |

### 依赖管理

#### 什么是依赖？

某个 todo 必须等待其他 todo 完成后才能执行。

**示例**：
```bash
⬜ step-2 - Implement JWT token generation
   🔗 Dependencies: step-1
```

这表示：必须先完成 `step-1` 才能执行 `step-2`

#### 依赖检查

系统会自动检查依赖：

```bash
> /todos execute step-3

❌ Cannot execute step-3. Dependencies not completed:
- step-1
- step-2

Complete dependencies first.
```

**解决方法**：
1. 先执行依赖的 todos
2. 标记它们为 completed
3. 然后再执行当前 todo

### 执行模式

#### Default 模式（默认模式）

**特点**：
- ⚠️ 需要手动确认每个操作
- ✅ 安全性高
- ⏱️ 速度较慢

**适用场景**：
- 核心业务逻辑
- 数据库操作
- 配置文件修改
- 不熟悉的代码

**示例**：
```bash
> /todos execute step-1 --mode=default

⚠️ write_file models/User.ts
This will create a new file.
Confirm? (y/n): y  ← 需要确认

✓ write_file models/User.ts

⚠️ edit config/database.ts
This will modify database configuration.
Confirm? (y/n): y  ← 需要确认

✓ edit config/database.ts
```

#### Auto-edit 模式（自动模式）

**特点**：
- ✅ 自动批准所有编辑操作
- ⚡ 速度快
- ⚠️ 风险较高

**适用场景**：
- UI 组件开发
- 样式调整
- 测试代码
- 文档编写
- 信任 AI 的场景

**示例**：
```bash
> /todos execute step-1 --mode=auto_edit

🟢 Auto-edit mode enabled for this task

✓ write_file models/User.ts (auto-approved)
✓ edit config/database.ts (auto-approved)
✓ edit index.ts (auto-approved)

✅ Task completed
```

#### 如何选择执行模式？

**决策树**：
```
这个任务会影响核心功能吗？
├─ 是 → 使用 default 模式 ✅
└─ 否
    └─ 这个任务容易回滚吗？
        ├─ 是 → 可以使用 auto_edit 模式 ⚡
        └─ 否 → 使用 default 模式 ✅
```

**推荐配置**：

| 任务类型 | 推荐模式 | 原因 |
|----------|----------|------|
| 数据库迁移 | `default` | 不可逆操作 |
| 认证授权 | `default` | 安全关键 |
| 支付逻辑 | `default` | 业务关键 |
| API 端点 | `default` | 影响接口 |
| UI 组件 | `auto_edit` | 容易回滚 |
| 样式文件 | `auto_edit` | 低风险 |
| 测试代码 | `auto_edit` | 独立模块 |
| 文档 | `auto_edit` | 无风险 |

### Todo 列表显示

#### 基本显示

```bash
> /todos list

📋 Todo List (5 total)

✅ 2 completed | 🔄 1 in progress | ⬜ 2 pending | ❌ 0 cancelled
```

#### 按优先级分组

```bash
### HIGH Priority

⬜ step-1 - Task description ⏱️ 30min
   📦 Module: backend/models

### MEDIUM Priority

🔄 step-3 - Task description [deps: step-1, step-2]
   ⚠️  Some risk warning
```

#### 已完成的任务

```bash
### ✅ Completed (2)

✅ step-1 - Task description
✅ step-2 - Task description
```

---

## 命令参考

### Plan 相关命令

#### `/plan show`

**功能**：显示当前计划的详细内容

**语法**：
```bash
/plan show
```

**输出示例**：
```
# 📋 Implement User Login

**Overview**: Add JWT-based authentication...

## 🔢 Steps (5)

1. **step-1**: Create User model
   - 📦 Module: backend/models
   - ⏱️  Estimated: 30min

...
```

**使用场景**：
- 查看完整计划
- 审查步骤和风险
- 分享给团队

---

#### `/plan to-todos`

**功能**：将当前计划转换为可执行的 todo 列表

**语法**：
```bash
/plan to-todos
```

**效果**：
- 创建 todos（存储在内存）
- 自动分配优先级
- 保留依赖关系

**输出示例**：
```
✅ Created 5 todos from plan "Implement User Login"

💡 Next steps:
- /todos list - View all todos
- /todos execute <id> - Execute a todo
```

**注意事项**：
- ⚠️ 会覆盖已存在的 todos
- ⚠️ 内存存储，会话结束后清空

---

#### `/plan clear`

**功能**：清除当前计划

**语法**：
```bash
/plan clear
```

**效果**：
- 删除当前 plan 数据
- 不影响已创建的 todos

**使用场景**：
- 重新规划
- 切换到其他任务

---

### Todo 相关命令

#### `/todos list`

**功能**：显示所有 todo 列表

**语法**：
```bash
/todos list
```

**显示内容**：
- 统计信息（总数、各状态数量）
- 按优先级分组的活跃任务
- 已完成和已取消的任务

**输出示例**：
```
📋 Todo List (5 total)

✅ 2 | 🔄 1 | ⬜ 2 | ❌ 0

### HIGH Priority
⬜ step-1 - Description...
```

---

#### `/todos execute`

**功能**：执行指定的 todo

**语法**：
```bash
/todos execute <id> [--mode=auto_edit|default]
```

**参数**：
- `<id>`：必需，todo 的 ID（如 `step-1`）
- `--mode`：可选，执行模式
  - `default`：默认模式，需要确认（默认值）
  - `auto_edit`：自动模式，自动批准

**示例**：
```bash
# 使用默认模式
/todos execute step-1

# 使用自动模式
/todos execute step-1 --mode=auto_edit

# 明确指定默认模式
/todos execute step-1 --mode=default
```

**执行流程**：
1. 检查依赖是否完成
2. 设置执行模式
3. 显示任务信息
4. 开始执行
5. 提示更新状态

**依赖检查**：
```bash
> /todos execute step-3

❌ Cannot execute step-3. Dependencies not completed:
- step-1
- step-2
```

---

#### `/todos execute-all`

**功能**：批量执行所有待执行的 todos，按顺序自动执行

**语法**：
```bash
/todos execute-all [--mode=auto_edit|default]
```

**参数**：
- `--mode`：可选，执行模式
  - `default`：默认模式，需要确认（默认值）
  - `auto_edit`：自动模式，自动批准所有操作

**特性**：
- 🔄 自动按顺序执行所有待执行 todos
- 🔗 自动检查依赖关系，确保正确顺序
- 📊 实时显示进度 (X/Y completed)
- ⏸️ Ctrl+C 随时中断
- 🛡️ 错误自动恢复

**示例**：
```bash
# 使用默认模式（安全，每个操作需要确认）
> /todos execute-all --mode=default

🚀 Starting Batch Execution

📊 Total todos: 5
⚙️ Approval mode: default
🎯 First todo: Create User model with email and password fields

💡 Press Ctrl+C to stop at any time

---

▶️  [1/5] Create User model with email and password fields
📦 Module: backend/models
⏱️  Estimated: 30min

⚠️ write_file backend/models/User.ts
Confirm? (y/n): y
✓ write_file backend/models/User.ts

✅ Task 1 completed

---

▶️  [2/5] Implement JWT token generation and validation
📦 Module: backend/auth
⏱️  Estimated: 45min

[继续执行...]

---

✅ Batch Execution Complete!

📊 Executed 5/5 todos

Use /todos list to see final status
```

```bash
# 使用自动模式（快速，全自动执行）
> /todos execute-all --mode=auto_edit

🚀 Starting Batch Execution

📊 Total todos: 5
⚙️ Approval mode: auto_edit
🎯 First todo: Create User model

---

▶️  [1/5] Create User model ⏱️ 30min
✓ write_file backend/models/User.ts (auto-approved)
✓ edit backend/config/database.ts (auto-approved)

▶️  [2/5] Implement JWT authentication ⏱️ 45min
✓ write_file backend/auth/jwt.ts (auto-approved)
✓ write_file backend/auth/middleware.ts (auto-approved)

▶️  [3/5] Create API endpoints ⏱️ 30min
[...]

✅ Batch Execution Complete!
📊 Executed 5/5 todos in 2.5 minutes
```

**中断执行**：
```bash
> /todos execute-all --mode=auto_edit

▶️  [2/5] Implement JWT authentication...

^C  ← 按 Ctrl+C 中断

⏸️  Batch Execution Interrupted

Completed: 1/5 todos

Use /todos list to see current progress
Use /todos execute-all to resume remaining todos
```

**错误处理**：
```bash
> /todos execute-all --mode=default

▶️  [3/5] Create API endpoints...

❌ Error: File already exists

❌ Batch Execution Failed

Todo 3/5 encountered an error.

Progress: 2 completed, 1 failed

💡 Fix the issue and run /todos execute-all to continue with remaining todos
```

**适用场景**：
- ✅ 信任的任务列表（使用 auto_edit 模式）
- ✅ 简单的批量操作
- ✅ 测试或文档相关任务
- ⚠️ 不适合核心业务逻辑（建议逐个执行）

**注意事项**：
- 批量执行会按顺序执行所有 `pending` 状态的 todos
- 已完成（`completed`）或已取消（`cancelled`）的 todos 会被跳过
- 自动检查依赖关系，确保依赖任务先完成
- 中断后可以随时恢复执行剩余 todos

---

#### `/todos update`

**功能**：更新 todo 的状态

**语法**：
```bash
/todos update <id> <status>
```

**参数**：
- `<id>`：todo 的 ID
- `<status>`：新状态
  - `pending`：待执行
  - `in_progress`：执行中
  - `completed`：已完成
  - `cancelled`：已取消

**示例**：
```bash
# 标记为已完成
/todos update step-1 completed

# 标记为取消
/todos update step-5 cancelled

# 重置为待执行
/todos update step-2 pending
```

**输出示例**：
```
✅ Updated step-1 → completed

Current todo list:
[显示更新后的列表]
```

---

#### `/todos export`

**功能**：导出 todos 为 JSON 格式

**语法**：
```bash
/todos export
```

**输出格式**：
```json
{
  "version": "1.0",
  "generatedAt": "2025-10-16T12:00:00.000Z",
  "sourcePlan": "Plan title",
  "todos": [
    {
      "id": "step-1",
      "description": "...",
      "status": "completed",
      "priority": "high",
      "module": "...",
      "dependencies": [],
      "risks": [],
      "estimatedTime": "30min",
      "createdFrom": "plan",
      "createdAt": "...",
      "completedAt": "..."
    }
  ],
  "statistics": {
    "total": 5,
    "pending": 1,
    "in_progress": 0,
    "completed": 3,
    "cancelled": 1
  }
}
```

**用途**：
- 📊 进度报告
- 🔄 外部工具集成
- 📝 项目文档
- 💾 备份记录

---

#### `/todos clear`

**功能**：清除所有 todos

**语法**：
```bash
/todos clear
```

**效果**：
- 删除内存中的所有 todos
- 不影响 plan 数据

**使用场景**：
- 重新开始
- 切换到其他计划

---

### 快捷键

| 快捷键 | 功能 | 说明 |
|--------|------|------|
| `Ctrl+P` | 切换 Plan 模式 | 进入/退出 Plan 模式 |
| `Ctrl+C` | 取消操作 | 取消当前执行 |
| `Ctrl+D` | 退出 CLI | 退出 Fuxi CLI |

---

## 使用场景

### 场景 1：添加新功能

**需求**：为博客系统添加评论功能

#### Step 1: 规划

```bash
> [Ctrl+P]
[PLAN] > 帮我规划如何为博客添加评论功能，包括评论、回复、点赞

[AI 分析并创建计划...]

✅ Plan Created: "Add Blog Comment System"

Steps (6):
1. step-1: Design comment data model
2. step-2: Create comment API endpoints
3. step-3: Implement comment storage
4. step-4: Add reply functionality
5. step-5: Implement like/unlike feature
6. step-6: Create frontend components
```

#### Step 2: 转换并执行

```bash
> [Ctrl+P]  # 退出 Plan 模式
> /plan to-todos
✅ Created 6 todos

> /todos list
[查看列表]

> /todos execute step-1 --mode=auto_edit
[执行...]

> /todos update step-1 completed
> /todos execute step-2 --mode=default
[逐步执行...]
```

---

### 场景 2：代码重构

**需求**：重构混乱的工具函数文件

#### Step 1: 分析和规划

```bash
> [Ctrl+P]
[PLAN] > 分析 utils.js 文件，规划如何将它重构为多个模块，保持向后兼容

[AI 分析...]

✅ Plan Created: "Refactor Utils Module"

Steps (5):
1. step-1: Analyze current utils.js dependencies
2. step-2: Create new module structure
3. step-3: Extract string utilities
4. step-4: Extract date utilities
5. step-5: Update imports with backwards compatibility
```

#### Step 2: 谨慎执行

```bash
> [Ctrl+P]
> /plan to-todos

# 重构需要谨慎，使用 default 模式
> /todos execute step-1 --mode=default
[仔细确认每个修改...]
```

---

### 场景 3：学习和理解代码库

**需求**：理解一个新接手的项目

#### 只用 Plan 模式分析

```bash
> [Ctrl+P]
[PLAN] > 分析这个项目的整体架构，包括：
1. 项目结构
2. 主要模块和职责
3. 数据流
4. 依赖关系

[AI 深入分析...]

✅ Plan Created: "Project Architecture Analysis"

Steps (4):
1. step-1: Understand directory structure
2. step-2: Identify core modules
3. step-3: Map data flow
4. step-4: Document key dependencies

[详细的分析结果...]
```

#### 不执行，只用于学习

```bash
> [Ctrl+P]  # 退出
> /plan show  # 查看完整分析
[仔细阅读...]

# 不需要 to-todos，已经达到学习目的
```

---

### 场景 4：数据库迁移

**需求**：升级数据库 schema

#### Step 1: 详细规划

```bash
> [Ctrl+P]
[PLAN] > 规划如何将数据库从 v1 迁移到 v2，包括：
- 迁移脚本
- 数据备份
- 回滚方案
- 风险评估

✅ Plan Created: "Database Migration v1 to v2"

Steps (7):
1. step-1: Create database backup
2. step-2: Write migration script
3. step-3: Write rollback script
4. step-4: Test migration on staging
5. step-5: Execute migration on production
6. step-6: Verify data integrity
7. step-7: Update application code

Risks:
⚠️  Data loss during migration
⚠️  Downtime during migration
⚠️  Incompatibility with existing data
```

#### Step 2: 仔细执行每一步

```bash
> [Ctrl+P]
> /plan to-todos

# 数据库操作必须使用 default 模式
> /todos execute step-1 --mode=default
[创建备份，仔细确认...]

> /todos update step-1 completed

# 继续下一步...
```

---

### 场景 5：Bug 修复（不使用 Plan 模式）

**需求**：修复一个已知的 bug

#### 直接执行

```bash
# 对于简单 bug，不需要 Plan 模式
> 修复 login.tsx 中的空指针错误，在第 45 行添加空值检查

[AI 直接执行修复...]

✓ edit login.tsx

✅ Bug fixed!
```

**说明**：
- 简单、明确的任务不需要 Plan+Todo
- 直接执行更快更高效

---

## 最佳实践

### 1. 何时使用 Plan 模式

#### ✅ 推荐使用

| 场景类型 | 说明 | 示例 |
|---------|------|------|
| 🏗️ 新功能开发 | 3 步以上的复杂功能 | 用户认证、支付集成 |
| 🔄 代码重构 | 影响多个文件的重构 | 模块拆分、架构调整 |
| 📚 学习代码 | 理解不熟悉的项目 | 新项目接手、技术栈学习 |
| ⚠️ 高风险操作 | 需要风险评估的任务 | 数据库迁移、API 重构 |
| 🎯 多步骤任务 | 有明确步骤的任务 | 部署流程、测试策略 |

#### ❌ 不推荐使用

| 场景类型 | 说明 | 替代方案 |
|---------|------|----------|
| 🐛 简单 Bug 修复 | 单文件、单行修复 | 直接执行 |
| 📝 文档更新 | 添加/修改注释 | 直接执行 |
| 🎨 样式调整 | CSS/样式微调 | 直接执行 |
| ⚡ 紧急修复 | 生产环境紧急问题 | 直接执行 |

### 2. 规划阶段最佳实践

#### 提供充分的上下文

**好的示例**：
```bash
[PLAN] > 这是一个使用 React + TypeScript + Express 的全栈项目。
当前使用 JWT 认证。
我想添加 OAuth 2.0 支持（Google 和 GitHub 登录）。
请规划实现步骤，考虑向后兼容性。
```

**不好的示例**：
```bash
[PLAN] > 添加 OAuth
# 缺少项目信息、技术栈、具体需求
```

#### 明确要求

```bash
[PLAN] > 规划实现用户权限系统，需要包括：
1. 角色定义（管理员、编辑、读者）
2. 权限检查中间件
3. 前端权限控制
4. 测试用例
请给出详细的实现步骤和风险分析。
```

#### 审查计划

使用 `/plan show` 仔细检查：
- ✅ 步骤顺序是否合理？
- ✅ 依赖关系是否正确？
- ✅ 是否遗漏重要步骤？
- ✅ 风险评估是否全面？
- ✅ 测试策略是否充分？

如果不满意，可以：
```bash
> /plan clear
> [Ctrl+P]
[PLAN] > 重新描述需求...
```

### 3. 执行阶段最佳实践

#### 选择合适的执行模式

**决策流程图**：

```
开始执行 todo
    ↓
这是核心业务逻辑吗？
    ├─ 是 → 使用 default 模式 ⚠️
    └─ 否
        ↓
    这是数据库操作吗？
        ├─ 是 → 使用 default 模式 ⚠️
        └─ 否
            ↓
        你完全信任 AI 的判断吗？
            ├─ 是 → 可以使用 auto_edit 模式 ⚡
            └─ 否 → 使用 default 模式 ⚠️
```

#### 逐步执行，及时更新

**推荐流程**：
```bash
# 1. 执行一个 todo
> /todos execute step-1 --mode=auto_edit

# 2. 验证结果（手动检查或测试）
# 查看修改的文件，运行测试...

# 3. 更新状态
> /todos update step-1 completed

# 4. 查看列表，选择下一个
> /todos list

# 5. 重复步骤 1-4
> /todos execute step-2 --mode=default
```

**不推荐**：
```bash
# ❌ 一次性执行所有，不验证
> /todos execute step-1 --mode=auto_edit
> /todos execute step-2 --mode=auto_edit
> /todos execute step-3 --mode=auto_edit
# 出错时难以定位问题
```

#### 处理依赖关系

**自动检查**：
```bash
> /todos execute step-5

❌ Dependencies not completed:
- step-2
- step-3
```

**正确处理**：
```bash
# 1. 检查哪些依赖未完成
> /todos list

# 2. 先完成依赖
> /todos execute step-2
> /todos update step-2 completed

> /todos execute step-3
> /todos update step-3 completed

# 3. 现在可以执行了
> /todos execute step-5
```

### 4. 进度管理最佳实践

#### 定期查看进度

```bash
# 每完成几个 todo 后
> /todos list

📋 Progress:
✅ 3 completed | 🔄 0 in progress | ⬜ 2 pending
```

#### 导出进度报告

```bash
# 阶段性导出
> /todos export > progress-2025-10-16.json

# 或复制输出到项目管理工具
> /todos export
[复制 JSON 内容...]
```

#### 处理问题任务

```bash
# 如果某个 todo 不再需要
> /todos update step-4 cancelled

# 如果需要重新执行
> /todos update step-2 pending
> /todos execute step-2 --mode=default
```

### 5. 团队协作最佳实践

#### 分享计划

```bash
# 1. 创建计划后
> /plan show > docs/implementation-plan.md

# 2. 提交到代码库
# git add docs/implementation-plan.md
# git commit -m "Add implementation plan for feature X"
```

#### 分享进度

```bash
# 定期导出进度
> /todos export > progress/week-42.json

# 在团队会议上分享
> /todos list
[截图或共享屏幕]
```

#### 交接任务

```bash
# 导出当前状态
> /todos export > handover.json

# 新成员可以查看：
# - 哪些已完成
# - 哪些待执行
# - 依赖关系
# - 风险提示
```

---

## 常见问题

### 基础问题

#### Q1: Plan+Todo 模式是什么？

**A**: 一个两阶段的任务执行流程：
1. **Plan 阶段**：AI 分析需求，创建详细计划（只读模式）
2. **Todo 阶段**：将计划转为任务列表，逐步执行

**优势**：先规划后执行，更安全、更有条理。

---

#### Q2: 为什么需要 Plan 模式？

**A**: Plan 模式的价值：
- 🔒 **安全**：只读模式，不会误操作
- 🧠 **深思熟虑**：让 AI 先分析再动手
- 📋 **结构化**：获得清晰的执行计划
- ⚠️ **风险识别**：提前发现潜在问题
- ✅ **质量保证**：包含测试策略

**对比**：
```bash
# 传统方式
> 添加用户登录功能
[AI 直接开始修改代码...]
[可能遗漏重要步骤]

# Plan+Todo 方式
> [Ctrl+P]
[PLAN] > 规划用户登录功能
[AI 先分析，创建完整计划]
[你审查计划后再执行]
```

---

#### Q3: 什么时候应该使用 Plan 模式？

**A**: 适合场景：
- ✅ 复杂的多步骤任务（3+ 步骤）
- ✅ 跨多个文件/模块的功能
- ✅ 需要风险评估的操作
- ✅ 不熟悉的代码库
- ✅ 重要的业务逻辑

不需要场景：
- ❌ 简单的单文件修改
- ❌ 明确的小任务
- ❌ 紧急 Bug 修复
- ❌ 文档/注释更新

---

### 操作问题

#### Q4: 如何进入和退出 Plan 模式？

**A**: 使用 `Ctrl+P` 快捷键：

```bash
# 进入
> [Ctrl+P]
[PLAN] >  # 提示符变化

# 退出
[PLAN] > [Ctrl+P]
>  # 提示符恢复
```

**提示**：
- 进入 Plan 模式后，提示符会显示 `[PLAN]`
- 可以随时按 `Ctrl+P` 切换

---

#### Q5: Todos 保存在哪里？会丢失吗？

**A**: Todos 存储在**内存**中：
- ✅ 当前会话中始终可用
- ❌ 关闭 CLI 后会清空
- 💾 可通过 `/todos export` 导出保存

**如何备份**：
```bash
# 导出到文件
> /todos export > backup.json

# 或复制屏幕输出保存
```

---

#### Q6: 如何修改或删除 Todo？

**A**: 使用 `/todos update` 命令：

```bash
# 标记为已完成
> /todos update step-1 completed

# 取消不需要的任务
> /todos update step-5 cancelled

# 重置为待执行
> /todos update step-2 pending

# 清除所有
> /todos clear
```

---

#### Q7: 为什么我的 Todo 无法执行？

**A**: 最常见原因是**依赖未完成**：

```bash
> /todos execute step-3

❌ Dependencies not completed:
- step-1
- step-2
```

**解决方法**：
1. 检查依赖：`/todos list`（查看 `[deps: ...]`）
2. 先完成依赖的 todos
3. 然后再执行当前 todo

---

### 模式和配置问题

#### Q8: Default 和 Auto-edit 模式有什么区别？

**A**: 

| 特性 | Default 模式 | Auto-edit 模式 |
|------|-------------|---------------|
| **确认方式** | 每次操作需确认 | 自动批准 |
| **安全性** | ⚠️ 高 | ⚡ 中 |
| **速度** | 慢 | 快 |
| **适用场景** | 核心逻辑、数据库 | UI、测试、文档 |
| **命令** | `--mode=default` | `--mode=auto_edit` |

**示例对比**：

```bash
# Default 模式
> /todos execute step-1 --mode=default

⚠️ write_file models/User.ts
Confirm? (y/n): y  ← 需要确认

✓ write_file models/User.ts
```

```bash
# Auto-edit 模式
> /todos execute step-1 --mode=auto_edit

🟢 Auto-edit mode enabled

✓ write_file models/User.ts (auto-approved)
✓ edit database.ts (auto-approved)
```

---

#### Q9: 可以同时执行多个 Todos 吗？

**A**: 技术上可以，但**不推荐**：

**不推荐**：
```bash
# ❌ 连续执行多个
> /todos execute step-1 --mode=auto_edit
> /todos execute step-2 --mode=auto_edit
> /todos execute step-3 --mode=auto_edit
```

**推荐**：
```bash
# ✅ 逐个执行，验证后再继续
> /todos execute step-1 --mode=auto_edit
[验证结果...]
> /todos update step-1 completed

> /todos list  # 检查进度

> /todos execute step-2 --mode=default
[验证结果...]
> /todos update step-2 completed
```

**原因**：
- 便于发现问题
- 及时验证结果
- 依赖关系检查更准确

---

#### Q10: 可以修改 AI 创建的计划吗？

**A**: 当前版本**不支持直接修改**计划，但可以：

**方案 1：重新创建**
```bash
> /plan clear
> [Ctrl+P]
[PLAN] > 更详细地描述需求，明确你想要的改变
```

**方案 2：调整 Todos**
```bash
# 转换为 todos 后，可以：
> /todos update step-3 cancelled  # 取消不需要的
> /todos list  # 查看调整后的列表
```

**方案 3：分阶段执行**
```bash
# 只执行计划中你认可的部分
> /todos execute step-1
> /todos execute step-2
# 跳过不需要的步骤
```

---

### 高级问题

#### Q11: Plan 模式下 AI 可以访问哪些工具？

**A**: 

**✅ 可以使用（只读工具）**：
| 工具 | 说明 |
|------|------|
| `read_file` | 读取文件 |
| `read_many_files` | 批量读取 |
| `ls` | 列出目录 |
| `grep`, `rg` | 搜索代码 |
| `glob` | 查找文件 |
| `web_fetch`, `web_search` | 查询资料 |
| `create_plan` | **创建计划（核心）** |

**❌ 不能使用（写工具）**：
| 工具 | 说明 |
|------|------|
| `edit`, `smart_edit` | 编辑文件 |
| `write_file` | 写文件 |
| `run_shell_command` | 执行命令 |
| 其他写操作 | 任何修改文件系统的操作 |

---

#### Q12: 如何查看 AI 创建计划时的分析过程？

**A**: AI 在 Plan 模式下的思考过程会显示：

```bash
[PLAN] > 规划用户登录功能

📖 Reading: src/auth/index.ts...
📖 Reading: src/models/User.ts...
🔍 Searching for: authentication patterns...
📚 Analyzing: project structure...

✅ Plan Created: "Implement User Login"
[显示完整计划...]
```

**说明**：
- AI 会显示正在读取的文件
- 显示搜索和分析的内容
- 最后输出结构化计划

---

#### Q13: 可以导出计划吗？

**A**: 可以，有两种方式：

**方式 1：查看并复制**
```bash
> /plan show
[显示完整计划，可以复制]
```

**方式 2：保存为文件（通过 shell 重定向）**
```bash
# 需要在 CLI 外部使用
# (计划功能，未来版本可能支持)
```

**当前最佳实践**：
```bash
> /plan show
[手动复制内容到文档]
# 或截图保存
```

---

#### Q14: Todo 的优先级是如何确定的？

**A**: 系统**自动分配**优先级，基于步骤顺序：

| 步骤位置 | 优先级 | 说明 |
|---------|--------|------|
| 第 1-3 步 | **HIGH** | 最先执行 |
| 第 4-6 步 | **MEDIUM** | 中等优先级 |
| 第 7 步及之后 | **LOW** | 后续执行 |

**示例**：
```
Plan 有 8 个步骤：
- step-1, step-2, step-3 → HIGH
- step-4, step-5, step-6 → MEDIUM
- step-7, step-8 → LOW
```

**当前不支持手动调整优先级**

---

#### Q15: 如何处理长时间运行的 Todo？

**A**: 对于长时间运行的任务：

**建议 1：分解任务**
```bash
# 在 Plan 阶段要求分解
[PLAN] > 规划数据库迁移，请将大任务分解为多个小步骤，
每个步骤控制在 30 分钟内
```

**建议 2：监控执行**
```bash
# 执行时密切关注
> /todos execute step-big-task --mode=default

[AI 执行过程中会显示进度...]
✓ Creating backup... (1/5)
✓ Running migration script... (2/5)
...
```

**建议 3：中断和恢复**
```bash
# 如果需要中断
[Ctrl+C]  # 取消当前执行

# 之后可以重新执行
> /todos update step-big-task pending
> /todos execute step-big-task --mode=default
```

---

### 故障排除问题

#### Q16: 按 Ctrl+P 没有反应？

**A**: 可能的原因和解决方法：

**原因 1：在补全模式下**
```bash
# Ctrl+P 可能被补全系统占用
# 按 Esc 退出补全，然后再按 Ctrl+P
```

**原因 2：终端不支持**
```bash
# 某些终端可能不支持 Ctrl+P
# 可以查看文档确认快捷键支持
```

**原因 3：已在 Plan 模式**
```bash
[PLAN] >  # 已经在 Plan 模式
# 再按 Ctrl+P 会退出
```

---

#### Q17: AI 创建的计划不符合预期怎么办？

**A**: 可以采取以下措施：

**方法 1：提供更多上下文**
```bash
> /plan clear
> [Ctrl+P]
[PLAN] > 这是一个 [技术栈] 项目，
目前的架构是 [描述架构]，
我想要 [详细需求]，
请注意 [特殊要求]
```

**方法 2：明确不要什么**
```bash
[PLAN] > 规划用户认证功能，
注意：不要使用 Session，必须使用 JWT
```

**方法 3：分步骤规划**
```bash
# 先规划总体
[PLAN] > 概述实现用户系统需要哪些模块

# 然后针对每个模块详细规划
[PLAN] > 详细规划用户认证模块的实现
```

---

#### Q18: 执行 Todo 时出错怎么办？

**A**: 处理错误的步骤：

**步骤 1：查看错误信息**
```bash
> /todos execute step-3

❌ Error: File not found: src/models/User.ts

# 仔细阅读错误信息
```

**步骤 2：标记为 Cancelled 或 Pending**
```bash
# 如果这个步骤不再需要
> /todos update step-3 cancelled

# 如果需要修复后重试
> /todos update step-3 pending
```

**步骤 3：手动处理**
```bash
# 如果是简单问题，可以手动修复
# 然后标记为完成
> /todos update step-3 completed
```

**步骤 4：重新规划**
```bash
# 如果问题严重，重新规划
> /plan clear
> /todos clear
> [Ctrl+P]
[PLAN] > 重新描述需求，考虑之前的问题...
```

---

#### Q19: 如何撤销 Todo 的执行？

**A**: Todo 执行后**不支持自动撤销**，但可以：

**方法 1：使用 Git 回滚**
```bash
# 查看改动
git status
git diff

# 回滚文件
git checkout -- <file>

# 或回滚到之前的提交
git reset --hard HEAD~1
```

**方法 2：手动修复**
```bash
# 使用 Fuxi CLI 修复
> 撤销刚才对 User.ts 的修改
```

**方法 3：重新执行计划**
```bash
# 从头开始
> /plan clear
> /todos clear
> [Ctrl+P]
[PLAN] > 重新规划...
```

**预防措施**：
- 使用 `--mode=default` 仔细审查
- 定期 Git 提交
- 在非关键环境测试

---

#### Q20: Todos 消失了怎么办？

**A**: Todos 存储在内存中，以下情况会丢失：

**会丢失的情况**：
- ❌ 关闭 CLI
- ❌ CLI 崩溃
- ❌ 执行 `/todos clear`

**如何预防**：
```bash
# 定期导出备份
> /todos export > backup-$(date +%Y%m%d-%H%M%S).json
```

**如何恢复**：
```bash
# 如果有 Plan，重新转换
> /plan to-todos

# 或重新进入 Plan 模式创建
> [Ctrl+P]
[PLAN] > [描述任务]
```

---

## 故障排除

### 常见错误及解决方案

#### 错误 1：依赖未完成

**错误信息**：
```bash
> /todos execute step-3

❌ Cannot execute step-3. Dependencies not completed:
- step-1
- step-2

Complete dependencies first.
```

**原因**：step-3 依赖 step-1 和 step-2，但它们还没有完成。

**解决方案**：
```bash
# 1. 查看 todo 列表
> /todos list

# 2. 找到依赖的 todos
⬜ step-1 - ...
⬜ step-2 - ...

# 3. 先执行依赖
> /todos execute step-1
> /todos update step-1 completed

> /todos execute step-2
> /todos update step-2 completed

# 4. 现在可以执行 step-3
> /todos execute step-3
```

---

#### 错误 2：Todo 不存在

**错误信息**：
```bash
> /todos execute step-10

❌ Todo 'step-10' not found.

Use /todos list to see available todos.
```

**原因**：输入的 todo ID 不存在。

**解决方案**：
```bash
# 1. 查看正确的 ID
> /todos list

📋 Todo List:
⬜ step-1 - ...
⬜ step-2 - ...

# 2. 使用正确的 ID
> /todos execute step-1
```

---

#### 错误 3：没有活动的计划

**错误信息**：
```bash
> /plan to-todos

❌ No active plan found.

Create a plan first:
1. Enter Plan mode: Ctrl+P
2. Ask AI to create a plan
3. AI will call create_plan tool
```

**原因**：还没有创建计划。

**解决方案**：
```bash
# 1. 进入 Plan 模式
> [Ctrl+P]

# 2. 创建计划
[PLAN] > 规划...

# 3. 退出 Plan 模式
> [Ctrl+P]

# 4. 现在可以转换
> /plan to-todos
```

---

#### 错误 4：无效的状态

**错误信息**：
```bash
> /todos update step-1 finished

❌ Invalid status 'finished'.
Must be one of: pending, in_progress, completed, cancelled
```

**原因**：使用了不支持的状态名称。

**解决方案**：
```bash
# 使用正确的状态
> /todos update step-1 completed

# 支持的状态：
# - pending
# - in_progress
# - completed
# - cancelled
```

---

### 性能和体验问题

#### 问题 1：AI 响应很慢

**可能原因**：
- 网络延迟
- 模型负载高
- 分析的文件过多

**解决方案**：
```bash
# 1. 缩小分析范围
[PLAN] > 只分析 src/auth 目录，规划...

# 2. 明确指定文件
[PLAN] > 查看 src/models/User.ts 和 src/auth/jwt.ts，
然后规划...

# 3. 等待或重试
# 如果长时间无响应，按 Ctrl+C 取消，然后重试
```

---

#### 问题 2：Plan 太简单或太复杂

**太简单**：
```bash
✅ Plan Created: "Add Feature"

Steps (2):
1. step-1: Implement feature
2. step-2: Test feature
```

**解决方案**：
```bash
> /plan clear
> [Ctrl+P]
[PLAN] > 请详细规划，分解为具体的小步骤，
每个步骤说明需要修改哪些文件，
包括详细的风险分析和测试策略
```

**太复杂**：
```bash
✅ Plan Created: "Add Feature"

Steps (20):
[太多步骤...]
```

**解决方案**：
```bash
> /plan clear
> [Ctrl+P]
[PLAN] > 请创建高层次的规划，
主要步骤控制在 5-8 个，
每个步骤是一个独立的功能模块
```

---

### 获取帮助

#### 内置帮助

```bash
# 查看所有命令
> /help

# 查看特定命令帮助
> /help plan
> /help todos
```

#### 文档

- 📖 用户手册（本文档）
- 📋 快速开始指南
- 🛠️ 开发者文档

#### 社区支持

- 💬 GitHub Issues
- 📧 邮件支持
- 💡 功能建议

---

## 附录

### A. 命令速查表

#### 基本操作

| 操作 | 命令/快捷键 |
|------|------------|
| 进入 Plan 模式 | `Ctrl+P` |
| 退出 Plan 模式 | `Ctrl+P` |
| 取消当前操作 | `Ctrl+C` |
| 退出 CLI | `Ctrl+D` |

#### Plan 命令

| 命令 | 说明 |
|------|------|
| `/plan show` | 显示当前计划 |
| `/plan to-todos` | 转换为 todos |
| `/plan clear` | 清除计划 |

#### Todo 命令

| 命令 | 说明 |
|------|------|
| `/todos list` | 列出所有 todos |
| `/todos execute <id>` | 执行单个 todo（default 模式） |
| `/todos execute <id> --mode=auto_edit` | 执行单个 todo（auto-edit 模式） |
| `/todos execute-all` | 批量执行所有待执行 todos（default 模式） |
| `/todos execute-all --mode=auto_edit` | 批量执行所有待执行 todos（auto-edit 模式） |
| `/todos update <id> <status>` | 更新 todo 状态 |
| `/todos export` | 导出为 JSON |
| `/todos clear` | 清除所有 todos |

---

### B. 状态和优先级

#### Todo 状态

| 状态 | 图标 | 英文 | 说明 |
|------|------|------|------|
| 待执行 | ⬜ | `pending` | 默认状态 |
| 执行中 | 🔄 | `in_progress` | 自动设置 |
| 已完成 | ✅ | `completed` | 任务完成 |
| 已取消 | ❌ | `cancelled` | 不再需要 |

#### 优先级分配

| 优先级 | 步骤范围 |
|--------|---------|
| HIGH | 第 1-3 步 |
| MEDIUM | 第 4-6 步 |
| LOW | 第 7 步及之后 |

---

### C. 示例模板

#### 功能开发模板

```bash
> [Ctrl+P]
[PLAN] > 规划实现 [功能名称] 功能

要求：
1. 分析现有 [相关模块] 的代码
2. 考虑与 [其他功能] 的集成
3. 包含完整的错误处理
4. 提供测试策略
5. 评估潜在风险

技术栈：[列出技术栈]
时间限制：[如果有]
```

#### 重构模板

```bash
> [Ctrl+P]
[PLAN] > 规划重构 [模块名称]

当前问题：
- [列出当前存在的问题]

期望结果：
- [列出期望达到的目标]

约束条件：
- 保持向后兼容
- 不影响现有功能
- [其他约束]

请提供详细的重构步骤和风险评估
```

#### 学习分析模板

```bash
> [Ctrl+P]
[PLAN] > 分析 [项目/模块] 的架构和实现

请帮我理解：
1. 整体架构和模块划分
2. 核心功能实现原理
3. 数据流和依赖关系
4. 关键设计决策
5. 潜在的改进点

不需要生成可执行的步骤，只需要分析和文档
```

---

### D. 术语表

| 术语 | 说明 |
|------|------|
| **Plan 模式** | 只读的规划模式，AI 分析并创建计划 |
| **Todo** | 从 Plan 转换的可执行任务 |
| **依赖** | Todo 之间的前置条件关系 |
| **Default 模式** | 需要确认的执行模式 |
| **Auto-edit 模式** | 自动批准的执行模式 |
| **优先级** | Todo 的重要程度（HIGH/MEDIUM/LOW） |
| **状态** | Todo 的执行状态（pending/in_progress/completed/cancelled） |
| **只读工具** | Plan 模式下可用的不修改代码的工具 |
| **写工具** | Plan 模式下不可用的会修改代码的工具 |

---

## 结语

恭喜！您已经掌握了 Fuxi CLI 的 Plan+Todo 模式。

### 核心要点回顾

1. 📋 **Plan 阶段**：使用 `Ctrl+P` 进入 Plan 模式，让 AI 创建详细规划
2. ✅ **Todo 阶段**：使用 `/plan to-todos` 转换，用 `/todos execute` 逐步执行
3. ⚙️ **执行控制**：根据任务重要性选择 `default` 或 `auto_edit` 模式
4. 🔗 **依赖管理**：系统自动检查和验证任务依赖关系
5. 📊 **进度追踪**：使用 `/todos list` 查看进度，`/todos export` 导出报告

### 下一步

- 🚀 立即尝试：按 `Ctrl+P` 开始您的第一个计划
- 📖 深入学习：查看更多示例和最佳实践
- 💡 分享反馈：帮助我们改进 Plan+Todo 模式

**祝您使用愉快！**

---

*文档版本：1.0*  
*最后更新：2025-10-16*  
*Fuxi CLI Plan+Todo 模式使用手册*


