# 如何添加新模型

本文档介绍如何通过配置文件快速添加新的 AI 模型，无需修改代码。

> **✅ 已验证**: 本指南基于统一 Provider 方案，DeepSeek、Qwen、本地模型等均已成功接入。

## 快速开始

### 1. 添加 OpenAI 兼容模型（推荐）

大多数现代 AI 模型都提供 OpenAI 兼容的 API。**统一使用 `provider: "openai"`**，通过 `metadata` 配置身份和环境变量。

#### 示例：添加通义千问 (Qwen)

在 `~/.gemini/config.json` 中添加：

```json
{
  "useModelRouter": true,
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

#### 示例：添加 DeepSeek

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
        "supportsFunctionCalling": false,
        "supportsMultimodal": false
      }
    }
  }
}
```

**重要**：DeepSeek 必须设置 `supportsFunctionCalling: false` 和 `supportsMultimodal: false`

#### 示例：添加其他 OpenAI 兼容模型

```json
{
  "models": {
    "custom-model": {
      "provider": "openai",
      "model": "your-model-name",
      "apiKey": "your-api-key",
      "baseUrl": "https://api.your-provider.com/v1",
      "metadata": {
        "providerName": "custom",
        "displayName": "我的模型",
        "envKeyNames": ["MY_API_KEY", "CUSTOM_KEY"]
      },
      "capabilities": {
        "maxOutputTokens": 8192,
        "supportsFunctionCalling": true
      }
    }
  }
}
```

### 2. 添加本地部署模型

对于本地部署的模型（如 Ollama、LM Studio 等），同样使用 `provider: "openai"`：

```json
{
  "models": {
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
}
```

### 3. 使用新模型

添加配置后，使用 `/model use` 命令切换：

```bash
/model use qwen-coder-plus
```

或在启动时指定：

```bash
gemini --model qwen-coder-plus
```

## 配置选项详解

### 必填字段

| 字段 | 说明 | 示例 |
|-----|------|------|
| `provider` | 统一使用 `"openai"` | `"openai"` |
| `model` | 模型名称 | `"qwen-coder-plus"` |
| `baseUrl` | API 端点 URL | `"https://api.example.com/v1"` |

### 可选字段

| 字段 | 说明 | 默认值 |
|-----|------|--------|
| `apiKey` | API 密钥 | 从环境变量读取 |
| `metadata` | Provider 元数据（身份识别、环境变量） | `{}` |
| `capabilities` | 模型能力描述 | 见下文 |
| `options` | 其他选项 | `{}` |
| `customHeaders` | 自定义 HTTP 头 | `{}` |

### Provider 元数据 (metadata)

**新增字段**，用于身份识别和环境变量自定义：

```json
{
  "metadata": {
    "providerName": "qwen",           // 身份标识（用于 system prompt）
    "displayName": "通义千问",         // 显示名称
    "envKeyNames": ["QWEN_API_KEY"]  // 自定义环境变量名（可选）
  }
}
```

**字段说明**：

- **`providerName`**（推荐）：
  - 用于身份识别，模型会知道自己是"通义千问"、"DeepSeek"等
  - 用于环境变量自动查找（如 `"qwen"` → 自动查找 `QWEN_API_KEY`）
  - 常见值：`"qwen"`, `"deepseek"`, `"openai"`, `"moonshot"`, `"zhipu"`, `"custom"`

- **`displayName`**（可选）：
  - 显示给用户的友好名称
  - 例如：`"通义千问"`, `"DeepSeek"`, `"我的模型"`

- **`envKeyNames`**（可选）：
  - 自定义环境变量名称列表（按优先级）
  - 例如：`["MY_CUSTOM_KEY", "FALLBACK_KEY"]`
  - 如果不指定，系统会根据 `providerName` 自动查找

### 模型能力 (capabilities)

描述模型的限制和特性：

```json
{
  "capabilities": {
    "maxInputTokens": 32768,            // 最大输入 tokens
    "maxOutputTokens": 8192,            // 最大输出 tokens（重要！）
    "supportsStreaming": true,          // 是否支持流式输出
    "supportsFunctionCalling": true,    // 是否支持函数调用
    "supportsVision": false,            // 是否支持图片输入
    "supportsTools": true,              // 是否支持工具调用
    "supportsMultimodal": true          // 是否支持 multimodal 消息格式
  }
}
```

**重要提示**：

1. **`maxOutputTokens`**：
   - **必须正确设置**，否则可能导致 API 错误
   - 查看模型官方文档确定具体值

2. **`supportsFunctionCalling`**：
   - `true`：模型支持函数调用，系统会发送 `tools` 参数
   - `false`：模型不支持函数调用，系统会过滤掉工具定义
   - 默认值：`true`
   - **何时设置为 `false`**：
     - 本地部署的模型
     - 不支持 tool_choice 的 API
     - 报错 `"auto" tool choice requires ...` 时

3. **`supportsMultimodal`**：
   - `true`：使用数组格式 `content: [{type: 'text', text: '...'}]`
   - `false`：使用字符串格式 `content: "..."`
   - 默认值：`true`
   - **何时设置为 `false`**：
     - DeepSeek 全系列
     - 报错 `"invalid type: sequence, expected a string"` 时
     - 简化版 OpenAI 兼容 API

### 其他选项 (options)

```json
{
  "options": {
    "temperature": 0.1,
    "completionEndpoint": "/chat/completions",
    "responseFormat": "openai",
    "requestBody": {
      "thinking": {
        "type": "enabled"
      }
    }
  }
}
```

- `requestBody`：将对象直接合并到请求体中，用于传递模型特定的扩展字段（例如智谱 `thinking`、供应商自定义开关等）。不会覆盖已存在的标准字段。

## 常见场景

### 场景1: 国内大模型

#### 阿里云通义千问

```json
{
  "qwen-max": {
    "provider": "openai",
    "model": "qwen-max",
    "apiKey": "sk-xxx",
    "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "metadata": {
      "providerName": "qwen",
      "displayName": "通义千问"
    },
    "capabilities": {
      "maxOutputTokens": 8000,
      "supportsFunctionCalling": true,
      "supportsMultimodal": true
    }
  }
}
```

#### DeepSeek

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

#### 智谱 AI (GLM)

```json
{
  "glm-4.6": {
    "provider": "openai",
    "model": "glm-4.6",
    "apiKey": "your-api-key",
    "baseUrl": "https://open.bigmodel.cn/api/paas/v4",
    "metadata": {
      "providerName": "zhipu",
      "displayName": "智谱AI"
    },
    "capabilities": {
      "maxOutputTokens": 65536,
      "supportsFunctionCalling": true,
      "supportsMultimodal": true
    },
    "options": {
      "completionEndpoint": "/chat/completions",
      "requestBody": {
        "thinking": {
          "type": "enabled"
        }
      }
    }
  }
}
```

> 若需要启用智谱的“深度思考”能力，只需在 `options.requestBody` 中加入 `thinking` 字段即可，其余配置保持 OpenAI 兼容格式。

#### 月之暗面 (Moonshot/Kimi)

```json
{
  "moonshot-v1": {
    "provider": "openai",
    "model": "moonshot-v1-8k",
    "baseUrl": "https://api.moonshot.cn/v1",
    "metadata": {
      "providerName": "moonshot",
      "displayName": "Kimi"
    },
    "capabilities": {
      "maxOutputTokens": 8192,
      "supportsFunctionCalling": true
    }
  }
}
```

### 场景2: 本地模型

#### Ollama

```json
{
  "ollama-qwen": {
    "provider": "openai",
    "model": "Qwen2.5-Coder-32B-Instruct",
    "apiKey": "not-required",
    "baseUrl": "http://localhost:11434/v1",
    "metadata": {
      "providerName": "qwen",
      "displayName": "Ollama 千问"
    },
    "capabilities": {
      "maxOutputTokens": 4096,
      "supportsFunctionCalling": false
    }
  }
}
```

#### LM Studio

```json
{
  "lmstudio-local": {
    "provider": "openai",
    "model": "local-model",
    "apiKey": "not-required",
    "baseUrl": "http://localhost:1234/v1",
    "metadata": {
      "providerName": "custom",
      "displayName": "LM Studio"
    },
    "capabilities": {
      "maxOutputTokens": 4096,
      "supportsFunctionCalling": false
    }
  }
}
```

### 场景3: 企业自部署模型

```json
{
  "company-llm": {
    "provider": "openai",
    "model": "company-gpt",
    "apiKey": "internal-key",
    "baseUrl": "https://ai.company.internal/v1",
    "metadata": {
      "providerName": "custom",
      "displayName": "企业AI",
      "envKeyNames": ["COMPANY_AI_KEY", "INTERNAL_API_KEY"]
    },
    "customHeaders": {
      "X-Company-Auth": "additional-auth"
    },
    "capabilities": {
      "maxOutputTokens": 8192,
      "supportsFunctionCalling": true
    }
  }
}
```

### 场景4: 华为内部模型

```json
{
  "qwen-mlops": {
    "provider": "openai",
    "model": "Qwen2.5-Coder-32B-Instruct-20250626105438",
    "apiKey": "your-mlops-key",
    "baseUrl": "http://mlops.huawei.com/mlops-service/api/v2/agentService/v1",
    "metadata": {
      "providerName": "qwen",
      "displayName": "华为通义千问"
    },
    "capabilities": {
      "maxOutputTokens": 4096,
      "supportsFunctionCalling": false,
      "supportsMultimodal": true
    }
  }
}
```

## API Key 管理

### 方式1: 配置文件中指定（不推荐）

```json
{
  "model-name": {
    "apiKey": "sk-your-api-key"
  }
}
```

### 方式2: 环境变量（推荐）

```bash
# 在 ~/.bashrc 或 ~/.zshrc 中
export QWEN_API_KEY="sk-your-qwen-key"
export DEEPSEEK_API_KEY="sk-your-deepseek-key"
export OPENAI_API_KEY="sk-your-openai-key"
```

配置文件中省略 `apiKey`：

```json
{
  "qwen-coder-plus": {
    "provider": "openai",
    "model": "qwen-coder-plus",
    "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "metadata": {
      "providerName": "qwen"
    }
  }
}
```

### 环境变量自动发现

系统会根据 `metadata.providerName` 自动查找对应的环境变量：

| ProviderName | 自动查找的环境变量（优先级从高到低） |
|--------------|--------------------------|
| `openai` | `OPENAI_API_KEY` |
| `qwen` | `QWEN_API_KEY`, `QWEN_CODER_API_KEY`, `DASHSCOPE_API_KEY` |
| `deepseek` | `DEEPSEEK_API_KEY` |
| `moonshot` | `MOONSHOT_API_KEY`, `KIMI_API_KEY` |
| `zhipu` | `ZHIPU_API_KEY`, `GLM_API_KEY` |
| `minimax` | `MINIMAX_API_KEY` |

### 方式3: 自定义环境变量名

通过 `metadata.envKeyNames` 指定自定义环境变量名：

```json
{
  "my-model": {
    "provider": "openai",
    "model": "my-model",
    "baseUrl": "https://api.example.com/v1",
    "metadata": {
      "providerName": "custom",
      "envKeyNames": ["MY_CUSTOM_API_KEY", "FALLBACK_API_KEY"]
    }
  }
}
```

系统会按顺序查找：
1. `MY_CUSTOM_API_KEY`
2. `FALLBACK_API_KEY`
3. 如果都没有，则报错

### 方式4: .env 文件

在项目根目录创建 `.env` 文件：

```bash
QWEN_API_KEY=sk-your-qwen-key
DEEPSEEK_API_KEY=sk-your-deepseek-key
```

## 故障排查

### 错误: `"auto" tool choice requires --enable-auto-tool-choice ...`

**完整错误**：
```
"auto" tool choice requires --enable-auto-tool-choice and --tool-call-parser to be set
```

**原因**：模型不支持 tool_choice 参数

**解决方法**：设置 `supportsFunctionCalling: false`

```json
{
  "capabilities": {
    "supportsFunctionCalling": false
  }
}
```

### 错误: `No API key found`

**完整错误**：
```
No API key found for openai. Set OPENAI_API_KEY environment variable.
```

**原因**：未配置 API Key

**解决方案**：
1. 在配置文件中添加 `apiKey`
2. 或设置对应的环境变量（根据 `providerName` 自动查找）
3. 或在 `metadata.envKeyNames` 中指定自定义环境变量名

**示例**：

```json
{
  "metadata": {
    "providerName": "qwen"  // 系统会自动查找 QWEN_API_KEY
  }
}
```

或：

```json
{
  "metadata": {
    "envKeyNames": ["MY_CUSTOM_KEY"]  // 系统会查找 MY_CUSTOM_KEY
  }
}
```

### 错误: `invalid type: sequence, expected a string`

**完整错误**：
```
Failed to deserialize the JSON body into the target type:
messages[4]: invalid type: sequence, expected a string at line 1 column 25581
```

**原因**：模型不支持 OpenAI 的 multimodal 消息格式（content 为数组）

**解决方法**：设置 `supportsMultimodal: false`

```json
{
  "capabilities": {
    "supportsMultimodal": false
  }
}
```

**适用场景**：
- ✅ DeepSeek 全系列模型
- ✅ 部分国产大模型
- ✅ 本地部署的小模型
- ✅ 简化版 OpenAI 兼容 API

### 错误: `Range of max_tokens should be [1, 8192]`

**原因**：`maxOutputTokens` 超出模型限制

**解决方法**：根据模型官方文档设置正确的 `maxOutputTokens`

```json
{
  "capabilities": {
    "maxOutputTokens": 8192  // 根据模型文档设置
  }
}
```

### 错误: 模型身份识别错误

**问题**：模型说自己是错误的身份（如通义千问说自己是 ChatGPT）

**原因**：未配置 `metadata.providerName`

**解决方法**：检查 `metadata.providerName` 配置

```json
{
  "metadata": {
    "providerName": "qwen"  // 确保这个值正确
  }
}
```

## 完整配置示例

这是一个包含多个模型的完整配置示例：

```json
{
  "useModelRouter": true,
  "defaultModel": "qwen-coder-plus",
  "models": {
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
        "supportsFunctionCalling": true,
        "supportsMultimodal": true
      }
    },
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
    },
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
    },
    "gpt-4o-mini": {
      "provider": "openai",
      "model": "gpt-4o-mini",
      "metadata": {
        "providerName": "openai"
      },
      "capabilities": {
        "maxOutputTokens": 16384,
        "supportsFunctionCalling": true
      }
    }
  },
  "fallbackModels": ["gpt-4o-mini"]
}
```

## 调试技巧

### 启用调试日志

在运行前设置环境变量：

```bash
export DEBUG_MESSAGE_FORMAT=1
export DEBUG_MODEL_REQUESTS=1
```

然后运行命令，会看到详细的调试信息：

```
[2025-10-16T13:13:00.347Z] INFO Creating new adapter {
  "provider": "openai",
  "model": "qwen-coder-plus",
  "metadata": { "providerName": "qwen" }
}

[2025-10-16T13:13:00.347Z] INFO Adapter validation successful {
  "provider": "openai",
  "model": "qwen-coder-plus",
  "supportsMultimodal": true,
  "supportsFunctionCalling": true
}
```

### 验证配置加载

检查 `metadata` 和 `capabilities` 是否正确加载：

```
[DEBUG] ModelConfig loaded: {
  provider: 'openai',
  model: 'qwen-coder-plus',
  metadata: {
    providerName: 'qwen',
    displayName: '通义千问'
  },
  capabilities: {
    maxOutputTokens: 8192,
    supportsFunctionCalling: true,
    supportsMultimodal: true
  }
}
```

### 验证环境变量发现

检查 API Key 是否正确查找：

```
[DEBUG] API Key discovery:
  - Trying custom env keys: undefined
  - Trying provider 'qwen' env keys: QWEN_API_KEY, QWEN_CODER_API_KEY, DASHSCOPE_API_KEY
  - Found: QWEN_API_KEY
```

## 成功案例

### 通义千问 (Qwen) - 已验证 ✅

```json
{
  "qwen-coder-plus": {
    "provider": "openai",
    "model": "qwen-coder-plus",
    "apiKey": "sk-your-qwen-key",
    "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "metadata": {
      "providerName": "qwen",
      "displayName": "通义千问"
    },
    "capabilities": {
      "maxOutputTokens": 8192,
      "supportsFunctionCalling": true,
      "supportsMultimodal": true
    }
  }
}
```

**验证结果**：
- ✅ 基本对话正常
- ✅ 函数调用支持良好
- ✅ 流式输出正常
- ✅ 多轮对话历史正确
- ✅ 身份识别正确（说"我是通义千问"）

### DeepSeek - 已验证 ✅

```json
{
  "deepseek-coder": {
    "provider": "openai",
    "model": "deepseek-coder",
    "apiKey": "sk-your-deepseek-key",
    "baseUrl": "https://api.deepseek.com",
    "metadata": {
      "providerName": "deepseek",
      "displayName": "DeepSeek"
    },
    "capabilities": {
      "maxOutputTokens": 4096,
      "supportsFunctionCalling": false,
      "supportsMultimodal": false
    },
    "options": {
      "responseFormat": "openai",
      "maxTokens": 4000,
      "temperature": 0.1
    }
  }
}
```

**验证结果**：
- ✅ 基本对话正常
- ✅ `/init` 命令成功执行
- ✅ 工具调用正常
- ✅ 流式输出正常
- ✅ 多轮对话历史正确处理

**关键配置**：
- `supportsFunctionCalling: false` 是**必需的**
- `supportsMultimodal: false` 是**必需的**
- 否则会报错

### 本地模型 (Ollama) - 已验证 ✅

```json
{
  "ollama-qwen": {
    "provider": "openai",
    "model": "Qwen2.5-Coder-32B-Instruct",
    "apiKey": "not-required",
    "baseUrl": "http://localhost:11434/v1",
    "metadata": {
      "providerName": "qwen",
      "displayName": "Ollama 千问"
    },
    "capabilities": {
      "maxOutputTokens": 4096,
      "supportsFunctionCalling": false
    }
  }
}
```

**验证结果**：
- ✅ 本地部署正常
- ✅ 基本对话正常
- ✅ 无需 API Key

## 相关文档

- [架构设计](./universal-model-support.md) - 统一 Provider 方案的架构设计
- [模型系统概述](./README.md) - 模型支持系统的总体说明

## 获取帮助

如果遇到问题：

1. **首先启用调试日志**：`DEBUG_MESSAGE_FORMAT=1 DEBUG_MODEL_REQUESTS=1`
2. 查看本文档的"故障排查"部分
3. 查看 [架构设计文档](./universal-model-support.md) 的详细说明
4. 搜索已有 [Issues](https://github.com/your-repo/issues)
5. 提交新的 [Issue](https://github.com/your-repo/issues/new)（附带调试日志）

## 总结

统一 Provider 方案的核心要点：

1. **统一接口**：所有 OpenAI 兼容模型使用 `provider: "openai"`
2. **身份识别**：通过 `metadata.providerName` 识别模型身份
3. **环境变量**：自动查找或通过 `metadata.envKeyNames` 自定义
4. **能力控制**：通过 `capabilities` 精确控制模型特性
5. **零代码扩展**：无需修改代码即可支持任意 OpenAI 兼容服务
