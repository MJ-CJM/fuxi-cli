# mj-cjm 主要开发功能总结（交接文档）

**目标读者**: 接手二次开发的工程师
**核心主题**: 多模型支持架构 + CLI 增强
**时间跨度**: 2025-09-16 至 2025-09-28（7 个提交）
**代码规模**: ~5,650 行新增代码，涉及 49 个文件

---

## 🎯 核心功能概览

### 1. **多模型适配器架构**（最重要）

**位置**: `packages/core/src/adapters/`

**目标**: 让 gemini-cli 支持调用多种 AI 模型（Gemini/Qwen/Claude/OpenAI），而非仅限 Gemini。

**核心设计**:
```typescript
// 统一的适配器接口
interface ModelAdapter {
  name: string;
  generateContent(...): Promise<Response>;      // 普通调用
  generateContentStream(...): AsyncGenerator;   // 流式调用
  healthCheck(): Promise<boolean>;              // 健康检查
  getMetadata(): ModelMetadata;                 // 获取模型信息
}
```

**已实现的适配器**:
- ✅ **QwenAdapter** (`qwen-adapter.ts`) - 通义千问
  - 支持普通调用 + 流式调用
  - 配置项: `QWEN_CODER_API_KEY`, `QWEN_BASE_URL`
  - 格式转换: Gemini 格式 ↔ Qwen API 格式

- ⚠️ **ClaudeAdapter** (`claude-adapter.ts`) - Anthropic Claude
  - 基础框架已搭建
  - 流式调用待完善

- ⚠️ **OpenAIAdapter** (`openai-adapter.ts`) - OpenAI GPT
  - 基础框架已搭建
  - 需要实现完整的格式转换

**路由层**:
- **ModelRouterService** (`packages/core/src/routing/model-router-service.ts`)
  - 根据配置自动选择适配器
  - 支持重试和超时控制
  - **注意**: 代码已实现但未完全激活到主流程

**配置示例**:
```json
{
  "model": "qwen-coder-turbo",
  "providers": {
    "qwen": {
      "apiKey": "${QWEN_CODER_API_KEY}",
      "baseURL": "https://dashscope.aliyuncs.com/compatible-mode/v1"
    }
  }
}
```

---

### 2. **新增 /model 命令**

**位置**: `packages/cli/src/ui/commands/modelCommand.ts`

**功能**: CLI 中的模型管理命令
- 查看当前模型配置
- 列出可用模型
- 切换模型（动态切换）

**使用示例**:
```bash
npm start -- /model              # 查看当前模型
npm start -- /model list         # 列出可用模型
npm start -- /model use qwen-coder-turbo  # 切换模型
```

---

### 3. **认证流程改进**

**位置**: `packages/cli/src/gemini.tsx`（启动入口）

**变更**: 修改启动后的 API Key 认证逻辑
- 更优雅的错误提示
- 支持多 Provider 的 Key 管理（如 `GEMINI_API_KEY` + `QWEN_CODER_API_KEY`）

---

### 4. **write-file 工具兼容性修复**

**位置**: `packages/core/src/tools/write-file.ts:72`

**问题**: 原代码在启用 Model Router 时调用仅限 Gemini JSON 端点的逻辑，导致报错：
```
"This should not be called when model router is enabled"
```

**修复**:
```typescript
// 在读取到原文件后立即判断
if (config.getUseModelRouter()) {
  // 启用 Model Router 时，跳过 ensureCorrectEdit/ensureCorrectFileContent
  // 直接返回原始与提议内容
  return { originalContent, proposedContent };
}
```

**影响**: 消除了在自定义模型（或启用路由）时的兼容性报错。

---

### 5. **架构文档**

**位置**: 根目录 + `docs/`

**新增文件**:
- **CLAUDE.md** (150 行)
  - 为 Claude Code 工具提供项目级指引
  - 开发命令速查、架构概览、工具系统说明

- **architecture.md** (291 行)
  - 详细技术架构文档
  - CLI/Core 分层、数据流、扩展点

- **modify.md** (313 行)
  - 修改历史或变更说明

**建议**: 这些文档后续可整合到 `study/` 目录，避免根目录文件过多。

---

### 6. **品牌化定制**

**位置**: `packages/cli/src/ui/components/AsciiArt.ts`

**变更**: 更新 CLI 启动时的 ASCII 艺术标识
- 可能添加 "fuxi"（伏羲）相关标记或 logo
- 仅影响视觉展示，无功能影响

---

### 7. **Python 辅助脚本**

**位置**: `packages/core/src/adapters/requirements_analyzer.py`

**功能**: 分析依赖需求（可能用于 multi-agent 场景）
- ⚠️ **注意**: 引入 Python 跨语言依赖，可能需要文档说明运行环境

---

## 📊 开发统计

| 提交 | 日期 | 主题 | 核心变更 | 代码量 |
|------|------|------|----------|--------|
| 39943c62 | 09-16 | 文档 | CLAUDE.md, architecture.md, modify.md | 754 行 |
| c73d1d20 | 09-17 | 品牌化 | AsciiArt 更新 | 5 行 |
| **df05bc3b** | 09-24 | **多模型支持** | 适配器层、路由服务、配置管理 | **3,989 行** |
| 9fb6c4b0 | 09-24 | CLI 增强 | /model 命令 | 150 行 |
| 046399c1 | 09-26 | 认证改进 | 启动流程优化 | 10 行 |
| ea139dd2 | 09-26 | 兼容性 | write-file.ts ModelRouter 兼容 | 15 行 |
| b347fa25 | 09-28 | 综合更新 | 适配器完善 + Python 脚本 | 727 行 |

**最核心提交**: `df05bc3b`（09-24）- 3,989 行，建立了整个多模型架构。

---

## 🛠️ 如何按此基础继续开发

### 阶段 1: 理解现有架构（1-2 天）

1. **阅读文档**:
   ```bash
   cat CLAUDE.md                      # 项目概览
   cat architecture.md                # 详细架构
   cat study/04-model-and-providers.md  # 多模型设计
   ```

2. **代码走读**:
   ```bash
   # 1. 适配器接口
   cat packages/core/src/adapters/base-adapter.ts

   # 2. Qwen 适配器实现（最完整的参考）
   cat packages/core/src/adapters/qwen-adapter.ts

   # 3. 路由服务
   cat packages/core/src/routing/model-router-service.ts

   # 4. /model 命令
   cat packages/cli/src/ui/commands/modelCommand.ts
   ```

3. **运行测试**:
   ```bash
   npm install
   npm run build
   npm test -- packages/core/src/adapters/  # 适配器测试
   ```

---

### 阶段 2: 激活 Model Router（立即可做）

**当前状态**: ModelRouterService 已实现但未激活到主流程。

**任务**:
1. 修改 `packages/core/src/core/geminiChat.ts`
2. 在初始化时引入 ModelRouterService
3. 根据配置决定使用 Gemini 原生客户端还是 ModelRouter

**参考代码位置**:
- `packages/core/src/config/config.ts:1025-1098` (配置加载)
- `packages/core/src/core/gemini-client.ts` (原始客户端)

**验证方式**:
```bash
# 配置 Qwen
export QWEN_CODER_API_KEY="sk-xxx"
echo '{"model": "qwen-coder-turbo"}' > .gemini/settings.json

# 运行 CLI
npm start

# 应该看到使用 Qwen 模型的提示
```

---

### 阶段 3: 完善适配器（1 周）

#### 3.1 完善 ClaudeAdapter
**位置**: `packages/core/src/adapters/claude-adapter.ts`

**待办**:
- [ ] 实现完整的流式调用（`generateContentStream`）
- [ ] 格式转换: Gemini 格式 → Claude Messages API 格式
- [ ] 添加错误处理（API 限流、超时）
- [ ] 编写单元测试

**参考**:
- Claude API 文档: https://docs.anthropic.com/claude/reference
- 对照 `qwen-adapter.ts` 的实现模式

---

#### 3.2 实现 OpenAIAdapter
**位置**: `packages/core/src/adapters/openai-adapter.ts`

**待办**:
- [ ] 实现 `generateContent` (使用 `openai` SDK)
- [ ] 实现 `generateContentStream`
- [ ] 格式转换: Gemini 格式 → OpenAI Chat Completions 格式
- [ ] 支持 function calling 映射
- [ ] 编写单元测试

**格式转换关键**:
```typescript
// Gemini Part 格式
{ text: "..." }
{ functionCall: { name: "...", args: {...} } }

// 需转换为 OpenAI Message 格式
{ role: "user", content: "..." }
{ role: "assistant", content: null, function_call: {...} }
```

---

### 阶段 4: 增强配置管理（3-5 天）

**任务**: 让用户能更方便地配置多模型。

**具体工作**:
1. **配置 Schema 增强**:
   ```typescript
   // packages/core/src/config/config-schema.ts
   export interface ModelProviderConfig {
     apiKey: string;
     baseURL?: string;
     timeout?: number;
     retries?: number;
   }

   export interface Settings {
     model: string;  // "gemini-2.0-flash" | "qwen-coder-turbo" | "claude-3-opus"
     providers: {
       gemini?: ModelProviderConfig;
       qwen?: ModelProviderConfig;
       claude?: ModelProviderConfig;
       openai?: ModelProviderConfig;
     };
   }
   ```

2. **环境变量支持**:
   - 更新 `.env.example`
   - 添加 `CLAUDE_API_KEY`, `OPENAI_API_KEY`

3. **命令行参数**:
   ```bash
   npm start -- --model qwen-coder-turbo
   ```

---

### 阶段 5: 测试与文档（持续）

#### 5.1 集成测试
**位置**: `packages/core/src/adapters/*.test.ts`

**测试矩阵**:
| 适配器 | 普通调用 | 流式调用 | Function Calling | 错误处理 |
|--------|----------|----------|------------------|----------|
| Qwen   | ✅       | ✅       | ⚠️ 待测试        | ✅       |
| Claude | ❌       | ❌       | ❌               | ❌       |
| OpenAI | ❌       | ❌       | ❌               | ❌       |

**示例测试**:
```typescript
describe('QwenAdapter', () => {
  it('should generate content successfully', async () => {
    const adapter = new QwenAdapter(config);
    const result = await adapter.generateContent([
      { text: 'Hello' }
    ]);
    expect(result.text()).toBeDefined();
  });
});
```

---

#### 5.2 用户文档
**位置**: `study/04-model-and-providers.md`

**待补充**:
- [ ] 完整的配置示例（所有 Provider）
- [ ] 切换模型的完整流程
- [ ] 故障排查指南（API Key 错误、网络问题）
- [ ] 各模型的能力对比表

---

## ⚠️ 注意事项

### 1. 临时提交需清理
- **39943c62** 和 **b347fa25** 标记为 "tmp"
- **建议**: 在合并前拆分成语义清晰的小提交
  ```bash
  git rebase -i origin/main
  # 将 "tmp" 提交拆分为:
  # - feat: add multi-model adapter architecture
  # - docs: add CLAUDE.md and architecture.md
  # - feat: add qwen adapter implementation
  ```

### 2. Python 依赖说明
- `requirements_analyzer.py` 需要 Python 环境
- **建议**: 在 README 或 `study/06-dev-setup.md` 中说明
  ```markdown
  ## 可选依赖
  - Python 3.8+ (用于 multi-agent 需求分析)
  ```

### 3. ModelRouter 激活风险
- 当前主流程仍使用原生 Gemini 客户端
- **激活前必须测试**:
  - [ ] 基础对话
  - [ ] 工具调用（13 个内置工具）
  - [ ] 流式输出
  - [ ] 错误处理

### 4. 配置向后兼容
- 新配置格式需兼容旧版本
- **示例**:
  ```typescript
  // 旧配置（仍需支持）
  { "apiKey": "AIza..." }

  // 新配置
  { "model": "gemini-2.0-flash", "providers": { "gemini": { "apiKey": "AIza..." } } }
  ```

---

## 🚀 快速上手命令

```bash
# 1. 安装依赖
npm install

# 2. 构建项目
npm run build

# 3. 配置 Qwen（示例）
export QWEN_CODER_API_KEY="sk-xxx"
echo '{"model": "qwen-coder-turbo", "providers": {"qwen": {"baseURL": "https://dashscope.aliyuncs.com/compatible-mode/v1"}}}' > .gemini/settings.json

# 4. 运行 CLI
npm start

# 5. 测试 /model 命令
npm start -- /model

# 6. 运行适配器测试
npm test -- packages/core/src/adapters/qwen-adapter.test.ts
```

---

## 📚 核心文件清单（优先阅读）

```
packages/core/src/adapters/
├── base-adapter.ts           # 适配器接口定义（必读）
├── qwen-adapter.ts           # Qwen 实现（参考模板）
├── claude-adapter.ts         # Claude 实现（待完善）
└── openai-adapter.ts         # OpenAI 实现（待完善）

packages/core/src/routing/
└── model-router-service.ts   # 路由服务（需激活）

packages/core/src/config/
├── config.ts                 # 配置管理
└── config-schema.ts          # 配置 Schema

packages/cli/src/ui/commands/
└── modelCommand.ts           # /model 命令实现

packages/core/src/tools/
└── write-file.ts:72          # ModelRouter 兼容性修复点

根目录:
├── CLAUDE.md                 # 项目概览（必读）
└── architecture.md           # 架构详解（必读）
```

---

## 📞 获取帮助

- **Git 历史**: 查看 `study/base_commit.md` 获取详细提交分析
- **架构文档**: 查看 `study/` 目录下 00-08 系列文档
- **问题排查**: 运行 `npm start -- /diagnose` 检测环境

---

**祝开发顺利！** 🎉
