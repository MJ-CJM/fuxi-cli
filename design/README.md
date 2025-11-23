# Fuxi CLI - 设计文档

> **设计文档和技术规范**

---

## 📋 概述

本目录包含 Fuxi CLI 所有核心功能的设计文档、实现细节和技术规范。文档按功能模块组织，从大功能到子功能分层管理。

---

## 📁 目录结构

### 🏗️ 整体架构
- **[architecture.md](./architecture.md)** - 系统架构概览

### 1️⃣ 模型支持系统
- **[models/](./models/)** - 通用模型支持
  - [README.md](./models/README.md) - 模型系统概述
  - [universal-model-support.md](./models/universal-model-support.md) - 架构设计和实现
  - [add-new-model-guide.md](./models/add-new-model-guide.md) - 用户配置指南

### 2️⃣ Agents 智能体系统
- **[agents/](./agents/)** - Agents 功能完整文档
  - [README.md](./agents/README.md) - Agents 系统概述
  - [DESIGN.md](./agents/DESIGN.md) - 核心架构设计
  - [IMPLEMENTATION.md](./agents/IMPLEMENTATION.md) - 实现细节和状态
  - [COMMANDS.md](./agents/COMMANDS.md) - CLI 命令参考
  - [QUICK_START.md](./agents/QUICK_START.md) - 快速开始

  #### Agents 子功能

  - **[routing/](./agents/routing/)** - 智能路由
    - [README.md](./agents/routing/README.md) - 路由功能概述和实现

  - **[handoff/](./agents/handoff/)** - Agent 移交
    - [README.md](./agents/handoff/README.md) - 移交功能概述和设计

  - **[context/](./agents/context/)** - 上下文管理
    - [README.md](./agents/context/README.md) - 上下文系统设计（含 isolated/shared 模式）

  - **[creation/](./agents/creation/)** - Agent 创建
    - [interactive-creation.md](./agents/creation/interactive-creation.md) - 交互式创建设计

  - **[completion-summaries/](./agents/completion-summaries/)** - 功能完成总结
    - [p2-completion.md](./agents/completion-summaries/p2-completion.md) - P2 阶段完成总结
    - [p2-routing-handoff-design.md](./agents/completion-summaries/p2-routing-handoff-design.md) - 路由移交详细设计

### 3️⃣ Workflow 工作流系统
- **[workflows/](./workflows/)** - Workflow 工作流
  - [README.md](./workflows/README.md) - Workflow 系统概述
  - [design.md](./workflows/design.md) - Workflow 架构设计

### 4️⃣ Plan+Todo 模式
- **[plan-todo/](./plan-todo/)** - Plan+Todo 模式
  - [README.md](./plan-todo/README.md) - Plan+Todo 系统概述
  - [DESIGN_AND_IMPLEMENTATION.md](./plan-todo/DESIGN_AND_IMPLEMENTATION.md) - 设计与实现
  - [API.md](./plan-todo/API.md) - 命令和工具 API
  - [USER_GUIDE.md](./plan-todo/USER_GUIDE.md) - 用户指南

### 5️⃣ 模式切换系统（计划中）
- **[modes/](./modes/)** - 模式切换
  - _功能规划中，文档待创建_

---

## 🚀 快速导航

### 按角色导航

#### 👤 用户文档
- [Agents 快速开始](./agents/QUICK_START.md)
- [添加新模型指南](./models/add-new-model-guide.md)
- [Workflow 系统概述](./workflows/README.md)
- [Plan+Todo 用户指南](./plan-todo/USER_GUIDE.md)

#### 👨‍💻 开发者文档
- [系统架构](./architecture.md)
- [Agents 核心设计](./agents/DESIGN.md)
- [Agents 实现细节](./agents/IMPLEMENTATION.md)
- [模型支持设计](./models/universal-model-support.md)
- [Workflow 设计](./workflows/design.md)
- [Plan+Todo 设计与实现](./plan-todo/DESIGN_AND_IMPLEMENTATION.md)

#### 🔧 功能参考
- [Agents 命令参考](./agents/COMMANDS.md)
- [路由功能](./agents/routing/README.md)
- [移交功能](./agents/handoff/README.md)
- [上下文管理](./agents/context/README.md)
- [Plan+Todo API 参考](./plan-todo/API.md)

### 按功能导航

#### 🤖 模型支持
- **概述**: [models/README.md](./models/README.md)
- **设计**: [models/universal-model-support.md](./models/universal-model-support.md)
- **配置**: [models/add-new-model-guide.md](./models/add-new-model-guide.md)
- **状态**: ✅ 已完成

#### 🎭 Agents 系统
- **概述**: [agents/README.md](./agents/README.md)
- **核心设计**: [agents/DESIGN.md](./agents/DESIGN.md)
- **快速开始**: [agents/QUICK_START.md](./agents/QUICK_START.md)
- **状态**: ✅ P1 和 P2 已完成

**子功能**:
- **智能路由** [agents/routing/](./agents/routing/) - ✅ 已完成
- **Agent 移交** [agents/handoff/](./agents/handoff/) - ✅ 已完成
- **上下文管理** [agents/context/](./agents/context/) - ✅ 已完成
- **交互式创建** [agents/creation/](./agents/creation/) - ✅ 已完成

#### 🔄 Workflow 系统
- **概述**: [workflows/README.md](./workflows/README.md)
- **系统设计**: [workflows/design.md](./workflows/design.md)
- **用户指南**: [workflows/user-guide.md](./workflows/user-guide.md)
- **状态**: ✅ 已完成（含并行执行）

#### 📋 Plan+Todo 模式
- **概述**: [plan-todo/README.md](./plan-todo/README.md)
- **设计与实现**: [plan-todo/DESIGN_AND_IMPLEMENTATION.md](./plan-todo/DESIGN_AND_IMPLEMENTATION.md)
- **API 参考**: [plan-todo/API.md](./plan-todo/API.md)
- **用户指南**: [plan-todo/USER_GUIDE.md](./plan-todo/USER_GUIDE.md)
- **状态**: ✅ 已完成（含批量执行）

#### 🎯 模式切换（计划中）
- **概述**: 📋 规划中
- **状态**: 📋 设计阶段

---

## 📊 功能完成度

| 功能模块 | 完成度 | 状态 | 文档完整度 |
|---------|-------|------|-----------|
| **模型支持** | 100% | ✅ 已完成 | 100% |
| **Agents 核心** | 100% | ✅ 已完成 | 100% |
| **智能路由** | 100% | ✅ 已完成 | 100% |
| **Agent 移交** | 100% | ✅ 已完成 | 100% |
| **上下文管理** | 100% | ✅ 已完成 | 100% |
| **交互式创建** | 100% | ✅ 已完成 | 100% |
| **Workflow 顺序** | 100% | ✅ 已完成 | 100% |
| **Workflow 并行** | 100% | ✅ 已完成 | 100% |
| **Plan+Todo 模式** | 100% | ✅ 已完成 | 100% |
| **批量执行** | 100% | ✅ 已完成 | 100% |
| **模式切换** | 0% | 📋 计划中 | 0% |

---

## 🎯 设计原则

### 1. 配置驱动
所有功能都支持通过配置文件而非硬编码实现，提高灵活性。

### 2. 模块化设计
功能之间低耦合，易于扩展和维护。

### 3. 类型安全
完整的 TypeScript 类型定义，编译时捕获错误。

### 4. 向后兼容
新功能不影响现有功能，保持 API 稳定。

### 5. 用户友好
优先考虑用户体验，提供清晰的文档和错误提示。

---

## 🔗 相关资源

### 📚 用户文档
- [Agents 用户指南](./agents/USER_GUIDE.md)
- [Workflow 用户指南](./workflows/USER_GUIDE.md)
- [Plan+Todo 完整用户手册](./plan-todo/COMPLETE_USER_MANUAL.md)
- [Plan+Todo 快速指南](./plan-todo/USER_GUIDE.md)
- [添加新模型指南](./models/add-new-model-guide.md)

### 💻 代码实现
- Agents: `packages/core/src/agents/`
- Models: `packages/core/src/adapters/`
- CLI: `packages/cli/src/`

### 🧪 测试
- 单元测试: `packages/*/src/**/*.test.ts`
- 集成测试: `packages/core/src/agents/integration.test.ts`

### 📖 学习资料
- [开发环境搭建](../study/06-dev-setup.md)
- [架构概览](../study/01-architecture.md)

---

## 📝 文档维护

### 更新记录

- **2025-10-16**: Plan+Todo 模式完成，文档整理
- **2025-10-14**: 重组文档结构，按功能分层管理
- **2025-10-13**: Workflow 并行功能完成，文档更新
- **2025-10-07**: Agents P2 功能完成
- **2025-10-06**: Agents P1 功能完成

### 文档规范

1. **命名规范**: 使用小写字母和连字符（kebab-case）
2. **元数据**: 每个文档包含状态、版本和更新日期
3. **层级结构**: 大功能 → 子功能 → 具体实现
4. **交叉引用**: 使用相对链接连接相关文档
5. **示例优先**: 提供完整可运行的示例

### 贡献文档

欢迎贡献！请确保：
- 遵循现有文档格式
- 包含代码示例
- 更新相关索引
- 提供中英文版本（可选）

---

## 💬 反馈与支持

- 🐛 [提交 Bug](https://github.com/MJ-CJM/fuxi-cli/issues)
- 💡 [功能建议](https://github.com/MJ-CJM/fuxi-cli/issues)
- 📖 [文档改进](https://github.com/MJ-CJM/fuxi-cli/issues)

---

**最后更新**: 2025-10-14
**维护者**: Fuxi CLI Team
