# Fuxi CLI 功能验证清单

本文档用于系统验证 README.md 中提到的所有新增功能。请按照顺序逐一验证，并在完成后标记 ✅。

---

## 📋 验证前准备

- [ ] 确认已安装 Node.js 20.0.0+
- [ ] 确认已构建项目：`npm run build` 或 `npm run build:minimal`
- [ ] 确认配置文件存在：`~/.gemini/config.json` 和 `~/.gemini/settings.json`
- [ ] 确认至少配置了一个自定义模型（如通义千问或 DeepSeek）

---

## 1️⃣ 自定义模型支持

### 1.1 基础配置验证

- [ ] **验证配置文件格式**
  ```bash
  # 检查 config.json 格式
  cat ~/.gemini/config.json | jq .
  
  # 检查 settings.json 格式
  cat ~/.gemini/settings.json | jq .
  ```
  - [ ] `config.json` 中 `useModelRouter` 为 `true`
  - [ ] `settings.json` 中 `experimental.useModelRouter` 为 `true`
  - [ ] 至少配置了一个模型（如 `qwen3-coder-flash`）

- [ ] **验证模型列表命令**
  ```bash
  /model list
  ```
  - [ ] 能看到配置的所有模型
  - [ ] 显示模型名称、提供商、状态等信息

- [ ] **验证模型切换**
  ```bash
  /model use qwen3-coder-flash
  /model info
  ```
  - [ ] 切换成功
  - [ ] `/model info` 显示当前使用的模型

### 1.2 模型功能验证

- [ ] **验证模型调用**
  ```bash
  # 简单对话测试
  你好，请介绍一下你自己
  ```
  - [ ] AI 能正确响应
  - [ ] AI 能识别自己的身份（如"我是通义千问"）

- [ ] **验证工具调用（如果模型支持）**
  ```bash
  # 测试文件读取工具
  请读取当前目录下的 package.json 文件
  ```
  - [ ] 如果模型支持工具调用（如 Qwen），能成功调用工具
  - [ ] 如果模型不支持（如 DeepSeek），能给出合理提示

### 1.3 多模型配置验证

- [ ] **验证多个模型配置**
  - [ ] 配置了至少 2 个不同的模型（如 Qwen + DeepSeek）
  - [ ] 能在不同模型间切换
  - [ ] 每个模型都能正常工作

---

## 2️⃣ Agents 智能体系统

### 2.1 Agent 创建

- [ ] **交互式创建 Agent**
  ```bash
  /agents create -i
  ```
  - [ ] 能启动交互式向导
  - [ ] 能输入 Agent 名称、标题、描述等
  - [ ] 能选择模型、上下文模式、工具权限
  - [ ] 创建成功后显示文件位置

- [ ] **命令行创建 Agent**
  ```bash
  /agents create code-review --title "代码审查助手" --model qwen3-coder-flash
  ```
  - [ ] 创建成功
  - [ ] 文件保存在 `.gemini/agents/code-review.md`

- [ ] **AI 生成 Agent 内容**
  ```bash
  /agents create debug-analyzer --ai --purpose "系统性分析代码错误" --model deepseek-coder
  ```
  - [ ] AI 能生成 Agent 配置
  - [ ] 生成的配置合理可用

### 2.2 Agent 管理

- [ ] **列出所有 Agents**
  ```bash
  /agents list
  ```
  - [ ] 显示所有已创建的 Agents
  - [ ] 显示 Agent 名称、标题、模型等信息

- [ ] **查看 Agent 详情**
  ```bash
  /agents info code-review
  ```
  - [ ] 显示完整的 Agent 配置信息
  - [ ] 显示工具权限、上下文模式等

- [ ] **验证 Agent 配置**
  ```bash
  /agents validate code-review
  ```
  - [ ] 能检测配置错误
  - [ ] 给出验证结果

### 2.3 Agent 使用

- [ ] **运行 Agent（命令方式）**
  ```bash
  /agents run code-review 帮我审查 src/main.ts
  ```
  - [ ] Agent 能正确响应
  - [ ] 使用指定的工具（如 read_file）
  - [ ] 行为符合 Agent 定义

- [ ] **运行 Agent（@ 语法）**
  ```bash
  @code-review 检查这个文件的代码质量
  ```
  - [ ] `@` 语法能触发 Agent
  - [ ] Agent 行为与命令方式一致

- [ ] **验证上下文隔离**
  ```bash
  # 创建 isolated 模式的 Agent
  /agents create test-agent --context-mode isolated
  
  # 在主会话中对话
  主会话的对话内容
  
  # 切换到 Agent
  @test-agent 你能看到主会话的内容吗？
  ```
  - [ ] `isolated` 模式的 Agent 看不到主会话历史
  - [ ] `shared` 模式的 Agent 能看到主会话历史

- [ ] **验证工具权限控制**
  ```bash
  # 创建一个只读 Agent（只允许 read_file，禁止 write_file）
  /agents create read-only --tools-allow read_file --tools-deny write_file
  
  @read-only 请创建一个新文件 test.txt
  ```
  - [ ] Agent 无法使用被禁止的工具
  - [ ] 给出合理的错误提示

### 2.4 Agent 清理

- [ ] **清除 Agent 对话历史**
  ```bash
  /agents clear code-review
  ```
  - [ ] 清除成功
  - [ ] Agent 下次运行时没有历史记录

- [ ] **删除 Agent**
  ```bash
  /agents delete test-agent
  ```
  - [ ] 删除成功
  - [ ] `/agents list` 中不再显示

---

## 3️⃣ 智能路由与移交

### 3.1 路由配置

- [ ] **查看路由配置**
  ```bash
  /agents config show
  ```
  - [ ] 显示路由配置状态
  - [ ] 显示路由策略（rule/llm/hybrid）

- [ ] **启用路由**
  ```bash
  /agents config enable
  /agents config set strategy hybrid
  ```
  - [ ] 启用成功
  - [ ] 策略设置成功

- [ ] **配置 Agent 触发器**
  ```yaml
  # 编辑 .gemini/agents/code-review.md
  triggers:
    keywords: [审查, review, 检查]
    priority: 80
  ```
  - [ ] 触发器配置正确
  - [ ] Agent 文件格式有效

### 3.2 路由测试

- [ ] **测试路由（不执行）**
  ```bash
  /agents route "帮我审查这段代码"
  ```
  - [ ] 显示路由结果
  - [ ] 显示选中的 Agent
  - [ ] 显示置信度
  - [ ] 显示匹配的关键词

- [ ] **路由并执行**
  ```bash
  /agents route "帮我审查这段代码" --execute
  ```
  - [ ] 自动选择正确的 Agent
  - [ ] 执行 Agent 任务
  - [ ] 结果符合预期

- [ ] **验证不同路由策略**
  ```bash
  # 测试 rule 策略
  /agents config set strategy rule
  /agents route "审查代码" --execute
  
  # 测试 llm 策略
  /agents config set strategy llm
  /agents route "帮我看看这个文件有没有问题" --execute
  
  # 测试 hybrid 策略
  /agents config set strategy hybrid
  /agents route "检查代码质量" --execute
  ```
  - [ ] 不同策略都能正常工作
  - [ ] `hybrid` 策略性能最好

### 3.3 Agent 移交

- [ ] **配置移交关系**
  ```yaml
  # 编辑 .gemini/agents/code-review.md
  handoffs:
    - to: code-imple
      when: manual
      description: "当需要实现代码时移交"
      include_context: true
  ```
  - [ ] 移交配置正确
  - [ ] 创建目标 Agent（code-imple）

- [ ] **测试手动移交**
  ```bash
  @code-review 帮我实现一个登录功能
  ```
  - [ ] Agent 检测到需要移交
  - [ ] 提示是否移交
  - [ ] 确认后成功移交
  - [ ] 目标 Agent 收到上下文

- [ ] **验证循环检测**
  ```bash
  # 配置循环移交（A -> B -> A）
  # 尝试触发循环移交
  ```
  - [ ] 系统检测到循环
  - [ ] 阻止循环移交
  - [ ] 给出错误提示

- [ ] **验证深度限制**
  ```bash
  # 配置深度超过 5 的移交链
  # 尝试触发
  ```
  - [ ] 超过深度限制时被阻止
  - [ ] 给出合理的错误提示

---

## 4️⃣ Workflow 工作流

### 4.1 工作流创建

- [ ] **创建顺序工作流**
  ```yaml
  # 创建 .gemini/workflows/test-sequential.yaml
  kind: workflow
  name: test-sequential
  steps:
    - id: step1
      agent: code-review
      input: "${workflow.input}"
    - id: step2
      agent: code-imple
      input: "基于 ${step1.output} 进行修复"
  ```
  - [ ] 工作流文件格式正确
  - [ ] 能通过验证

- [ ] **创建并行工作流**
  ```yaml
  # 创建 .gemini/workflows/test-parallel.yaml
  kind: workflow
  name: test-parallel
  steps:
    - type: parallel
      id: dual-review
      parallel:
        - id: reviewer-a
          agent: code-review
          input: "${workflow.input}"
        - id: reviewer-b
          agent: code-review-pro
          input: "${workflow.input}"
  ```
  - [ ] 并行工作流格式正确
  - [ ] 能通过验证

### 4.2 工作流管理

- [ ] **列出所有工作流**
  ```bash
  /workflow list
  ```
  - [ ] 显示所有工作流
  - [ ] 显示工作流名称、描述等信息

- [ ] **查看工作流详情**
  ```bash
  /workflow info test-sequential
  ```
  - [ ] 显示完整的工作流配置
  - [ ] 显示步骤、错误处理等信息

- [ ] **验证工作流**
  ```bash
  /workflow validate test-sequential
  ```
  - [ ] 能检测配置错误
  - [ ] 给出验证结果

### 4.3 工作流执行

- [ ] **执行顺序工作流**
  ```bash
  /workflow run test-sequential "审查 src/main.ts"
  ```
  - [ ] 按顺序执行所有步骤
  - [ ] 步骤间能传递数据
  - [ ] 模板变量正确解析

- [ ] **执行并行工作流**
  ```bash
  /workflow run test-parallel "审查 src/main.ts"
  ```
  - [ ] 多个 Agent 同时执行
  - [ ] 执行时间明显缩短
  - [ ] 能正确汇总结果

- [ ] **验证条件执行**
  ```yaml
  # 添加 when 条件
  - id: step2
    agent: code-imple
    when: "${step1.data.issues_found} > 0"
  ```
  - [ ] 条件满足时执行
  - [ ] 条件不满足时跳过

- [ ] **验证错误处理**
  ```yaml
  error_handling:
    on_error: continue
    max_retries: 2
  ```
  - [ ] 错误时继续执行后续步骤
  - [ ] 达到最大重试次数后停止

- [ ] **验证模板变量**
  ```bash
  # 测试各种变量引用
  ${workflow.input}
  ${stepId.output}
  ${stepId.data.key}
  ${parallelGroupId.substepId.output}
  ```
  - [ ] 所有变量都能正确解析
  - [ ] 嵌套引用正常工作

### 4.4 工作流清理

- [ ] **删除工作流**
  ```bash
  /workflow delete test-sequential
  ```
  - [ ] 删除成功
  - [ ] `/workflow list` 中不再显示

---

## 5️⃣ Plan+Todo 模式

### 5.1 Plan 模式

- [ ] **进入 Plan 模式**
  ```bash
  # 按 Ctrl+P
  [PLAN] >
  ```
  - [ ] 成功进入 Plan 模式
  - [ ] 提示符变为 `[PLAN] >`
  - [ ] 显示只读模式提示

- [ ] **创建计划**
  ```bash
  [PLAN] > 帮我规划实现用户登录功能
  ```
  - [ ] AI 生成结构化计划
  - [ ] 包含步骤、风险评估、测试策略
  - [ ] 步骤有依赖关系
  - [ ] 显示预计时间

- [ ] **查看计划**
  ```bash
  /plan show
  ```
  - [ ] 显示当前计划
  - [ ] 显示所有步骤和依赖

- [ ] **使用 /plan create 命令**
  ```bash
  /plan create 实现用户登录功能
  ```
  - [ ] 命令能创建计划
  - [ ] 自动进入 Plan 模式
  - [ ] 生成计划内容

- [ ] **退出 Plan 模式**
  ```bash
  # 再次按 Ctrl+P
  >
  ```
  - [ ] 成功退出 Plan 模式
  - [ ] 提示符恢复为 `>`

### 5.2 Todo 转换

- [ ] **将计划转换为 Todos**
  ```bash
  /plan to-todos
  ```
  - [ ] 成功创建 Todos
  - [ ] 显示创建的 Todo 数量
  - [ ] Todos 包含依赖关系

- [ ] **查看 Todo 列表**
  ```bash
  /todos list
  ```
  - [ ] 显示所有 Todos
  - [ ] 显示状态（pending/in_progress/completed）
  - [ ] 显示优先级和依赖关系

### 5.3 Todo 执行

- [ ] **执行单个 Todo（默认模式）**
  ```bash
  /todos execute step-1
  ```
  - [ ] 每个操作需要确认
  - [ ] 能查看修改内容
  - [ ] 能批准或拒绝

- [ ] **执行单个 Todo（自动模式）**
  ```bash
  /todos execute step-1 --mode=auto_edit
  ```
  - [ ] 自动批准所有操作
  - [ ] 无需手动确认
  - [ ] 执行完成后更新状态

- [ ] **验证依赖检查**
  ```bash
  # 尝试执行有依赖的 Todo（依赖未完成）
  /todos execute step-2
  ```
  - [ ] 检测到未完成的依赖
  - [ ] 阻止执行
  - [ ] 提示先完成依赖

- [ ] **批量执行所有 Todos**
  ```bash
  /todos execute-all --mode=auto_edit
  ```
  - [ ] 按依赖顺序执行
  - [ ] 显示执行进度
  - [ ] 所有 Todos 执行完成
  - [ ] 显示执行统计

- [ ] **更新 Todo 状态**
  ```bash
  /todos update step-1 completed
  ```
  - [ ] 状态更新成功
  - [ ] `/todos list` 中显示新状态

### 5.4 Plan+Todo 清理

- [ ] **清除计划**
  ```bash
  /plan clear
  ```
  - [ ] 清除成功
  - [ ] `/plan show` 显示无计划

- [ ] **清除所有 Todos**
  ```bash
  /todos clear
  ```
  - [ ] 清除成功
  - [ ] `/todos list` 显示无 Todos

- [ ] **导出 Todos**
  ```bash
  /todos export
  ```
  - [ ] 导出为 JSON 格式
  - [ ] 包含所有 Todo 信息

---

## 6️⃣ Spec 规格驱动开发

### 6.1 Constitution 宪章

- [ ] **初始化宪章**
  ```bash
  /spec constitution --init
  ```
  - [ ] 创建宪章文件
  - [ ] 文件位置：`.gemini/specs/constitution.json`
  - [ ] 包含工程原则、约束、质量标准

- [ ] **查看宪章**
  ```bash
  /spec constitution
  ```
  - [ ] 显示宪章内容
  - [ ] 显示版本号
  - [ ] 显示所有原则和约束

### 6.2 Specification 规格

- [ ] **创建规格（交互式）**
  ```bash
  /spec new
  ```
  - [ ] 启动交互式向导
  - [ ] AI 引导创建规格
  - [ ] 生成规格文件（如 `feat-user-auth`）

- [ ] **列出所有规格**
  ```bash
  /spec list
  ```
  - [ ] 显示所有规格
  - [ ] 显示 ID、标题、类别、状态

- [ ] **查看规格详情**
  ```bash
  /spec show feat-user-auth
  ```
  - [ ] 显示完整规格内容
  - [ ] 显示业务目标、用户故事、验收标准

- [ ] **搜索规格**
  ```bash
  /spec search 登录
  ```
  - [ ] 能搜索到相关规格
  - [ ] 显示匹配结果

- [ ] **过滤规格**
  ```bash
  /spec filter category:feature
  ```
  - [ ] 按类别过滤
  - [ ] 显示过滤结果

- [ ] **删除规格**
  ```bash
  /spec delete feat-user-auth
  ```
  - [ ] 删除成功
  - [ ] `/spec list` 中不再显示

### 6.3 Technical Plan 技术方案

- [ ] **生成技术方案**
  ```bash
  /spec plan new feat-user-auth
  ```
  - [ ] AI 生成技术方案
  - [ ] 方案 ID 格式：`plan-feat-user-auth-v1`
  - [ ] 包含架构、实现、测试策略

- [ ] **列出所有方案**
  ```bash
  /spec plan list feat-user-auth
  ```
  - [ ] 显示该规格的所有方案
  - [ ] 显示版本号、状态

- [ ] **查看方案详情**
  ```bash
  /spec plan show plan-feat-user-auth-v1
  ```
  - [ ] 显示完整方案内容
  - [ ] 显示架构、实现细节、风险

- [ ] **激活方案**
  ```bash
  /spec plan activate plan-feat-user-auth-v1
  ```
  - [ ] 激活成功
  - [ ] 其他方案自动设为非激活

### 6.4 Task List 任务列表

- [ ] **生成任务列表**
  ```bash
  /spec tasks new plan-feat-user-auth-v1
  ```
  - [ ] AI 生成任务列表
  - [ ] 任务列表 ID：`plan-feat-user-auth-v1-default`
  - [ ] 包含多个可执行任务

- [ ] **查看任务详情**
  ```bash
  /spec tasks show plan-feat-user-auth-v1-default
  ```
  - [ ] 显示所有任务
  - [ ] 显示任务类型、优先级、依赖
  - [ ] 显示文件列表

### 6.5 Execution 执行

- [ ] **批量执行任务**
  ```bash
  /spec execute start plan-feat-user-auth-v1-default
  ```
  - [ ] 开始批量执行
  - [ ] 按依赖顺序执行
  - [ ] 显示执行进度
  - [ ] 任务完成后更新状态

- [ ] **查看执行状态**
  ```bash
  /spec execute status plan-feat-user-auth-v1-default
  ```
  - [ ] 显示执行状态
  - [ ] 显示进度统计
  - [ ] 显示已完成/进行中/待执行的任务

- [ ] **执行单个任务**
  ```bash
  /spec execute task plan-feat-user-auth-v1-default task-001
  ```
  - [ ] 执行指定任务
  - [ ] 检查依赖是否完成
  - [ ] 更新任务状态

- [ ] **更新任务状态**
  ```bash
  /spec task update plan-feat-user-auth-v1-default task-001 completed
  ```
  - [ ] 状态更新成功
  - [ ] 执行状态中显示新状态

### 6.6 Constitution 传递验证

- [ ] **验证 Constitution 在 Spec 创建时传递**
  ```bash
  # 创建 Constitution
  /spec constitution --init
  
  # 创建 Spec
  /spec new
  ```
  - [ ] Spec 创建时能参考 Constitution
  - [ ] AI 响应符合 Constitution 原则

- [ ] **验证 Constitution 在 Plan 创建时传递**
  ```bash
  /spec plan new feat-user-auth
  ```
  - [ ] Plan 创建时能参考 Constitution
  - [ ] 技术方案符合 Constitution 约束

- [ ] **验证 Constitution 在 Task 生成时传递**
  ```bash
  /spec tasks new plan-feat-user-auth-v1
  ```
  - [ ] Task 生成时能参考 Constitution
  - [ ] 任务符合 Constitution 质量标准

- [ ] **验证 Constitution 在执行时传递**
  ```bash
  /spec execute task plan-feat-user-auth-v1-default task-001
  ```
  - [ ] 执行时能参考 Constitution
  - [ ] 代码符合 Constitution 编码标准

---

## 7️⃣ 通用功能验证

### 7.1 命令帮助

- [ ] **查看帮助**
  ```bash
  /help
  ```
  - [ ] 显示所有可用命令
  - [ ] 显示命令说明

- [ ] **查看特定命令帮助**
  ```bash
  /agents --help
  /workflow --help
  /spec --help
  ```
  - [ ] 显示命令详细说明
  - [ ] 显示子命令和参数

### 7.2 配置验证

- [ ] **验证配置文件加载**
  - [ ] `config.json` 正确加载
  - [ ] `settings.json` 正确加载
  - [ ] Agent 配置正确加载
  - [ ] Workflow 配置正确加载

- [ ] **验证配置错误处理**
  ```bash
  # 故意破坏配置文件格式
  # 启动 CLI
  ```
  - [ ] 能检测配置错误
  - [ ] 给出清晰的错误提示
  - [ ] 不会崩溃

### 7.3 错误处理

- [ ] **验证网络错误处理**
  ```bash
  # 断开网络，尝试调用模型
  ```
  - [ ] 给出网络错误提示
  - [ ] 不会崩溃

- [ ] **验证文件错误处理**
  ```bash
  # 尝试读取不存在的文件
  /agents info non-existent-agent
  ```
  - [ ] 给出文件不存在提示
  - [ ] 不会崩溃

- [ ] **验证参数错误处理**
  ```bash
  # 使用错误的参数
  /agents create --invalid-flag
  ```
  - [ ] 给出参数错误提示
  - [ ] 显示正确的用法

---

## 8️⃣ 集成测试场景

### 8.1 完整开发流程

- [ ] **场景：使用 Spec-Driven 开发新功能**
  ```bash
  # 1. 创建 Constitution
  /spec constitution --init
  
  # 2. 创建 Spec
  /spec new
  # 输入：实现用户注册功能
  
  # 3. 生成 Plan
  /spec plan new feat-user-register
  
  # 4. 生成 Tasks
  /spec tasks new plan-feat-user-register-v1
  
  # 5. 执行所有任务
  /spec execute start plan-feat-user-register-v1-default
  ```
  - [ ] 整个流程顺畅
  - [ ] 每个步骤都能正确执行
  - [ ] 最终完成功能实现

### 8.2 Agent 协作场景

- [ ] **场景：代码审查 → 修复 → 测试**
  ```bash
  # 1. 创建审查 Agent
  /agents create code-review --title "代码审查"
  
  # 2. 创建实现 Agent
  /agents create code-imple --title "代码实现"
  
  # 3. 配置移交关系
  # 编辑 code-review.md，添加 handoffs
  
  # 4. 运行审查
  @code-review 审查 src/auth.ts
  
  # 5. 触发移交
  @code-review 修复发现的问题
  ```
  - [ ] 审查 Agent 正常工作
  - [ ] 检测到需要移交
  - [ ] 成功移交给实现 Agent
  - [ ] 实现 Agent 收到上下文

### 8.3 Workflow 复杂场景

- [ ] **场景：并行审查 + 汇总 + 修复**
  ```bash
  # 1. 创建并行工作流
  # 编辑 .gemini/workflows/parallel-review.yaml
  
  # 2. 运行工作流
  /workflow run parallel-review "src/auth.ts"
  ```
  - [ ] 两个审查 Agent 并行执行
  - [ ] 汇总 Agent 正确汇总结果
  - [ ] 修复 Agent 根据汇总结果修复
  - [ ] 整个流程自动化完成

### 8.4 Plan+Todo 场景

- [ ] **场景：规划 → 执行复杂重构**
  ```bash
  # 1. 进入 Plan 模式
  [Ctrl+P]
  
  # 2. 创建计划
  [PLAN] > 规划将项目从 JavaScript 迁移到 TypeScript
  
  # 3. 转换为 Todos
  /plan to-todos
  
  # 4. 批量执行
  /todos execute-all --mode=auto_edit
  ```
  - [ ] Plan 模式正常工作
  - [ ] 生成合理的重构计划
  - [ ] Todos 包含正确的依赖关系
  - [ ] 批量执行按顺序完成

---

## ✅ 验证完成检查

完成所有验证后，请确认：

- [ ] 所有核心功能都已验证
- [ ] 所有命令都能正常工作
- [ ] 错误处理合理
- [ ] 文档与实现一致
- [ ] 性能满足预期

---

## 📝 问题记录

在验证过程中发现的问题，请记录在此：

1. **问题描述**：
   - 复现步骤：
   - 预期行为：
   - 实际行为：
   - 截图/日志：

---

## 🎯 验证总结

验证完成后，请填写：

- **验证日期**：
- **验证人员**：
- **通过的功能**：
- **未通过的功能**：
- **总体评价**：

---

**提示**：验证时建议使用测试项目，避免影响实际开发工作。

