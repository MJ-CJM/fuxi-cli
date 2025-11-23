# Spec-Driven Development 用户指南

> 完整的 Spec-Driven Development 使用指南
>
> **版本**: 1.0.0
> **最后更新**: 2025-01-19

---

## 📚 目录

1. [什么是 Spec-Driven Development](#什么是-spec-driven-development)
2. [核心概念](#核心概念)
3. [安装和设置](#安装和设置)
4. [完整工作流](#完整工作流)
5. [命令参考](#命令参考)
6. [API 参考](#api-参考)
7. [最佳实践](#最佳实践)
8. [常见问题](#常见问题)
9. [故障排查](#故障排查)

---

## 什么是 Spec-Driven Development

Spec-Driven Development (SDD) 是一种结构化的软件开发方法，灵感来自 GitHub 的 Spec Kit。它通过将需求、设计和实现明确分离，帮助团队更好地协作和交付。

### 核心理念

```
宪章 (Constitution)
    ↓
规格 (Specification) - 业务需求
    ↓
技术方案 (Technical Plan) - 技术设计
    ↓
任务 (Tasks) - 可执行步骤
    ↓
实现 (Implementation) - 代码实现
```

### 主要优势

- ✅ **编码前明确需求** - 减少返工和误解
- ✅ **业务和技术分离** - 更好的关注点分离
- ✅ **可追溯性** - 从需求到代码的完整追踪
- ✅ **团队协作** - 产品、设计、工程各司其职
- ✅ **质量保证** - 内置验证和标准检查

---

## 核心概念

### 1. Constitution（宪章）

项目的"宪法"，定义工程原则和标准。

**用途**:
- 建立项目范围的开发标准
- 定义架构指南和约束
- 设置质量要求（测试、安全、性能）

**示例**:
```json
{
  "version": "1.0.0",
  "principles": [
    "优先使用组合而非继承",
    "为所有关键路径编写测试",
    "为公共 API 编写文档"
  ],
  "qualityStandards": {
    "testing": "80% 代码覆盖率，单元测试 + 集成测试",
    "security": "符合 OWASP Top 10",
    "performance": "API 响应时间 < 100ms"
  }
}
```

### 2. Specification（规格）

从**业务视角**描述**需要构建什么**，不涉及技术实现。

**关键字段**:
- `businessGoal` - 业务目标（为什么要构建？）
- `userStories` - 用户故事（用户想要什么？）
- `acceptanceCriteria` - 验收标准（如何知道完成？）
- `constraints` - 业务约束（预算、时间、合规性）

**示例**:
```json
{
  "id": "feat-user-auth",
  "title": "用户认证系统",
  "category": "feature",
  "status": "approved",
  "businessGoal": "使用户能够安全访问其个性化内容",
  "userStories": [
    "作为新用户，我想用邮箱/密码注册",
    "作为已注册用户，我想登录访问我的内容"
  ],
  "acceptanceCriteria": [
    "用户可以使用有效邮箱和强密码注册",
    "用户会话在 24 小时不活动后过期"
  ],
  "priority": 1,
  "businessValue": 9
}
```

### 3. Technical Plan（技术方案）

从**技术视角**描述**如何实现**规格。

**关键字段**:
- `architecture` - 架构设计（方法、组件、数据流）
- `implementation` - 实现细节（文件、API、数据库）
- `risks` - 技术风险和缓解策略
- `testingStrategy` - 测试策略
- `estimatedDuration` - 工作量估算

**示例**:
```json
{
  "id": "plan-feat-user-auth",
  "specId": "feat-user-auth",
  "title": "用户认证技术方案",
  "architecture": {
    "approach": "JWT-based authentication with bcrypt password hashing",
    "components": [
      "AuthService - Handle authentication logic",
      "UserRepository - Database operations"
    ],
    "dataFlow": "User → API → AuthService → UserRepository → Database"
  },
  "risks": [
    {
      "description": "Token expiration handling",
      "severity": "medium",
      "mitigation": "Implement refresh token mechanism"
    }
  ],
  "estimatedDuration": "5 days"
}
```

### 4. Spec Tasks（规格任务）

将技术方案分解为可执行的具体任务。

**任务类型**:
- `implementation` - 核心功能实现
- `testing` - 编写和运行测试
- `documentation` - 代码注释、README、API 文档
- `review` - 代码审查、质量检查

**示例**:
```json
{
  "id": "task-001",
  "title": "Implement AuthService",
  "description": "Create authentication service with JWT generation",
  "type": "implementation",
  "priority": "high",
  "dependencies": [],
  "files": ["src/services/AuthService.ts"],
  "estimatedTime": "4 hours"
}
```

---

## 安装和设置

### 前置条件

```bash
# 确保 Node.js 20+ 已安装
node --version  # 应该 >= v20.0.0

# 确保项目已构建
npm run build
```

### 启动 CLI

```bash
npm start
```

---

## 完整工作流

### 步骤 1: 创建 Constitution（一次性）

```bash
/spec constitution --init
```

**AI 会问你**:
1. 这是什么类型的项目？
2. 核心工程原则是什么？
3. 有什么技术约束？
4. 测试标准是什么？
5. 安全要求是什么？
6. 性能目标是什么？
7. 架构偏好是什么？

**提示**:
- 专注于长期有效的原则
- 使原则具体且可操作
- 保持原则数量合理（3-7 条）

---

### 步骤 2: 创建 Specification

```bash
/spec new
```

**AI 会问你**:
1. 你想构建什么功能/变更？
2. 业务目标是什么？（为什么要构建？）
3. 用户是谁？他们想要什么？（用户故事）
4. 如何知道已经完成？（验收标准）
5. 有什么业务约束吗？
6. 优先级（1-5）？
7. 业务价值（1-10）？

**重要**: 专注于业务需求，不要提及技术实现！

**好的示例**:
```
用户故事: "作为客户，我希望在订单发货时收到邮件通知"
验收标准: "客户在发货后 5 分钟内收到邮件"
```

**不好的示例**:
```
用户故事: "使用 SendGrid API 发送邮件"  ❌ 太技术化
验收标准: "使用 React hooks 实现"  ❌ 实现细节
```

---

### 步骤 3: 查看和管理 Specifications

```bash
# 列出所有规格
/spec list

# 查看特定规格
/spec show feat-user-auth
```

**输出示例**:
```markdown
# 📋 Specifications (3)

## 📝 DRAFT (2)
- `feat-user-auth` - 用户认证系统 [P1]
  📂 feature | 📅 10/18/2025

## ✅ APPROVED (1)
- `feat-payment` - 支付处理 [P2]
  📂 feature | 📅 10/17/2025
```

---

### 步骤 4: 生成 Technical Plan

```bash
/spec plan new feat-user-auth
# → 生成 plan-feat-user-auth-v1
```

**AI 会生成**:
- 架构设计（技术方法、组件、数据流）
- 实现细节（文件列表、API、数据库）
- 技术风险评估和缓解策略
- 完整的测试策略
- 性能和安全考虑
- 工作量估算

**查看生成的方案**:
```bash
/spec plan show plan-feat-user-auth-v1
```

---

### 步骤 5: 生成 Tasks

```bash
/spec tasks new plan-feat-user-auth-v1
# → 生成 plan-feat-user-auth-v1-default
```

**前提条件**: 技术方案必须已存在

**AI 会生成**:
- 按类型分类的任务（implementation、testing、documentation、review）
- 任务之间的依赖关系
- 每个任务的文件关联
- 工作量估算
- 优先级设置

**查看生成的任务**:
```bash
/spec tasks show plan-feat-user-auth-v1-default
```

---

### 步骤 6: 开始实现

根据任务列表逐步实现功能。

**建议流程**:
1. 按依赖顺序执行任务
2. 优先执行高优先级任务
3. 每完成一个任务，更新状态
4. 定期 review 进度

---

## 命令参考

### Constitution 命令

| 命令 | 说明 |
|------|------|
| `/spec constitution --init` | 创建新 constitution（交互式） |
| `/spec constitution` | 显示当前 constitution |

### Specification 命令

| 命令 | 说明 |
|------|------|
| `/spec new` | 创建新规格（交互式） |
| `/spec list` | 列出所有规格 |
| `/spec show <id>` | 显示规格详情 |

### Technical Plan 命令

| 命令 | 说明 |
|------|------|
| `/spec plan new <spec-id>` | 生成技术方案（AI） |
| `/spec plan list <spec-id>` | 列出所有方案 |
| `/spec plan show <plan-id>` | 显示技术方案详情 |
| `/spec plan activate <plan-id>` | 激活方案 |
| `/spec plan delete <plan-id>` | 删除方案 |

### Tasks 命令

| 命令 | 说明 |
|------|------|
| `/spec tasks new <plan-id>` | 生成任务列表（AI） |
| `/spec tasks list <plan-id>` | 列出任务列表 |
| `/spec tasks show <tasks-id>` | 显示任务详情 |
| `/spec tasks delete <tasks-id>` | 删除任务列表 |

---

## API 参考

### SpecManager API

#### Constitution 管理

```typescript
import { SpecManager } from '@google/gemini-cli-core';

const manager = new SpecManager(config);

// 加载 constitution
const constitution = manager.loadConstitution();

// 保存 constitution
manager.saveConstitution(constitution);

// 检查是否存在
const exists = manager.constitutionExists();
```

#### Specification CRUD

```typescript
// 创建规格
manager.createSpec(spec);

// 读取规格
const spec = manager.getSpec('feat-user-auth');

// 更新规格
manager.updateSpec('feat-user-auth', {
  status: 'approved',
  priority: 1
});

// 删除规格（级联删除 plan 和 tasks）
manager.deleteSpec('feat-user-auth');

// 列出所有规格
const specs = manager.listSpecs();

// 检查是否存在
const exists = manager.specExists('feat-user-auth');
```

#### Technical Plan CRUD

```typescript
// 创建技术方案
manager.createPlan(plan);

// 读取技术方案（按 plan ID）
const plan = manager.getPlanById('plan-feat-user-auth-v1');

// 列出某个 spec 的所有方案
const plans = manager.listPlansBySpec('feat-user-auth');

// 获取 active 方案
const activePlan = manager.getActivePlan('feat-user-auth');

// 激活方案（自动将其他方案设为 inactive）
manager.setActivePlan('plan-feat-user-auth-v2');

// 获取下一个版本号
const nextVersion = manager.getNextPlanVersion('feat-user-auth');
// → "v3" (如果已有 v1, v2)

// 更新技术方案
manager.updatePlan('plan-feat-user-auth-v1', {
  estimatedDuration: '7 days'
});

// 删除技术方案（级联删除关联的 task lists）
manager.deletePlan('plan-feat-user-auth-v1');
```

#### Tasks 管理

```typescript
// 列出某个 plan 的所有任务列表
const taskLists = manager.listTasksByPlan('plan-feat-user-auth-v1');

// 读取任务列表（按 tasks ID）
const taskList = manager.getTaskListById('plan-feat-user-auth-v1-default');

// 删除任务列表
manager.deleteTaskList('plan-feat-user-auth-v1-default');

// 更新任务状态
manager.updateTaskStatus(
  'plan-feat-user-auth-v1-default',  // tasksId
  'task-001',                        // taskId
  'completed',                       // status
  'Implemented User model'           // notes (optional)
);

// 检查依赖
const depCheck = manager.checkDependencies(
  'plan-feat-user-auth-v1-default',
  'task-002'
);
// → { canExecute: true/false, blockingTasks: string[] }

// 获取执行顺序（拓扑排序）
const order = manager.getExecutionOrder('plan-feat-user-auth-v1-default');
// → ['task-001', 'task-002', 'task-003', ...]

// 获取下一个可执行任务
const nextTaskId = manager.getNextExecutableTask('plan-feat-user-auth-v1-default');

// 开始执行
manager.startExecution('plan-feat-user-auth-v1-default');

// 暂停执行
manager.pauseExecution('plan-feat-user-auth-v1-default');

// 恢复执行
const taskList = manager.resumeExecution('plan-feat-user-auth-v1-default');
```

#### 搜索和过滤

```typescript
// 搜索规格
const results = manager.searchSpecs('auth');

// 按类别过滤
const features = manager.getSpecsByCategory('feature');

// 按状态过滤
const approved = manager.getSpecsByStatus('approved');

// 获取依赖
const deps = manager.getSpecDependencies('feat-user-auth');
```

### SpecValidator API

```typescript
import { SpecValidator } from '@google/gemini-cli-core';

const validator = new SpecValidator();

// 验证 constitution
const result = validator.validateConstitution(constitution);
if (!result.valid) {
  console.error('Errors:', result.errors);
  console.warn('Warnings:', result.warnings);
}

// 验证 specification
const specResult = validator.validateSpecification(spec, allSpecs);

// 验证 technical plan
const planResult = validator.validateTechnicalPlan(plan, spec);

// 验证 tasks
const tasksResult = validator.validateTasks(tasks);

// 检测循环依赖
const cycles = validator.checkDependencyCycles(spec, allSpecs);
if (cycles.length > 0) {
  console.error(`Circular dependency: ${cycles.join(' -> ')}`);
}
```

---

## 最佳实践

### 1. Constitution 最佳实践

#### ✅ 应该做的

- 创建一次，很少更新
- 使原则具体且可操作
- 包含可衡量的质量标准
- 保持简洁（3-7 条原则）

#### ❌ 不应该做的

- 包含项目特定的功能
- 写得太笼统（如"编写好的代码"）
- 频繁修改
- 包含太多原则

#### 示例对比

| 好的原则 | 不好的原则 |
|---------|-----------|
| "所有 API 端点必须有速率限制" | "编写好的代码" |
| "测试覆盖率 >= 80%" | "注重质量" |
| "数据库查询响应时间 < 100ms" | "系统要快" |

---

### 2. Specification 最佳实践

#### ✅ 应该做的

- 专注于业务价值和用户需求
- 编写清晰、可测试的验收标准
- 包含业务约束（预算、时间表、合规性）
- 使用"作为...我想...以便..."格式编写用户故事

#### ❌ 不应该做的

- 包含技术实现细节
- 提及特定的技术或框架
- 描述"如何"实现（那是 technical plan 的工作）
- 使验收标准模糊不清

#### 用户故事模板

```
作为 <角色>，
我想 <功能>，
以便 <业务价值>。
```

**示例**:
```
作为客户，
我想在订单发货时收到邮件通知，
以便我知道何时能收到货物。
```

---

### 3. Technical Plan 最佳实践

#### ✅ 应该做的

- 提供具体的架构决策和理由
- 识别所有技术风险并提供缓解策略
- 包含详细的测试策略
- 列出所有需要修改/创建的文件
- 考虑性能和安全影响

#### ❌ 不应该做的

- 过于笼统或高层次
- 忽略技术风险
- 缺少测试策略
- 低估工作量

#### 风险评估示例

| 风险 | 严重性 | 缓解策略 |
|------|--------|---------|
| Token 过期处理 | medium | 实现 refresh token 机制 |
| 密码存储安全 | critical | 使用 bcrypt，salt rounds >= 10 |
| API 响应慢 | high | 添加缓存层，数据库索引优化 |

---

### 4. Tasks 最佳实践

#### ✅ 应该做的

- 将大任务分解为小的、可管理的任务
- 明确标识任务依赖
- 每个任务关联具体文件
- 提供现实的时间估算
- 按类型组织任务

#### ❌ 不应该做的

- 创建过大的任务（> 1 天）
- 忽略依赖关系
- 遗漏测试和文档任务
- 低估复杂度

#### 任务分解示例

**不好的（太大）**:
```
- 实现用户认证系统（5 天）
```

**好的（适当粒度）**:
```
- 实现 AuthService（4 小时）
- 实现 UserRepository（3 小时）
- 添加密码哈希功能（2 小时）
- 实现 JWT 生成和验证（3 小时）
- 编写单元测试（4 小时）
- 编写集成测试（3 小时）
- 更新 API 文档（1 小时）
```

---

## 常见问题

### Q1: Constitution 和 Specification 有什么区别？

**A**:
- **Constitution**: 项目级别的原则和标准，适用于所有功能
- **Specification**: 功能级别的需求，描述单个功能或变更

类比：
- Constitution = 国家宪法（长期有效的根本原则）
- Specification = 具体法律（针对特定情况的规定）

---

### Q2: 我应该在 Specification 中包含技术细节吗？

**A**: 不应该。Specification 应该专注于业务需求。

**Specification 应该回答的问题**:
- 为什么要构建这个？（业务目标）
- 用户想要什么？（用户故事）
- 如何知道完成了？（验收标准）

**Technical Plan 应该回答的问题**:
- 如何实现？（架构方法）
- 使用什么技术？（技术栈）
- 有什么技术风险？（风险评估）

---

### Q3: 如何处理变更请求？

**A**: 更新对应的 Specification。

```bash
# 1. 使用 API 更新规格
manager.updateSpec('feat-user-auth', {
  userStories: [...existingStories, newStory],
  acceptanceCriteria: [...existingCriteria, newCriterion]
});

# 2. 重新验证
const result = validator.validateSpecification(updatedSpec, allSpecs);

# 3. 如果需要，重新生成技术方案
/spec plan new feat-user-auth

# 4. 重新生成任务
/spec tasks new plan-feat-user-auth-v2
```

---

### Q4: 可以跳过某些步骤吗？

**A**: 不建议，但可以根据项目复杂度调整。

**小功能（1-2 天）**:
- Constitution（如果已有，跳过）
- Specification（简化版也可）
- Technical Plan（可选，直接写代码）
- Tasks（可选）

**中大型功能（3+ 天）**:
- Constitution（必需）
- Specification（必需）
- Technical Plan（必需）
- Tasks（强烈推荐）

---

### Q5: 如何与团队协作？

**A**: 使用版本控制系统（Git）管理 `.gemini/specs/` 目录。

```bash
# 将 specs 目录纳入版本控制
git add .gemini/specs/

# 提交规格
git commit -m "Add user authentication specification"

# 推送到远程
git push

# 团队成员拉取
git pull
```

**协作流程**:
1. 产品经理创建 Specification
2. 工程师创建 Technical Plan
3. 团队 review 并批准
4. 生成 Tasks 并分配给团队成员
5. 实施和跟踪进度

---

## 故障排查

### 问题 1: Constitution 未找到

**症状**: `/spec constitution` 显示 "未找到宪章"

**解决方案**:
```bash
/spec constitution --init
```

---

### 问题 2: 创建规格失败

**可能原因**:
1. Constitution 不存在
2. 规格 ID 已存在
3. 缺少必填字段

**解决方案**:
```bash
# 1. 检查 constitution
/spec constitution

# 2. 检查现有规格
/spec list

# 3. 使用不同的 ID
```

---

### 问题 3: 生成技术方案失败

**可能原因**:
1. 规格不存在
2. 规格 ID 错误

**解决方案**:
```bash
# 1. 确认规格存在
/spec list

# 2. 使用正确的 spec-id
/spec plan new <correct-spec-id>
```

---

### 问题 4: 生成任务失败

**可能原因**:
1. 技术方案不存在
2. 规格不存在

**解决方案**:
```bash
# 1. 确认技术方案存在
/spec plan list <spec-id>

# 2. 如果不存在，先生成技术方案
/spec plan new <spec-id>
# → 生成 plan-<spec-id>-v1

# 3. 再生成任务
/spec tasks new plan-<spec-id>-v1
# → 生成 plan-<spec-id>-v1-default
```

---

### 问题 5: 命令无法识别

**症状**: `/spec` 命令无法识别

**解决方案**:
```bash
# 重新构建项目
npm run build

# 重启 CLI
npm start
```

---

## 文件结构

```
.gemini/
└── specs/
    ├── constitution.json              # 项目宪章
    ├── features/                      # 业务规格
    │   ├── feat-user-auth.json
    │   ├── feat-payment.json
    │   └── bug-login-fix.json
    ├── plans/                         # 技术方案
    │   ├── plan-feat-user-auth.json
    │   └── plan-feat-payment.json
    └── tasks/                         # 任务列表
        ├── feat-user-auth-tasks.json
        └── feat-payment-tasks.json
```

---

## 更多资源

- [快速开始指南](./QUICK_START_CN.md) - 5 分钟快速上手
- [命令参考](./COMMANDS_CN.md) - 完整的命令列表
- [路线图](./ROADMAP.md) - 开发计划和进度
- [Phase 2 完成总结](./PHASE2_COMPLETION.md) - Phase 2 功能详情
- [Phase 3 完成总结](./PHASE3_COMPLETION.md) - Phase 3 功能详情

---

## 反馈和支持

**发现 bug？** 在 GitHub 上提交 issue
**有建议？** 发起讨论
**想要贡献？** 查看 ROADMAP.md 了解计划中的功能

---

**祝你使用 Spec-Driven Development 愉快！🚀**

*让软件开发更加结构化和可预测，一次一个规格。*

---

**文档版本**: 1.0.0
**最后更新**: 2025-10-18
**维护者**: fuxi-cli 开发团队
