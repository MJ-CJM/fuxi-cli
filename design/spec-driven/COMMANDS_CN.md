# Spec-Driven Development 命令参考

> 完整的 SDD 命令列表和使用说明
> 
> **版本**: 1.0.0  
> **最后更新**: 2025-01-19

---

## 📋 命令概览

所有规格驱动开发命令都在 `/spec` 命令下：

```bash
# Constitution 宪章管理
/spec constitution [--init]              # 显示或初始化宪章

# Specification 规格管理
/spec new                                # 创建新规格（AI 引导）
/spec list                               # 列出所有规格
/spec show <spec-id>                     # 显示规格详情
/spec delete <spec-id> [--force]         # 删除规格
/spec search <query>                     # 搜索规格
/spec filter category:<category>         # 按类别过滤
/spec filter status:<status>             # 按状态过滤
/spec update <spec-id>                   # 更新规格（AI 辅助）

# Technical Plan 技术方案管理
/spec plan new <spec-id>                 # 创建技术方案（AI 生成）
/spec plan list <spec-id>                # 列出所有方案
/spec plan show <plan-id>                # 显示方案详情
/spec plan delete <plan-id>              # 删除方案
/spec plan activate <plan-id>            # 激活方案

# Task List 任务列表管理
/spec tasks new <plan-id>                # 创建任务列表（AI 生成）
/spec tasks list <plan-id>               # 列出任务列表
/spec tasks show <tasks-id>              # 显示任务详情
/spec tasks delete <tasks-id>            # 删除任务列表

# Task Execution 任务执行
/spec execute start <tasks-id>           # 批量执行任务
/spec execute task <tasks-id> <task-id>  # 执行单个任务
/spec execute status <tasks-id>          # 查看执行状态
/spec task update <tasks-id> <task-id> --status=<status>  # 手动更新任务状态
```

---

## 1️⃣ Constitution 宪章管理

### `/spec constitution [--init]`

显示或初始化项目宪章。

**用法**：

```bash
# 显示当前宪章
/spec constitution

# 初始化新宪章（AI 交互式引导）
/spec constitution --init
```

**AI 引导问题**：
1. 这是什么类型的项目？（web app、library、CLI tool 等）
2. 核心工程原则是什么？
3. 有哪些技术约束？（Node.js 版本、浏览器支持等）
4. 测试标准是什么？
5. 安全要求是什么？
6. 性能目标是什么？
7. 架构偏好是什么？

**示例输出**：

```
✅ **Constitution Created Successfully**

📁 Saved to: `.gemini/specs/constitution.json`

## Constitution Summary

**Version**: 1.0.0

### 🎯 Core Principles (3)
1. 优先使用组合而非继承
2. 为所有关键路径编写测试
3. 为公共 API 编写文档

### ⚠️ Technical Constraints (2)
1. 必须支持 Node.js 20+
2. 不允许外部运行时依赖

### ✅ Quality Standards
- **Testing**: 80% 代码覆盖率，单元测试 + 集成测试
- **Security**: 符合 OWASP Top 10，定期安全审计
- **Performance**: API 响应时间 < 100ms

### 🏗️ Architecture Guidelines (2)
1. 使用分层架构
2. 遵循 Clean Architecture 原则

💡 **Next Steps**:
- Create specifications with `/spec new`
- View constitution with `/spec constitution`
```

**注意事项**：
- Constitution 是**项目级**配置，通常只创建一次
- 如果宪章已存在，`--init` 会提示用户
- 更新宪章需要 AI 重新调用 `create_constitution` 工具
- 存储位置：`.gemini/specs/constitution.json`

---

## 2️⃣ Specification 规格管理

### `/spec new`

创建新的业务规格（AI 交互式引导）。

**用法**：

```bash
/spec new
```

**AI 引导过程**：

AI 会引导您输入：
1. 功能/需求是什么？
2. 业务目标是什么？（为什么要构建？）
3. 用户是谁？他们想要什么？（用户故事）
4. 如何知道完成了？（验收标准）
5. 有哪些业务约束？（预算、时间、合规性）
6. 优先级？（1-5，1 最高）
7. 业务价值？（1-10）

**重要**：Specification 专注于**业务需求**，不涉及技术实现！

**示例输出**：

```
✅ **Specification Created Successfully**

**ID**: `feat-user-auth`
**Title**: 用户认证系统
**Category**: feature
**Status**: draft
**Priority**: 1/5
**Business Value**: 9/10

📁 Location: `.gemini/specs/features/feat-user-auth.json`

💡 **Next Steps**:
- Review: `/spec show feat-user-auth`
- Generate technical plan: `/spec plan new feat-user-auth`
- Generate tasks: `/spec tasks new <plan-id>`
```

**文件结构**：

```
.gemini/specs/features/
├── feat-user-auth.json
├── feat-payment-processing.json
└── bug-login-timeout.json
```

---

### `/spec list`

列出所有规格，按状态分组显示。

**用法**：

```bash
/spec list
```

**输出示例**：

```
# 📋 Specifications (5)

## 📝 DRAFT (2)
- `feat-user-auth` - 用户认证系统 [P1]
  📂 feature | 📅 1/19/2025

- `feat-payment` - 支付处理系统 [P2]
  📂 feature | 📅 1/18/2025

## 👀 REVIEW (1)
- `bug-login-timeout` - 修复登录超时问题 [P1]
  📂 bug-fix | 📅 1/17/2025

## ✅ APPROVED (2)
- `feat-dashboard` - 用户仪表板 [P2]
  📂 feature | 📅 1/15/2025

- `refactor-api` - API 重构 [P3]
  📂 refactor | 📅 1/10/2025

---

💡 **Commands**:
- View spec: `/spec show <id>`
- Create spec: `/spec new`
```

**状态说明**：
- `draft` 📝 - 草稿
- `review` 👀 - 审查中
- `approved` ✅ - 已批准
- `in-progress` 🔄 - 进行中
- `completed` ✔️ - 已完成
- `cancelled` ❌ - 已取消

---

### `/spec show <spec-id>`

显示规格的完整详情。

**用法**：

```bash
/spec show feat-user-auth
```

**输出示例**：

```
# 用户认证系统

**ID**: `feat-user-auth`
**Category**: feature
**Status**: approved
**Priority**: 1/5
**Business Value**: 9/10
**Created**: 1/15/2025
**Updated**: 1/19/2025

## 🎯 Business Goal

使用户能够安全地访问其个性化内容和功能。

## 👥 User Stories (3)
1. 作为新用户，我想用邮箱和密码注册，以便创建我的账户
2. 作为已注册用户，我想登录系统，以便访问我的内容
3. 作为用户，我想能够安全地退出登录

## ✅ Acceptance Criteria (5)
1. 用户可以使用邮箱和密码注册
2. 密码必须加密存储
3. 用户可以使用邮箱和密码登录
4. 登录成功后生成会话令牌
5. 用户可以安全退出登录

## ⚠️ Constraints (2)
1. 必须符合 GDPR 数据保护要求
2. 密码策略：至少 8 个字符，包含大小写字母和数字

## 🔗 Dependencies
- 无依赖

---

📁 Location: `.gemini/specs/features/feat-user-auth.json`

💡 **Next Steps**:
- Generate technical plan: `/spec plan new feat-user-auth`
- Generate tasks: `/spec tasks new <plan-id>`
```

---

### `/spec delete <spec-id> [--force]`

删除规格及其所有关联数据。

**用法**：

```bash
# 交互式删除（需确认）
/spec delete feat-user-auth

# 强制删除（跳过确认）
/spec delete feat-user-auth --force
```

**交互式确认示例**：

```
⚠️ **Confirm Deletion**

You are about to delete specification: **用户认证系统** (`feat-user-auth`)

**This will also delete 2 technical plan(s)**:
1. OAuth2 Implementation (`plan-feat-user-auth-v2`) - v2
2. JWT-based Authentication (`plan-feat-user-auth-v1`) - v1

**This will also delete 3 task list(s)**:
1. plan-feat-user-auth-v1-default (12 tasks)
2. plan-feat-user-auth-v2-default (15 tasks)
3. plan-feat-user-auth-v2-detailed (25 tasks)

---

**To confirm deletion, please respond with one of the following**:

1. **Delete everything**: Type "yes, delete all" or use `/spec delete feat-user-auth --force`
2. **Cancel**: Type "no" or anything else to cancel

⚠️ This action cannot be undone!
```

**重要说明**：
- 删除 Spec 会**级联删除**所有关联的 Plans 和 Task Lists
- 不带 `--force` 时会显示确认提示
- **操作不可逆**，请谨慎使用

---

### `/spec search <query>`

搜索规格（按标题或 ID 匹配）。

**用法**：

```bash
/spec search auth
/spec search feat-user
/spec search payment
```

**输出示例**：

```
# 🔍 Search Results for "auth"

Found 2 specification(s)

✅ **用户认证系统** [P1]
   ID: `feat-user-auth` | Category: feature | Status: approved
   Updated: 1/19/2025

📝 **OAuth 集成** [P2]
   ID: `feat-oauth-integration` | Category: feature | Status: draft
   Updated: 1/18/2025

---

💡 View details: `/spec show <id>`
```

---

### `/spec filter category:<category>`

按类别过滤规格。

**类别选项**：
- `feature` - 新功能
- `bug-fix` - Bug 修复
- `refactor` - 重构
- `enhancement` - 增强
- `documentation` - 文档

**用法**：

```bash
/spec filter category:feature
/spec filter category:bug-fix
/spec filter category:refactor
```

**输出示例**：

```
# 📋 Specifications (category: feature)

Found 3 specification(s)

- `feat-user-auth` - 用户认证系统 [P1]
  📂 feature | 🏷️ approved | 📅 1/19/2025

- `feat-payment` - 支付处理系统 [P2]
  📂 feature | 🏷️ draft | 📅 1/18/2025

- `feat-dashboard` - 用户仪表板 [P3]
  📂 feature | 🏷️ in-progress | 📅 1/15/2025

---

💡 View details: `/spec show <id>`
```

---

### `/spec filter status:<status>`

按状态过滤规格。

**状态选项**：
- `draft` - 草稿
- `review` - 审查中
- `approved` - 已批准
- `in-progress` - 进行中
- `completed` - 已完成
- `cancelled` - 已取消

**用法**：

```bash
/spec filter status:approved
/spec filter status:in-progress
/spec filter status:draft
```

---

### `/spec update <spec-id>`

更新规格（AI 辅助）。

**用法**：

```bash
/spec update feat-user-auth
```

AI 会询问您想要更新什么，然后指导您修改。

**注意**：目前没有 `update_spec` 工具，需要手动编辑 JSON 文件或让 AI 读取、修改、写回文件。

---

## 3️⃣ Technical Plan 技术方案管理

### `/spec plan new <spec-id>`

为规格创建技术方案（AI 生成）。

**用法**：

```bash
/spec plan new feat-user-auth
```

**AI 生成内容**：
1. 技术选型和理由
2. 架构设计
3. 系统组件
4. 数据流
5. API 设计（如适用）
6. 数据库变更（如适用）
7. 技术风险和缓解策略
8. 测试策略
9. 预估工期

**版本管理**：
- Plan 自动版本化：`v1`, `v2`, `v3`...
- Plan ID 格式：`plan-<spec-id>-<version>`
- 示例：`plan-feat-user-auth-v1`

**一个 Spec 可以有多个 Plan**：
- 不同的技术实现方案
- 不同的架构设计
- 通过 `activate` 命令选择使用哪个

**示例输出**：

```
✅ **Technical Plan Created Successfully**

**Plan ID**: `plan-feat-user-auth-v1`
**Version**: v1
**Spec ID**: `feat-user-auth`
**Status**: ⭐ Active
**Est. Duration**: 2 weeks

## Architecture Summary

**Approach**: JWT-based authentication with bcrypt password hashing

**Components**: (5)
1. User model with encrypted password storage
2. Authentication middleware
3. JWT token generation and validation
4. Login/logout API endpoints
5. Session management

**Tech Stack**: (4)
1. Node.js + Express
2. PostgreSQL
3. bcrypt for password hashing
4. jsonwebtoken for JWT

## Implementation

**Files**: (8)
1. models/User.ts
2. middleware/auth.ts
3. routes/auth.ts
4. services/authService.ts
...

## Risks (2)
🟡 **Token storage security**
   - Mitigation: Use httpOnly cookies, short expiration

🟢 **Password reset flow**
   - Mitigation: Implement email verification

📁 Location: `.gemini/specs/plans/plan-feat-user-auth-v1.json`

💡 **Commands**:
- List all plans: `/spec plan list feat-user-auth`
- Generate tasks: Use `spec_to_tasks` tool with planId: `plan-feat-user-auth-v1`
```

---

### `/spec plan list <spec-id>`

列出规格的所有技术方案。

**用法**：

```bash
/spec plan list feat-user-auth
```

**输出示例**：

```
# 🏗️ Technical Plans for 用户认证系统

**Spec ID**: `feat-user-auth`
**Total Plans**: 2

1. ⭐ **OAuth2 Implementation** (`plan-feat-user-auth-v2`)
   - Version: v2
   - Description: Use OAuth2 with Google and GitHub providers
   - Status: Active
   - Est. Duration: 3 weeks
   - Updated: 1/19/2025

2. **JWT-based Authentication** (`plan-feat-user-auth-v1`)
   - Version: v1
   - Description: Simple JWT implementation with bcrypt
   - Status: Inactive
   - Est. Duration: 2 weeks
   - Updated: 1/15/2025

---

💡 **Commands**:
- Show plan: `/spec plan show <plan-id>`
- Create new plan: `/spec plan new feat-user-auth`
- Activate plan: `/spec plan activate <plan-id>`
- Delete plan: `/spec plan delete <plan-id>`
```

**关键信息**：
- ⭐ 标记表示 Active Plan
- 同一 Spec 只能有一个 Active Plan
- 可以创建多个 Plan 对比不同方案

---

### `/spec plan show <plan-id>`

显示技术方案的完整详情。

**用法**：

```bash
/spec plan show plan-feat-user-auth-v1
```

**输出示例**：

```
# 🏗️ Technical Plan: JWT-based Authentication

**Plan ID**: `plan-feat-user-auth-v1`
**Version**: v1
**Spec ID**: `feat-user-auth`
**Status**: Inactive
**Created**: 1/15/2025
**Updated**: 1/15/2025
**Est. Duration**: 2 weeks

## Architecture

JWT-based authentication system with secure password hashing using bcrypt. 
Stateless authentication with token-based session management.

**Data Flow**: Client → Login Endpoint → Validate Credentials → Generate JWT → Return Token → Client stores in httpOnly cookie

**Components** (5):
1. User model with encrypted password storage
2. Authentication middleware for route protection
3. JWT token generation and validation service
4. Login/logout API endpoints
5. Password reset flow with email verification

**Tech Stack** (4):
1. Node.js + Express.js
2. PostgreSQL for user storage
3. bcrypt for password hashing
4. jsonwebtoken library

## Implementation

**Files** (8):
1. models/User.ts
2. models/Session.ts
3. middleware/auth.ts
4. routes/auth.ts
5. services/authService.ts
6. services/tokenService.ts
7. utils/passwordHash.ts
8. types/auth.types.ts

## Risks (3)

1. 🟡 **Token storage security**
   - Severity: medium
   - Mitigation: Use httpOnly cookies, implement token refresh, short expiration times

2. 🟢 **Password reset flow complexity**
   - Severity: low
   - Mitigation: Use established libraries, implement rate limiting

3. 🔴 **Session hijacking via XSS**
   - Severity: high
   - Mitigation: CSP headers, input sanitization, httpOnly + secure cookies

## Testing Strategy

- **Unit**: Test password hashing, token generation, middleware logic
- **Integration**: Test full auth flow, token validation, session management
- **Coverage**: Target 90% for auth-related code

---

📁 Location: `.gemini/specs/plans/plan-feat-user-auth-v1.json`

💡 **Commands**:
- List all plans: `/spec plan list feat-user-auth`
- Generate tasks: Use `spec_to_tasks` tool with planId: `plan-feat-user-auth-v1`
- Activate this plan: `/spec plan activate plan-feat-user-auth-v1`
```

---

### `/spec plan delete <plan-id>`

删除技术方案。

**用法**：

```bash
/spec plan delete plan-feat-user-auth-v1
```

**注意事项**：
- 会同时删除该 Plan 的**所有 Task Lists**
- 交互式确认提示
- 操作不可逆

**确认提示示例**：

```
✅ **Plan Deleted**

Deleted: `plan-feat-user-auth-v1` - JWT-based Authentication
Version: v1

**Also deleted 2 task list(s)**:
- plan-feat-user-auth-v1-default
- plan-feat-user-auth-v1-detailed

💡 View remaining plans: `/spec plan list feat-user-auth`
```

---

### `/spec plan activate <plan-id>`

将某个方案设为 active（同一个 Spec 只能有一个 active plan）。

**用法**：

```bash
/spec plan activate plan-feat-user-auth-v2
```

**效果**：
- 将指定 Plan 设为 `active`
- 自动将同 Spec 的其他 Plans 设为 `inactive`

**输出示例**：

```
✅ **Plan Activated**

Active plan: `plan-feat-user-auth-v2` - OAuth2 Implementation
Version: v2

All other plans for spec `feat-user-auth` have been deactivated.

💡 View all plans: `/spec plan list feat-user-auth`
```

---

## 4️⃣ Task List 任务列表管理

### `/spec tasks new <plan-id>`

从技术方案生成任务列表（AI 生成）。

**用法**：

```bash
/spec tasks new plan-feat-user-auth-v1
```

**AI 生成内容**：
1. Implementation 任务（实现核心功能）
2. Testing 任务（编写测试）
3. Documentation 任务（文档和注释）
4. Review 任务（代码审查和质量检查）

**变体（Variant）系统**：
- 一个 Plan 可以有多个 Task List 变体
- 默认变体：`default`
- Task List ID 格式：`<plan-id>-<variant>`
- 示例：`plan-feat-user-auth-v1-default`

**变体使用场景**：
- `default` - 标准任务分解
- `detailed` - 详细的任务分解（更多小任务）
- `simplified` - 简化的任务分解（里程碑）
- `milestone` - 仅包含关键里程碑任务

**示例输出**：

```
✅ Task List Created Successfully

📁 Saved to: `.gemini/specs/tasks/plan-feat-user-auth-v1-default.json`

## Task Breakdown

**Total Tasks**: 12

### 💻 IMPLEMENTATION (8)

1. 🔴 **Create User model** (`task-001`)
   - Create database schema and TypeScript interface
   - Estimated: 2 hours
   - Files: 2 file(s)

2. 🔴 **Implement password hashing** (`task-002`)
   - Dependencies: task-001
   - Estimated: 1 hour
   - Files: 1 file(s)

3. 🟡 **Create JWT token service** (`task-003`)
   - Dependencies: task-001
   - Estimated: 3 hours
   - Files: 2 file(s)

...

### 🧪 TESTING (3)

1. 🟡 **Write unit tests for auth service** (`task-009`)
   - Dependencies: task-002, task-003
   - Estimated: 2 hours
   - Files: 1 file(s)

...

### 📝 DOCUMENTATION (1)

1. 🟢 **Document API endpoints** (`task-011`)
   - Dependencies: task-008
   - Estimated: 1 hour
   - Files: 1 file(s)

### 📋 Execution Order

Tasks should be executed considering their dependencies.
Tasks without dependencies can be executed first or in parallel.

---

**Next Steps**:
- View tasks: `/spec tasks show plan-feat-user-auth-v1-default`
- List all task lists: `/spec tasks list plan-feat-user-auth-v1`
- Start implementation following the task order
- Update task status as you progress
```

---

### `/spec tasks list <plan-id>`

列出方案的所有任务列表。

**用法**：

```bash
/spec tasks list plan-feat-user-auth-v1
```

**输出示例**：

```
# 📋 Task Lists for JWT-based Authentication

**Plan ID**: `plan-feat-user-auth-v1`
**Total Task Lists**: 2

1. **plan-feat-user-auth-v1-default**
   - Variant: default
   - Tasks: 12
   - Updated: 1/19/2025

2. **plan-feat-user-auth-v1-detailed**
   - Variant: detailed
   - Description: More granular task breakdown for complex implementation
   - Tasks: 25
   - Updated: 1/18/2025

---

💡 **Commands**:
- Show task list: `/spec tasks show <tasks-id>`
- Create new task list: `/spec tasks new plan-feat-user-auth-v1`
- Delete task list: `/spec tasks delete <tasks-id>`
```

---

### `/spec tasks show <tasks-id>`

显示任务列表的所有任务。

**用法**：

```bash
/spec tasks show plan-feat-user-auth-v1-default
```

**输出示例**：

```
# 📋 Task List: plan-feat-user-auth-v1-default

**Tasks ID**: `plan-feat-user-auth-v1-default`
**Plan ID**: `plan-feat-user-auth-v1`
**Spec ID**: `feat-user-auth`
**Variant**: default
**Created**: 1/19/2025
**Updated**: 1/19/2025
**Total Tasks**: 12

## 💻 IMPLEMENTATION (8)

1. ⏳ 🔴 **Create User model** (`task-001`)
   - Create database schema and TypeScript interface for User entity
   - Estimated: 2 hours
   - Files: 2 file(s)

2. ⏳ 🔴 **Implement password hashing** (`task-002`)
   - Use bcrypt to hash passwords before storage
   - Dependencies: task-001
   - Estimated: 1 hour
   - Files: 1 file(s)

3. ⏳ 🟡 **Create JWT token service** (`task-003`)
   - Implement token generation, validation, and refresh logic
   - Dependencies: task-001
   - Estimated: 3 hours
   - Files: 2 file(s)

4. ⏳ 🟡 **Build authentication middleware** (`task-004`)
   - Create middleware to protect routes
   - Dependencies: task-003
   - Estimated: 2 hours
   - Files: 1 file(s)

5. ⏳ 🔴 **Implement register endpoint** (`task-005`)
   - POST /auth/register endpoint
   - Dependencies: task-001, task-002
   - Estimated: 2 hours
   - Files: 1 file(s)

6. ⏳ 🔴 **Implement login endpoint** (`task-006`)
   - POST /auth/login endpoint
   - Dependencies: task-002, task-003
   - Estimated: 2 hours
   - Files: 1 file(s)

7. ⏳ 🟡 **Implement logout endpoint** (`task-007`)
   - POST /auth/logout endpoint
   - Dependencies: task-003
   - Estimated: 1 hour
   - Files: 1 file(s)

8. ⏳ 🟢 **Add input validation** (`task-008`)
   - Validate email, password strength
   - Dependencies: task-005, task-006
   - Estimated: 1 hour
   - Files: 1 file(s)

## 🧪 TESTING (3)

1. ⏳ 🟡 **Write unit tests for auth service** (`task-009`)
   - Test password hashing, token generation
   - Dependencies: task-002, task-003
   - Estimated: 2 hours
   - Files: 1 file(s)

2. ⏳ 🟡 **Write integration tests** (`task-010`)
   - Test full auth flow end-to-end
   - Dependencies: task-005, task-006, task-007
   - Estimated: 3 hours
   - Files: 1 file(s)

3. ⏳ 🟢 **Write API endpoint tests** (`task-011`)
   - Test all API endpoints
   - Dependencies: task-005, task-006, task-007
   - Estimated: 2 hours
   - Files: 1 file(s)

## 📝 DOCUMENTATION (1)

1. ⏳ 🟢 **Document API endpoints** (`task-012`)
   - Write OpenAPI/Swagger docs
   - Dependencies: task-005, task-006, task-007
   - Estimated: 1 hour
   - Files: 1 file(s)

---

📁 Location: `.gemini/specs/tasks/plan-feat-user-auth-v1-default.json`

💡 **Commands**:
- List all task lists: `/spec tasks list plan-feat-user-auth-v1`
- Start implementing tasks in order, considering dependencies
```

**状态图标**：
- ⏳ = pending
- 🔄 = in_progress
- ✅ = completed
- 🚫 = blocked

**优先级图标**：
- 🔴 = high
- 🟡 = medium
- 🟢 = low

---

### `/spec tasks delete <tasks-id>`

删除任务列表。

**用法**：

```bash
/spec tasks delete plan-feat-user-auth-v1-default
```

**输出示例**：

```
✅ **Task List Deleted**

Deleted: `plan-feat-user-auth-v1-default`
Variant: default
Tasks: 12

💡 View remaining task lists: `/spec tasks list plan-feat-user-auth-v1`
```

---

## 5️⃣ Task Execution 任务执行

### `/spec execute start <tasks-id>`

批量执行任务列表中的所有任务。

**用法**：

```bash
/spec execute start plan-feat-user-auth-v1-default
```

**执行机制**：
1. AI 自动查找下一个可执行任务（依赖已满足）
2. 执行任务实现
3. 自动更新任务状态为 `completed`
4. 自动查找下一个可执行任务
5. **自动继续执行**，无需用户干预
6. 直到所有任务完成或遇到阻塞

**关键特性**：
- ✅ **自动依赖解析**：使用拓扑排序确定执行顺序
- ✅ **自动状态更新**：任务完成后自动标记为 completed
- ✅ **自动继续执行**：批量模式不会停下来
- ✅ **循环依赖检测**：防止无限循环

**示例输出**：

```
🚀 **Starting Task Execution**

Task list: `plan-feat-user-auth-v1-default`
Total tasks: 12

I will now execute the next task with all dependencies satisfied.
Let me start with task `task-001`...

---

[AI 开始执行任务...]

▶️ [1/12] Create User model...
✓ Created models/User.ts
✓ Created models/User.schema.ts

▶️ [2/12] Implement password hashing...
✓ Created utils/passwordHash.ts

[继续自动执行...]

▶️ [12/12] Document API endpoints...
✓ Updated README.md

---

✅ Batch Execution Complete!
📊 Executed 12/12 tasks in 45 minutes
```

**注意事项**：
- AI 会**自动连续执行**所有任务
- 不需要每个任务后等待用户确认
- 遇到错误或依赖阻塞时会停止并报告

---

### `/spec execute task <tasks-id> <task-id>`

执行单个特定任务。

**用法**：

```bash
/spec execute task plan-feat-user-auth-v1-default task-001
```

**使用场景**：
- 重新执行失败的任务
- 跳过某些任务后单独执行
- 调试特定任务
- 手动控制执行顺序

**示例输出**：

```
🚀 **Executing Task**

Task: Create User model (`task-001`)
Type: implementation
Priority: high

I will now execute this task...

---

[AI 执行任务...]

✓ Created models/User.ts
✓ Created models/User.schema.ts
✓ Task completed successfully

💡 Next: Update task status with `/spec task update plan-feat-user-auth-v1-default task-001 --status=completed`
```

---

### `/spec execute status <tasks-id>`

查看任务列表的执行状态和进度。

**用法**：

```bash
/spec execute status plan-feat-user-auth-v1-default
```

**输出示例**：

```
# 📊 Execution Status

**Task List**: `plan-feat-user-auth-v1-default`
**Total Tasks**: 12

**Status**: 🔄 in_progress
**Started**: 1/19/2025, 2:30 PM

### Progress

**Overall**: 7/12 (58%)
- ✅ Completed: 7
- ⏳ Pending: 4
- ❌ Failed: 1

### ❌ Failed Tasks

- `task-006`: Implement login endpoint

### 🎯 Next Task

**Create JWT token service** (`task-003`)
Type: implementation
Priority: medium

---

💡 **Commands**:
- Execute next: `/spec execute task plan-feat-user-auth-v1-default task-003`
- View tasks: `/spec tasks show plan-feat-user-auth-v1-default`
```

---

### `/spec task update <tasks-id> <task-id> --status=<status>`

手动更新任务状态。

**状态值**：
- `pending` - 待执行
- `in_progress` - 执行中
- `completed` - 已完成
- `blocked` - 被阻塞

**用法**：

```bash
# 标记任务为完成
/spec task update plan-feat-user-auth-v1-default task-001 --status=completed

# 标记任务为阻塞
/spec task update plan-feat-user-auth-v1-default task-006 --status=blocked

# 标记任务为进行中
/spec task update plan-feat-user-auth-v1-default task-002 --status=in_progress
```

**输出示例**：

```
✅ **Task Status Updated**

Task: Create User model (`task-001`)
New status: **completed**

Progress: 1/12 (8%)

💡 View status: `/spec execute status plan-feat-user-auth-v1-default`
```

---

## 🔄 完整工作流示例

### 场景 1：从零开始开发新功能

```bash
# 1. 创建宪章（一次性）
/spec constitution --init
# → AI 引导您定义项目原则、质量标准等

# 2. 创建业务规格
/spec new
# → AI 引导您定义业务需求
# → 生成 feat-user-auth

# 3. 查看规格
/spec show feat-user-auth

# 4. 生成技术方案（v1）
/spec plan new feat-user-auth
# → AI 分析需求，生成技术设计
# → 生成 plan-feat-user-auth-v1

# 5. 查看技术方案
/spec plan show plan-feat-user-auth-v1

# 6. 生成任务列表
/spec tasks new plan-feat-user-auth-v1
# → AI 拆分为可执行任务
# → 生成 plan-feat-user-auth-v1-default

# 7. 查看任务
/spec tasks show plan-feat-user-auth-v1-default

# 8. 批量执行任务
/spec execute start plan-feat-user-auth-v1-default
# → AI 自动按顺序执行所有任务

# 9. 查看执行进度
/spec execute status plan-feat-user-auth-v1-default

# 10. 列出所有规格
/spec list
```

---

### 场景 2：创建多个技术方案并选择

```bash
# 1. 创建规格
/spec new
# → 生成 feat-payment

# 2. 生成第一个方案（REST API + Stripe）
/spec plan new feat-payment
# (告诉 AI：使用 REST API + Stripe 集成)
# → 生成 plan-feat-payment-v1

# 3. 生成第二个方案（GraphQL + PayPal）
/spec plan new feat-payment
# (告诉 AI：使用 GraphQL + PayPal 集成)
# → 生成 plan-feat-payment-v2

# 4. 列出所有方案对比
/spec plan list feat-payment
# → 显示 v1 和 v2，可以查看两个方案的详情

# 5. 查看方案详情
/spec plan show plan-feat-payment-v1
/spec plan show plan-feat-payment-v2

# 6. 选择并激活方案 v2
/spec plan activate plan-feat-payment-v2
# → v2 变为 active，v1 变为 inactive

# 7. 基于 active plan 生成任务
/spec tasks new plan-feat-payment-v2

# 8. 开始执行
/spec execute start plan-feat-payment-v2-default
```

---

### 场景 3：搜索和过滤管理

```bash
# 搜索所有认证相关的规格
/spec search auth

# 查看所有功能类规格
/spec filter category:feature

# 查看所有进行中的规格
/spec filter status:in-progress

# 查看所有待审查的规格
/spec filter status:review

# 列出所有规格（按状态分组）
/spec list
```

---

### 场景 4：任务执行和状态管理

```bash
# 1. 开始批量执行
/spec execute start plan-feat-user-auth-v1-default

# 2. 中途查看进度
/spec execute status plan-feat-user-auth-v1-default

# 3. 如果某个任务失败，手动标记为阻塞
/spec task update plan-feat-user-auth-v1-default task-006 --status=blocked

# 4. 修复问题后，手动执行该任务
/spec execute task plan-feat-user-auth-v1-default task-006

# 5. 任务完成后，更新状态
/spec task update plan-feat-user-auth-v1-default task-006 --status=completed

# 6. 继续批量执行
/spec execute start plan-feat-user-auth-v1-default
```

---

## 📊 数据关系图

```
Constitution (1)                             # 项目级
    ↓
Specification (N)                            # 业务级
    ├── feat-user-auth
    ├── feat-payment
    └── bug-login-timeout
    ↓
Technical Plan (N) [versioned: v1, v2, v3...] # 技术级（多版本）
    ├── plan-feat-user-auth-v1 (inactive)
    ├── plan-feat-user-auth-v2 (active) ⭐
    └── plan-feat-payment-v1 (active) ⭐
    ↓
Task List (N) [variants: default, detailed...]  # 执行级（多变体）
    ├── plan-feat-user-auth-v1-default
    ├── plan-feat-user-auth-v2-default
    └── plan-feat-user-auth-v2-detailed
    ↓
Task (N)                                     # 原子任务
    ├── task-001 (completed) ✅
    ├── task-002 (in_progress) 🔄
    ├── task-003 (pending) ⏳
    └── task-004 (blocked) 🚫
```

**关键关系**：
- 1 Constitution → 多个 Specifications
- 1 Specification → 多个 Technical Plans（版本管理）
- 1 Technical Plan → 多个 Task Lists（变体管理）
- 1 Task List → 多个 Tasks
- **级联删除**：删除父对象会自动删除所有子对象

---

## 🎯 命令速查表

| 类别 | 命令 | 说明 |
|------|------|------|
| **Constitution** |
| | `/spec constitution` | 显示宪章 |
| | `/spec constitution --init` | 初始化宪章（AI 引导） |
| **Specification** |
| | `/spec new` | 创建规格（AI 引导） |
| | `/spec list` | 列出所有规格 |
| | `/spec show <spec-id>` | 显示规格详情 |
| | `/spec search <query>` | 搜索规格 |
| | `/spec filter category:<cat>` | 按类别过滤 |
| | `/spec filter status:<status>` | 按状态过滤 |
| | `/spec delete <spec-id> [--force]` | 删除规格 |
| | `/spec update <spec-id>` | 更新规格（AI 辅助） |
| **Technical Plan** |
| | `/spec plan new <spec-id>` | 创建技术方案（AI 生成） |
| | `/spec plan list <spec-id>` | 列出所有方案 |
| | `/spec plan show <plan-id>` | 显示方案详情 |
| | `/spec plan activate <plan-id>` | 激活方案 |
| | `/spec plan delete <plan-id>` | 删除方案 |
| **Task List** |
| | `/spec tasks new <plan-id>` | 创建任务列表（AI 生成） |
| | `/spec tasks list <plan-id>` | 列出任务列表 |
| | `/spec tasks show <tasks-id>` | 显示任务详情 |
| | `/spec tasks delete <tasks-id>` | 删除任务列表 |
| **Task Execution** |
| | `/spec execute start <tasks-id>` | 批量执行任务 |
| | `/spec execute task <tasks-id> <task-id>` | 执行单个任务 |
| | `/spec execute status <tasks-id>` | 查看执行状态 |
| | `/spec task update <tasks-id> <task-id> --status=<status>` | 更新任务状态 |

---

## 💡 最佳实践

### 1. Constitution 最佳实践

- ✅ **一次性创建**：项目开始时创建一次，后续很少修改
- ✅ **明确具体**：原则和标准要具体可执行
- ✅ **团队共识**：确保团队成员都理解和认同
- ✅ **定期回顾**：项目演进时可以更新宪章

### 2. Specification 最佳实践

- ✅ **专注业务**：只描述业务需求，不涉及技术实现
- ✅ **用户视角**：用用户故事描述需求
- ✅ **明确标准**：验收标准要清晰可验证
- ✅ **及时更新**：需求变化时更新规格状态

### 3. Technical Plan 最佳实践

- ✅ **多方案对比**：可以创建多个 Plan 对比不同技术方案
- ✅ **版本管理**：使用版本号管理方案演进
- ✅ **风险评估**：充分考虑技术风险和缓解策略
- ✅ **激活管理**：明确哪个是当前使用的方案

### 4. Task List 最佳实践

- ✅ **任务粒度**：任务不要太大，2-4 小时为宜
- ✅ **依赖清晰**：明确任务间的依赖关系
- ✅ **类型分类**：合理分配 implementation、testing、documentation 任务
- ✅ **使用变体**：针对不同场景创建不同粒度的任务列表

### 5. Execution 最佳实践

- ✅ **批量执行**：优先使用 `execute start` 让 AI 自动执行
- ✅ **定期检查**：使用 `execute status` 了解进度
- ✅ **及时处理阻塞**：遇到阻塞任务及时处理
- ✅ **状态同步**：确保任务状态与实际进度一致

---

## ⚠️ 注意事项

### 删除操作
- ⚠️ **不可逆**：所有删除操作都不可逆，删除前请确认
- ⚠️ **级联删除**：删除 Spec 会同时删除所有 Plans 和 Task Lists
- ⚠️ **使用 --force**：跳过确认时要特别小心

### 版本管理
- 💡 **多版本**：可以为一个 Spec 创建多个 Plan 版本
- 💡 **只能有一个 active**：同一 Spec 只能有一个 active Plan
- 💡 **版本号自动**：Plan 版本号自动递增（v1, v2, v3...）

### 依赖关系
- 💡 **依赖重要**：任务依赖错误会导致执行阻塞
- 💡 **循环检测**：系统会自动检测循环依赖
- 💡 **依赖必须存在**：依赖的任务 ID 必须在同一任务列表中

### 批量执行
- 💡 **自动继续**：批量执行模式 AI 不会停下来
- 💡 **错误停止**：遇到错误或依赖阻塞时会停止
- 💡 **可以中断**：可以随时停止批量执行

### 文件格式
- 💡 **JSON 格式**：所有数据以 JSON 格式存储
- 💡 **存储位置**：`.gemini/specs/` 目录
- 💡 **手动编辑**：可以手动编辑 JSON 文件，但要注意格式

---

## 📂 文件结构

```
.gemini/specs/
├── constitution.json                          # 项目宪章
├── features/                                  # 规格文档
│   ├── feat-user-auth.json
│   ├── feat-payment-processing.json
│   └── bug-login-timeout.json
├── plans/                                     # 技术方案（支持多版本）
│   ├── plan-feat-user-auth-v1.json
│   ├── plan-feat-user-auth-v2.json
│   ├── plan-feat-payment-processing-v1.json
│   └── plan-bug-login-timeout-v1.json
└── tasks/                                     # 任务列表（支持多变体）
    ├── plan-feat-user-auth-v1-default.json
    ├── plan-feat-user-auth-v1-detailed.json
    ├── plan-feat-user-auth-v2-default.json
    ├── plan-feat-user-auth-v2-simplified.json
    └── plan-feat-payment-processing-v1-default.json
```

---

## 🆘 故障排查

### 问题 1：命令不识别

**症状**：`/spec` 命令不被识别

**解决方案**：
1. 确认已构建项目：`npm run build`
2. 确认已启动 CLI：`npm start`
3. 查看所有命令：`/help`

### 问题 2：找不到文件

**症状**：提示找不到 spec、plan 或 tasks 文件

**解决方案**：
1. 检查 ID 是否正确：`/spec list` 或 `/spec plan list <spec-id>`
2. 检查文件是否存在：查看 `.gemini/specs/` 目录
3. 确认路径正确：必须在项目根目录运行命令

### 问题 3：依赖阻塞

**症状**：任务执行时提示依赖未满足

**解决方案**：
1. 查看依赖任务状态：`/spec tasks show <tasks-id>`
2. 确认依赖任务已完成
3. 手动更新依赖任务状态：`/spec task update <tasks-id> <task-id> --status=completed`

### 问题 4：AI 不执行任务

**症状**：批量执行时 AI 停下来了

**解决方案**：
1. 检查是否有错误消息
2. 检查任务依赖是否满足：`/spec execute status <tasks-id>`
3. 如果卡住，尝试单独执行下一个任务：`/spec execute task <tasks-id> <task-id>`

### 问题 5：无法删除

**症状**：删除 spec 时提示有关联数据

**解决方案**：
1. 使用 `--force` 强制删除：`/spec delete <spec-id> --force`
2. 或先手动删除 plans 和 tasks
3. **注意**：删除不可逆，请确认

---

## 📞 获取帮助

### 查看命令帮助

```bash
# 查看所有命令
/help

# 查看 spec 命令
/spec

# 查看特定命令详情（在本文档中查找）
```

### 更多资源

- **快速开始指南**：`design/spec-driven/QUICK_START_CN.md`
- **完整用户指南**：`design/spec-driven/USER_GUIDE_CN.md`
- **系统概览**：`design/spec-driven/README.md`

---

**文档版本**: 1.0.0  
**创建日期**: 2025-01-19  
**维护者**: fuxi-cli 开发团队  
**License**: Apache 2.0
