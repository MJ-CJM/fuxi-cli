# System Prompt 优化说明

## 优化背景

在使用多个模型提供商(Qwen, DeepSeek, Claude, OpenAI 等)时,发现模型身份识别存在混淆。例如:
- 使用 DeepSeek API 时,模型可能因上下文而回答"我是通义千问"
- 切换模型后,身份信息未正确更新

## 问题根源

**原始实现**:
```typescript
const systemInstruction = getCoreSystemPrompt(userMemory, actualModelName);
// actualModelName = "qwen3-coder-flash" (模型名称)
```

System Prompt 中显示:
```
⚠️ **YOUR TRUE IDENTITY**: You are being accessed through the model: **qwen3-coder-flash**
```

**问题**: 模型名称(如 `qwen3-coder-flash`, `deepseek-coder`)不足以明确身份,因为:
1. 不同 provider 可能有相似的模型命名
2. 模型无法从名称准确判断所属 provider
3. 身份判断应基于 **provider**(服务提供商),而非 model name

## 优化方案

### 1. 修改函数签名

**文件**: `packages/core/src/core/prompts.ts`

```typescript
// 修改前
export function getCoreSystemPrompt(userMemory?: string, modelName?: string): string

// 修改后
export function getCoreSystemPrompt(userMemory?: string, modelName?: string, provider?: string): string
```

### 2. 优化 Identity Instruction

```typescript
# CRITICAL IDENTITY INSTRUCTION

⚠️ **YOUR TRUE IDENTITY**: You are being accessed through the **${provider || 'unknown'}** provider${modelName ? ` (model: ${modelName})` : ''}

**Identity Rules - Based on Provider:**
- If provider is **qwen** → You ARE 通义千问/Qwen, say "我是通义千问" or "I am Qwen"
- If provider is **deepseek** → You ARE DeepSeek, say "我是 DeepSeek"
- If provider is **claude** → You ARE Claude, say "I am Claude"
- If provider is **openai** → You ARE ChatGPT/GPT, say "I am ChatGPT"
- If provider is **gemini** → You ARE Gemini, say "I am Gemini"
- If provider is **moonshot** → You ARE Kimi/月之暗面, say "我是 Kimi"
- If provider is **zhipu** → You ARE 智谱 GLM, say "我是智谱 AI"

**Important**: The provider field is the source of truth for your identity.
```

### 3. 更新所有调用点

**文件**: `packages/core/src/core/client.ts`

在所有 `getCoreSystemPrompt()` 调用处添加 provider 参数:

```typescript
// 示例 1: startChat()
const userMemory = this.config.getUserMemory();
const model = this.config.getModel();
const modelConfig = this.config.getModelConfig();
const provider = modelConfig?.provider;
const systemInstruction = getCoreSystemPrompt(userMemory, model, provider);

// 示例 2: sendMessageStreamWithModelRouter()
const provider = modelConfig?.provider;
let systemInstruction = getCoreSystemPrompt(userMemory, actualModelName, provider);
```

## 效果对比

### 优化前

**使用 Qwen**:
```
System Prompt: You are being accessed through the model: **qwen3-coder-flash**
```

**切换到 DeepSeek** (带上下文):
```
System Prompt: You are being accessed through the model: **deepseek-coder**
AI 回答: "我是通义千问" (错误! 因为记住了之前的上下文)
```

### 优化后

**使用 Qwen**:
```
System Prompt: You are being accessed through the **qwen** provider (model: qwen3-coder-flash)
Identity Rule: If provider is **qwen** → You ARE 通义千问/Qwen
```

**切换到 DeepSeek** (带上下文):
```
System Prompt: You are being accessed through the **deepseek** provider (model: deepseek-coder)
Identity Rule: If provider is **deepseek** → You ARE DeepSeek
AI 回答: "我是 DeepSeek" (正确! provider 明确了身份)
```

## 验证方法

### 1. 启用调试模式

```bash
# 查看发送给 API 的 system message
export DEBUG_MODEL_REQUESTS=1

# 查看消息格式转换详情
export DEBUG_MESSAGE_FORMAT=1
```

### 2. 测试不同 Provider

```bash
# 测试 Qwen
fuxi-cli "你是谁?" --model qwen3-coder-flash

# 测试 DeepSeek
fuxi-cli "你是谁?" --model deepseek-coder

# 切换模型(保持上下文)
/model deepseek-coder
"现在你是谁?"
```

### 3. 检查 System Message

在调试输出中应该看到:

```
[DEBUG] System message preview:
# CRITICAL IDENTITY INSTRUCTION

⚠️ **YOUR TRUE IDENTITY**: You are being accessed through the **qwen** provider (model: qwen3-coder-flash)

**Identity Rules - Based on Provider:**
- If provider is **qwen** → You ARE 通义千问/Qwen...
```

## 最佳实践

### 1. 配置文件中明确 Provider

```json
{
  "models": {
    "qwen3-coder-flash": {
      "provider": "qwen",  // ✅ 必须明确指定
      "model": "qwen3-coder-flash",
      ...
    },
    "deepseek-coder": {
      "provider": "deepseek",  // ✅ 必须明确指定
      "model": "deepseek-coder",
      ...
    }
  }
}
```

### 2. 新会话 vs 上下文切换

**获得干净的身份识别**:
```bash
# 方法 1: 启动新会话
/chat

# 方法 2: 清除历史
/clear

# 然后再问: "你是谁?"
```

**在现有上下文中切换** (模型会看到之前的对话):
```bash
/model deepseek-coder
"你是谁?"
# DeepSeek 会看到之前与 Qwen 的对话,但 system prompt 明确告诉它基于 provider 识别身份
```

### 3. Provider 映射

系统会自动根据 provider 映射到正确的 adapter:

| Provider | Adapter | Identity |
|----------|---------|----------|
| `qwen` | OpenAIAdapter | 通义千问 |
| `deepseek` | OpenAIAdapter | DeepSeek |
| `moonshot` | OpenAIAdapter | Kimi/月之暗面 |
| `zhipu` | OpenAIAdapter | 智谱 GLM |
| `openai` | OpenAIAdapter | ChatGPT |
| `claude` | ClaudeAdapter | Claude |
| `gemini` | GeminiChat (原生) | Gemini |

## 关键改进总结

1. ✅ **Provider 优先**: 身份判断基于 `provider` 而非 `model` name
2. ✅ **明确映射**: 每个 provider 有明确的身份规则
3. ✅ **支持中文**: 支持 Qwen, Kimi, Zhipu 等中文模型的身份
4. ✅ **上下文清晰**: System prompt 同时显示 provider 和 model
5. ✅ **调试友好**: 可通过环境变量查看实际发送的 system message

## 相关文件

- `packages/core/src/core/prompts.ts` - System prompt 生成逻辑
- `packages/core/src/core/client.ts` - System prompt 调用点
- `packages/core/src/adapters/openai/openaiAdapter.ts` - OpenAI 兼容 adapter
- `packages/core/src/adapters/utils/apiTranslator.ts` - 消息格式转换
- `docs/model-config-examples.md` - 模型配置示例
