# Spec-Driven Development - 示例文件

本目录包含示例文件，展示规格驱动开发系统中 Constitution 和 Specification 文件的结构和内容。

## 文件列表

### Constitution 示例

**文件**: `constitution.json`

fuxi-cli 项目的完整宪章示例，包括：
- 工程原则
- 技术约束
- 质量标准（测试、安全、性能）
- 架构指南
- 编码标准

**使用方法**:
```bash
# 复制到您的项目快速开始
cp design/spec-driven/examples/constitution.json .gemini/specs/constitution.json

# 使用 CLI 查看
/spec constitution
```

---

### Specification 示例

#### 1. 功能规格 - 用户认证

**文件**: `feat-user-auth.json`

演示用户认证系统的完整功能规格。

**关键要素**:
- 以用户价值为中心的业务目标
- 5 个详细的用户故事
- 9 个验收标准
- 法规约束（GDPR、OWASP）
- 优先级 1，业务价值 9/10
- 状态：草稿

**使用方法**:
```bash
# 复制到您的项目
cp design/spec-driven/examples/feat-user-auth.json .gemini/specs/features/

# 使用 CLI 查看
/spec show feat-user-auth
```

---

#### 2. 功能规格 - 支付处理

**文件**: `feat-payment-processing.json`

展示一个高价值功能规格，包含依赖关系和合规要求。

**关键要素**:
- 以收入为中心的业务目标
- 支付方式灵活性
- PCI DSS 合规约束
- 依赖用户认证功能
- 优先级 2，业务价值 10/10
- 状态：审查中
- 包含风险评估

**使用方法**:
```bash
# 复制到您的项目
cp design/spec-driven/examples/feat-payment-processing.json .gemini/specs/features/

# 使用 CLI 查看
/spec show feat-payment-processing
```

---

#### 3. Bug 修复规格 - 登录超时

**文件**: `bug-login-timeout.json`

说明如何将 Bug 修复文档化为规格。

**关键要素**:
- 以问题为中心的业务目标
- 可衡量的成功标准（98% 成功率）
- 紧迫的时间约束（周五前部署）
- 根本原因分析
- 优先级 1，业务价值 7/10
- 状态：进行中

**使用方法**:
```bash
# 复制到您的项目
cp design/spec-driven/examples/bug-login-timeout.json .gemini/specs/features/

# 使用 CLI 查看
/spec show bug-login-timeout
```

---

## 使用这些示例

### 快速设置

将所有示例复制到您的项目：

```bash
# 创建 specs 目录
mkdir -p .gemini/specs/features

# 复制宪章
cp design/spec-driven/examples/constitution.json .gemini/specs/

# 复制所有规格
cp design/spec-driven/examples/feat-*.json .gemini/specs/features/
cp design/spec-driven/examples/bug-*.json .gemini/specs/features/

# 验证
/spec constitution
/spec list
```

### 从示例中学习

1. **Constitution 结构**:
   - 研究原则如何具体且可执行
   - 注意约束如何可衡量
   - 观察全面的质量标准

2. **Specification 模式**:
   - **功能规格**专注于用户价值和业务结果
   - **Bug 修复规格**包含根本原因和可衡量的成功标准
   - 所有规格都避免技术实现细节
   - 验收标准可测试且具体

3. **最佳实践演示**:
   - 清晰的业务目标，解释"为什么"
   - 用户故事采用"作为...我想要...以便..."格式
   - 具体、可衡量的验收标准
   - 现实的约束和依赖关系
   - 利益相关者识别
   - 风险评估

---

## 调整示例

### 适配到您的项目

1. **修改 Constitution**:
   ```bash
   # 复制并编辑
   cp design/spec-driven/examples/constitution.json .gemini/specs/
   # 然后编辑 .gemini/specs/constitution.json 以匹配您的项目
   ```

2. **创建类似的 Specs**:
   - 使用这些作为模板
   - 保持相同的结构
   - 将内容调整到您的领域
   - 保持业务焦点（无技术细节）

### 测试系统

1. **查看示例**:
   ```bash
   /spec list
   /spec show feat-user-auth
   /spec show feat-payment-processing
   /spec show bug-login-timeout
   ```

2. **创建您自己的**:
   ```bash
   /spec new
   # AI 会引导您创建规格
   ```

3. **生成技术方案**:
   ```bash
   /spec plan new feat-user-auth
   # AI 会生成技术设计
   ```

4. **生成任务列表**:
   ```bash
   /spec tasks new plan-feat-user-auth-v1
   # AI 会拆分为可执行任务
   ```

---

## 文件格式参考

### Constitution 结构

```json
{
  "version": "string (语义化版本)",
  "principles": ["string array"],
  "constraints": ["string array"],
  "qualityStandards": {
    "testing": "string",
    "security": "string",
    "performance": "string",
    "accessibility": "string (可选)"
  },
  "architectureGuidelines": ["string array"],
  "codingStandards": ["string array (可选)"],
  "createdAt": "ISO date string",
  "updatedAt": "ISO date string"
}
```

### Specification 结构

```json
{
  "id": "string (kebab-case)",
  "title": "string",
  "category": "feature | bug-fix | refactor | enhancement | documentation",
  "status": "draft | review | approved | in-progress | completed | cancelled",
  "businessGoal": "string (业务目标)",
  "userStories": ["string array"],
  "acceptanceCriteria": ["string array"],
  "constraints": ["string array"],
  "dependencies": ["spec-id array"],
  "stakeholders": ["string array (可选)"],
  "priority": 1-5,
  "businessValue": 1-10,
  "targetRelease": "string (可选)",
  "createdAt": "ISO date string",
  "updatedAt": "ISO date string",
  "createdBy": "string (可选)"
}
```

---

## 下一步

查看这些示例后：

1. ✅ 理解结构和内容要求
2. ✅ 复制并调整 constitution 以匹配您的项目
3. ✅ 使用 `/spec new` 创建您的第一个规格
4. ✅ 阅读快速开始指南：[QUICK_START_CN.md](../QUICK_START_CN.md)
5. ✅ 阅读完整用户指南：[USER_GUIDE_CN.md](../USER_GUIDE_CN.md)
6. ✅ 查看命令参考：[COMMANDS_CN.md](../COMMANDS_CN.md)

---

**有问题？**

参考完整文档：
- [QUICK_START_CN.md](../QUICK_START_CN.md) - 快速入门指南
- [USER_GUIDE_CN.md](../USER_GUIDE_CN.md) - 完整用户指南
- [COMMANDS_CN.md](../COMMANDS_CN.md) - 命令参考
- [README.md](../README.md) - 系统概览

---

**文档版本**: 1.0.0  
**创建日期**: 2025-01-19  
**维护者**: fuxi-cli 开发团队
