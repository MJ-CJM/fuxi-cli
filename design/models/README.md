# 模型支持系统

> **状态**: ✅ 已完成 | **版本**: 2.0（统一 Provider 方案）

---

## 📋 概述

Fuxi CLI 提供了灵活的模型支持系统，通过统一的配置方式支持接入任意 OpenAI 兼容的 AI 模型，无需修改代码。

## ✨ 核心特性

- ✅ **零代码配置**：通过 JSON 配置即可添加新模型
- ✅ **统一接口**：所有 OpenAI 兼容模型使用 `provider: "openai"`
- ✅ **灵活身份识别**：通过 `metadata.providerName` 标识模型身份
- ✅ **自动环境变量发现**：智能查找 API Key
- ✅ **向后兼容**：完全兼容原有 Gemini、OpenAI、Claude 模型

## 📚 文档导航

| 文档 | 说明 | 适合读者 |
|------|------|----------|
| [通用模型支持设计](./universal-model-support.md) | 统一 Provider 方案的架构设计和实现细节 | 开发者 |
| [添加新模型指南](./add-new-model-guide.md) | 用户配置指南和故障排查 | 用户、开发者 |

## 🎯 支持的模型类型

### 国内大模型
- ✅ 通义千问（Qwen）
- ✅ DeepSeek
- ✅ 智谱 GLM
- ✅ 月之暗面（Kimi）
- ✅ MiniMax
- ✅ 其他 OpenAI 兼容模型

### 本地模型
- ✅ Ollama
- ✅ LM Studio
- ✅ 其他本地部署模型

### 企业自部署
- ✅ 企业内部模型
- ✅ 自定义端点

### 海外模型
- ✅ OpenAI (ChatGPT)
- ✅ Anthropic (Claude)
- ✅ Google (Gemini)

## 🚀 快速开始

### 1. 配置模型

编辑 `~/.gemini/config.json`：

```json
{
  "useModelRouter": true,
  "defaultModel": "qwen-coder-plus",
  "models": {
    "qwen-coder-plus": {
      "provider": "openai",
      "model": "qwen-coder-plus",
      "apiKey": "sk-your-api-key",
      "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
      "metadata": {
        "providerName": "qwen",
        "displayName": "通义千问"
      },
      "capabilities": {
        "maxOutputTokens": 8192,
        "supportsFunctionCalling": true
      }
    }
  }
}
```

### 2. 使用模型

```bash
# 切换模型
/model use qwen-coder-plus

# 查看当前模型
/model info

# 列出所有可用模型
/model list
```

## 💡 配置要点

### 统一 Provider 策略

**核心原则**：所有 OpenAI 兼容模型统一使用 `provider: "openai"`

```json
{
  "provider": "openai",              // 统一使用 openai
  "baseUrl": "...",                  // 指定实际的 API 端点
  "metadata": {
    "providerName": "qwen",          // 身份识别
    "displayName": "通义千问"         // 显示名称
  }
}
```

### 关键配置字段

| 字段 | 说明 | 示例 |
|------|------|------|
| `provider` | 统一使用 `"openai"` | `"openai"` |
| `model` | 模型名称 | `"qwen-coder-plus"` |
| `baseUrl` | API 端点 | `"https://api.example.com/v1"` |
| `metadata.providerName` | 身份标识 | `"qwen"`, `"deepseek"` |
| `metadata.displayName` | 显示名称 | `"通义千问"` |
| `metadata.envKeyNames` | 自定义环境变量名 | `["MY_API_KEY"]` |
| `capabilities.maxOutputTokens` | 最大输出 tokens | `8192` |
| `capabilities.supportsFunctionCalling` | 是否支持函数调用 | `true` / `false` |
| `capabilities.supportsMultimodal` | 是否支持 multimodal 格式 | `true` / `false` |

## 📝 配置示例

### 通义千问（Qwen）

```json
{
  "qwen-coder-plus": {
    "provider": "openai",
    "model": "qwen-coder-plus",
    "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "metadata": {
      "providerName": "qwen",
      "displayName": "通义千问"
    },
    "capabilities": {
      "maxOutputTokens": 8192,
      "supportsFunctionCalling": true
    }
  }
}
```

### DeepSeek

```json
{
  "deepseek-coder": {
    "provider": "openai",
    "model": "deepseek-coder",
    "baseUrl": "https://api.deepseek.com",
    "metadata": {
      "providerName": "deepseek",
      "displayName": "DeepSeek"
    },
    "capabilities": {
      "maxOutputTokens": 4096,
      "supportsFunctionCalling": false,
      "supportsMultimodal": false
    }
  }
}
```

### 本地模型（Ollama）

```json
{
  "local-qwen": {
    "provider": "openai",
    "model": "Qwen2.5-Coder-32B-Instruct",
    "apiKey": "not-required",
    "baseUrl": "http://localhost:11434/v1",
    "metadata": {
      "providerName": "qwen",
      "displayName": "本地千问"
    },
    "capabilities": {
      "maxOutputTokens": 4096,
      "supportsFunctionCalling": false
    }
  }
}
```

### 自定义服务

```json
{
  "my-custom-model": {
    "provider": "openai",
    "model": "custom-model-name",
    "baseUrl": "https://your-api.com/v1",
    "metadata": {
      "providerName": "custom",
      "displayName": "我的模型",
      "envKeyNames": ["MY_CUSTOM_API_KEY"]
    },
    "capabilities": {
      "maxOutputTokens": 4096,
      "supportsFunctionCalling": true
    }
  }
}
```

## 🔑 环境变量管理

### 自动发现

系统会根据 `metadata.providerName` 自动查找对应的环境变量：

| ProviderName | 环境变量 |
|--------------|---------|
| `openai` | `OPENAI_API_KEY` |
| `qwen` | `QWEN_API_KEY`, `QWEN_CODER_API_KEY`, `DASHSCOPE_API_KEY` |
| `deepseek` | `DEEPSEEK_API_KEY` |
| `moonshot` | `MOONSHOT_API_KEY`, `KIMI_API_KEY` |
| `zhipu` | `ZHIPU_API_KEY`, `GLM_API_KEY` |
| `minimax` | `MINIMAX_API_KEY` |

### 自定义环境变量

通过 `metadata.envKeyNames` 指定自定义环境变量名：

```json
{
  "metadata": {
    "envKeyNames": ["MY_CUSTOM_KEY", "FALLBACK_KEY"]
  }
}
```

## ⚙️ 能力配置 (capabilities)

### supportsFunctionCalling

控制是否支持函数调用：

- `true`：模型支持函数调用，系统会发送 `tools` 参数
- `false`：模型不支持函数调用，系统会过滤掉工具定义

**何时设置为 `false`**：
- 本地部署的模型
- 报错 `"auto" tool choice requires ...` 时

### supportsMultimodal

控制消息内容格式：

- `true`：使用数组格式 `content: [{type: 'text', text: '...'}]`
- `false`：使用字符串格式 `content: "..."`

**何时设置为 `false`**：
- DeepSeek 全系列
- 报错 `"invalid type: sequence, expected a string"` 时

### maxOutputTokens

设置最大输出 tokens 限制（必须根据模型实际限制设置）：

```json
{
  "capabilities": {
    "maxOutputTokens": 8192
  }
}
```

## 🎨 架构优势

### 零代码扩展

- ✅ 无需修改代码即可支持任意 OpenAI 兼容服务
- ✅ 用户可以自定义任何模型配置
- ✅ 社区可以分享配置预设

### 统一接口

- ✅ 所有 OpenAI 兼容模型使用相同的 `provider: "openai"`
- ✅ 简化配置理解和维护
- ✅ 减少代码复杂度

### 灵活配置

- ✅ `metadata.providerName` 控制身份识别
- ✅ `metadata.envKeyNames` 支持自定义环境变量
- ✅ `capabilities` 精确控制模型特性

### 自动发现

- ✅ 自动查找常见 provider 的环境变量
- ✅ 支持多个环境变量回退
- ✅ 清晰的错误提示

## 🔧 故障排查

### 常见错误及解决方案

| 错误 | 原因 | 解决方案 |
|------|------|---------|
| `"auto" tool choice requires ...` | 模型不支持 tool_choice | 设置 `supportsFunctionCalling: false` |
| `No API key found` | 未配置 API Key | 设置环境变量或在配置中添加 `apiKey` |
| `invalid type: sequence, expected a string` | 模型不支持 multimodal 格式 | 设置 `supportsMultimodal: false` |
| `Range of max_tokens should be [1, 8192]` | maxOutputTokens 超出限制 | 根据模型文档设置正确的值 |
| 模型身份识别错误 | 未配置 providerName | 设置 `metadata.providerName` |

### 调试方法

启用调试日志：

```bash
export DEBUG_MESSAGE_FORMAT=1
export DEBUG_MODEL_REQUESTS=1
```

## 📖 详细文档

### 用户文档
- [添加新模型指南](./add-new-model-guide.md) - 详细配置指南和示例

### 设计文档
- [通用模型支持设计](./universal-model-support.md) - 架构设计和实现细节

### 实现笔记
- [Provider 统一方案](./implementation-notes/provider-unification.md) - Provider 统一实施总结
- [Provider 简化方案](./implementation-notes/provider-simplification.md) - 简化方案设计
- [System Prompt 优化](./implementation-notes/system-prompt-optimization.md) - 身份识别优化

## 🎯 最佳实践

1. **统一使用 `provider: "openai"`** - 对于所有 OpenAI 兼容模型
2. **配置 `metadata.providerName`** - 确保身份识别正确
3. **使用环境变量管理 API Key** - 不要在配置文件中硬编码
4. **正确设置 `capabilities`** - 根据模型实际情况配置
5. **启用调试日志** - 遇到问题时便于排查

## 📊 测试状态

| 模型 | 状态 | 配置要点 |
|------|------|---------|
| 通义千问 | ✅ 已验证 | `supportsFunctionCalling: true` |
| DeepSeek | ✅ 已验证 | `supportsFunctionCalling: false`, `supportsMultimodal: false` |
| Ollama | ✅ 已验证 | `supportsFunctionCalling: false` |
| OpenAI | ✅ 已验证 | 原生支持 |
| Claude | ✅ 已验证 | 原生支持 |
| Gemini | ✅ 已验证 | 原生支持 |

## 🔮 路线图

- ✅ 统一 Provider 方案
- ✅ 环境变量自动发现
- ✅ Metadata 身份识别
- ✅ 完善的能力配置
- 📝 配置预设库（社区贡献）
- 📝 模型性能监控
- 📝 自动模型选择

---

**最后更新**: 2025-10-17
**版本**: 2.0（统一 Provider 方案）
