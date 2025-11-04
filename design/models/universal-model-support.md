# 通用模型支持方案设计文档

## 状态：✅ 已实现并验证（v2.0 - 统一 Provider 方案）

本文档描述了 Fuxi CLI 的通用模型支持架构，采用统一的 Provider 策略实现零代码扩展。

## 1. 设计目标

- ✅ **零代码添加新模型**：通过配置文件即可支持任意 OpenAI 兼容服务
- ✅ **统一接口**：所有 OpenAI 兼容模型使用相同的 `provider: "openai"`
- ✅ **灵活配置**：通过 `metadata` 实现身份识别和环境变量自定义
- ✅ **向后兼容**：不影响现有 Gemini、OpenAI、Claude 等模型

## 2. 核心设计理念

### 2.1 统一 Provider 策略

**核心观点**：所有 OpenAI 兼容的模型（Qwen、DeepSeek、Moonshot 等）在技术实现上**完全相同**，区别仅在于：
1. API Key 的环境变量名
2. Base URL
3. 身份标识（用于 system prompt）
4. 模型能力配置（如是否支持函数调用）

**解决方案**：统一使用 `provider: "openai"` + `metadata` 配置

```json
{
  "provider": "openai",           // 统一使用 openai adapter
  "baseUrl": "...",               // 指定实际的 API 端点
  "metadata": {
    "providerName": "qwen",       // 身份识别
    "displayName": "通义千问",      // 显示名称
    "envKeyNames": ["QWEN_API_KEY"] // 环境变量查找
  }
}
```

### 2.2 配置驱动的模型注册

**新配置格式示例**：

```json
{
  "useModelRouter": true,
  "defaultModel": "qwen-coder-plus",
  "models": {
    "qwen-coder-plus": {
      "provider": "openai",
      "model": "qwen-coder-plus",
      "apiKey": "sk-xxx",
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
      "apiKey": "sk-xxx",
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
    }
  }
}
```

## 3. 架构实现

### 3.1 类型定义

```typescript
// packages/core/src/adapters/base/types.ts

/**
 * Provider 元数据
 */
export interface ProviderMetadata {
  /** Provider 身份标识（如 'qwen', 'deepseek', 'openai'） */
  providerName?: string;
  
  /** 显示名称（如 '通义千问', 'DeepSeek'） */
  displayName?: string;
  
  /** 环境变量名称列表（按优先级） */
  envKeyNames?: string[];
  
  /** 其他自定义元数据 */
  [key: string]: any;
}

/**
 * 模型能力描述
 */
export interface ModelCapabilities {
  /** 最大输入 tokens */
  maxInputTokens?: number;
  
  /** 最大输出 tokens（重要！） */
  maxOutputTokens?: number;
  
  /** 是否支持流式输出 */
  supportsStreaming?: boolean;
  
  /** 是否支持函数调用 */
  supportsFunctionCalling?: boolean;
  
  /** 是否支持视觉输入 */
  supportsVision?: boolean;
  
  /** 是否支持工具调用 */
  supportsTools?: boolean;
  
  /** 是否支持 multimodal 消息格式（content 为数组） */
  supportsMultimodal?: boolean;
}

/**
 * 模型配置
 */
export interface ModelConfig {
  /** Provider 类型（统一使用 "openai"） */
  provider: ModelProvider | string;
  
  /** 模型名称 */
  model: string;
  
  /** API Key */
  apiKey?: string;
  
  /** API 端点 */
  baseUrl?: string;
  
  /** Provider 元数据 */
  metadata?: ProviderMetadata;
  
  /** 模型能力 */
  capabilities?: ModelCapabilities;
  
  /** 其他选项 */
  options?: Record<string, any>;
  
  // ... 其他字段
}
```

### 3.2 OpenAI Adapter 增强

```typescript
// packages/core/src/adapters/openai/openaiAdapter.ts

export class OpenAIAdapter extends AbstractModelClient {
  private readonly defaultBaseUrl = 'https://api.openai.com/v1';

  constructor(config: ModelConfig) {
    super(config);
    
    // 不再验证 provider 是否在预定义列表中
    // 任何配置了 baseUrl 的模型都可以使用
  }

  /**
   * 增强的 API Key 发现机制
   */
  protected override getApiKey(): string {
    if (this.config.apiKey) {
      return this.config.apiKey;
    }

    // 1. 优先使用 metadata.envKeyNames
    const customEnvKeys = this.config.metadata?.envKeyNames;
    if (customEnvKeys && Array.isArray(customEnvKeys)) {
      for (const keyName of customEnvKeys) {
        const value = process.env[keyName];
        if (value) return value;
      }
    }

    // 2. 回退到 metadata.providerName 或 provider 的默认映射
    const providerName = this.config.metadata?.providerName || this.config.provider;
    const defaultEnvKeyMap: Record<string, string[]> = {
      'openai': ['OPENAI_API_KEY'],
      'qwen': ['QWEN_API_KEY', 'QWEN_CODER_API_KEY', 'DASHSCOPE_API_KEY'],
      'deepseek': ['DEEPSEEK_API_KEY'],
      'moonshot': ['MOONSHOT_API_KEY', 'KIMI_API_KEY'],
      'zhipu': ['ZHIPU_API_KEY', 'GLM_API_KEY'],
      'minimax': ['MINIMAX_API_KEY'],
    };

    const possibleKeys = defaultEnvKeyMap[providerName as string] || ['OPENAI_API_KEY'];
    
    for (const keyName of possibleKeys) {
      const value = process.env[keyName];
      if (value) return value;
    }

    throw new AuthenticationError(
      this.config.provider,
      `No API key found. Set apiKey in config or environment variable: ${possibleKeys.join(', ')}`
    );
  }
}
```

### 3.3 System Prompt 身份识别

```typescript
// packages/core/src/core/prompts.ts

export function getCoreSystemPrompt(
  userMemory?: string,
  modelName?: string,
  providerName?: string  // 从 metadata.providerName 获取
): string {
  const basePrompt = `
# CRITICAL IDENTITY INSTRUCTION

⚠️ **YOUR TRUE IDENTITY**: You are being accessed through the **${providerName || 'unknown'}** provider${modelName ? ` (model: ${modelName})` : ''}

**Identity Rules - Based on Provider:**
- If provider is **qwen** → You ARE 通义千问/Qwen, say "我是通义千问"
- If provider is **deepseek** → You ARE DeepSeek, say "我是 DeepSeek"
- If provider is **openai** → You ARE ChatGPT, say "I am ChatGPT"
- If provider is **custom** → Identify based on your training
...
`;

  return basePrompt + userMemory;
}

// client.ts 中的使用
const providerName = modelConfig?.metadata?.providerName || modelConfig?.provider;
const systemInstruction = getCoreSystemPrompt(userMemory, actualModelName, providerName);
```

### 3.4 Adapter 注册表简化

```typescript
// packages/core/src/adapters/registry.ts

export class AdapterRegistry {
  /**
   * 获取适配器实例
   */
  static getAdapter(config: ModelConfig): AbstractModelClient {
    const adapterType = config.adapterType || this.inferAdapterType(config);
    
    switch (adapterType) {
      case 'openai':
        return new OpenAIAdapter(config);
      case 'claude':
        return new ClaudeAdapter(config);
      case 'gemini':
        return new GeminiAdapter(config);
      case 'custom':
        return new CustomAdapter(config);
      default:
        throw new Error(`Unknown adapter type: ${adapterType}`);
    }
  }

  /**
   * 推断适配器类型
   */
  private static inferAdapterType(config: ModelConfig): string {
    // 所有配置都通过 adapterType 或默认推断
    // 不再维护硬编码的 provider 列表
    const providerMap: Record<string, string> = {
      'gemini': 'gemini',
      'openai': 'openai',
      'claude': 'claude',
    };
    
    return providerMap[config.provider] || 'openai'; // 默认使用 openai
  }
}
```

## 4. 配置示例

### 4.1 通义千问（Qwen）

```json
{
  "qwen-coder-plus": {
    "provider": "openai",
    "model": "qwen-coder-plus",
    "apiKey": "sk-xxx",
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

### 4.2 DeepSeek

```json
{
  "deepseek-coder": {
    "provider": "openai",
    "model": "deepseek-coder",
    "apiKey": "sk-xxx",
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

**注意**：DeepSeek 必须设置 `supportsFunctionCalling: false` 和 `supportsMultimodal: false`

### 4.3 本地模型（Ollama）

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

### 4.4 自定义 OpenAI 兼容服务

```json
{
  "my-custom-model": {
    "provider": "openai",
    "model": "custom-model-name",
    "apiKey": "xxx",
    "baseUrl": "https://your-api.com/v1",
    "metadata": {
      "providerName": "custom",
      "displayName": "我的自定义模型",
      "envKeyNames": ["MY_CUSTOM_API_KEY", "FALLBACK_KEY"]
    },
    "capabilities": {
      "maxOutputTokens": 4096,
      "supportsFunctionCalling": true,
      "supportsMultimodal": false
    }
  }
}
```

## 5. 核心优势

### 5.1 零代码扩展

- ✅ 无需修改代码即可支持任意 OpenAI 兼容服务
- ✅ 用户可以自定义任何模型配置
- ✅ 社区可以分享配置预设

### 5.2 统一接口

- ✅ 所有 OpenAI 兼容模型使用相同的 `provider: "openai"`
- ✅ 简化配置理解和维护
- ✅ 减少代码复杂度

### 5.3 灵活配置

- ✅ `metadata.providerName` 控制身份识别
- ✅ `metadata.envKeyNames` 支持自定义环境变量
- ✅ `capabilities` 精确控制模型特性

### 5.4 自动发现

- ✅ 自动查找常见 provider 的环境变量
- ✅ 支持多个环境变量回退
- ✅ 清晰的错误提示

## 6. 环境变量自动发现

系统会根据 `metadata.providerName` 自动查找对应的环境变量：

| ProviderName | 环境变量（优先级从高到低） |
|--------------|--------------------------|
| `openai` | `OPENAI_API_KEY` |
| `qwen` | `QWEN_API_KEY`, `QWEN_CODER_API_KEY`, `DASHSCOPE_API_KEY` |
| `deepseek` | `DEEPSEEK_API_KEY` |
| `moonshot` | `MOONSHOT_API_KEY`, `KIMI_API_KEY` |
| `zhipu` | `ZHIPU_API_KEY`, `GLM_API_KEY` |
| `minimax` | `MINIMAX_API_KEY` |

**自定义环境变量**：

```json
{
  "metadata": {
    "providerName": "my-provider",
    "envKeyNames": ["MY_CUSTOM_KEY", "FALLBACK_KEY"]
  }
}
```

## 7. 关键实现细节

### 7.1 移除硬编码限制

**旧实现**（已移除）：
```typescript
// ❌ 旧代码：硬编码的 provider 列表
private static readonly COMPATIBLE_PROVIDERS = [
  'openai', 'qwen', 'deepseek', 'moonshot', 'zhipu'
];
```

**新实现**：
```typescript
// ✅ 新代码：接受任何 provider，通过 baseUrl 和 metadata 配置
constructor(config: ModelConfig) {
  super(config);
  // 不再验证 provider 是否在列表中
}
```

### 7.2 删除独立 Adapter

- ✅ 删除了 `packages/core/src/adapters/qwen/qwenAdapter.ts`
- ✅ 所有 OpenAI 兼容模型统一使用 `OpenAIAdapter`
- ✅ 减少代码维护成本

### 7.3 配置加载优化

```typescript
// packages/core/src/config/config.ts
private loadCustomModelConfigs(): void {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  if (config.models) {
    for (const [modelName, modelDef] of Object.entries(config.models)) {
      const def = modelDef as any;
      
      // 复制所有字段，包括 metadata 和 capabilities
      const modelConfig: any = {
        ...def,
        provider: def.provider || 'custom',
        model: def.model || modelName,
        authType: 'api-key'
      };
      
      this.customModels[modelName] = modelConfig;
    }
  }
}
```

### 7.4 消息格式转换

```typescript
// packages/core/src/adapters/utils/apiTranslator.ts
static unifiedToOpenaiRequest(request: UnifiedRequest, supportsMultimodal: boolean = true) {
  const messages = request.messages.map(msg => {
    // 当模型不支持 multimodal 格式时，将数组转为字符串
    if (!supportsMultimodal && msg.content) {
      const textParts = msg.content.filter(part => part.type === 'text');
      const combinedText = textParts.map(part => part.text || '').join('\n').trim();
      
      return {
        role: msg.role,
        content: combinedText || ''
      };
    }
    
    // 支持 multimodal 的模型使用标准数组格式
    return {
      role: msg.role,
      content: msg.content.map(part => ({
        type: part.type,
        text: part.text
      }))
    };
  });
  
  return { messages, /* ... */ };
}
```

## 8. 向后兼容

### 8.1 旧配置格式（仍然支持）

```json
{
  "provider": "qwen",
  "model": "qwen3-coder-flash"
}
```

系统会自动将 `provider: "qwen"` 映射到 OpenAIAdapter。

### 8.2 新推荐格式

```json
{
  "provider": "openai",
  "model": "qwen3-coder-flash",
  "metadata": {
    "providerName": "qwen"
  }
}
```

### 8.3 迁移路径

1. **Phase 1**: 保持旧配置，系统自动兼容
2. **Phase 2**: 逐步迁移到新格式（可选）
3. **Phase 3**: 享受统一接口的便利

## 9. 测试结果

- ✅ 通义千问使用统一配置正常工作
- ✅ DeepSeek 使用统一配置正常工作
- ✅ 本地模型（Ollama）配置成功
- ✅ 企业自部署模型配置成功
- ✅ 环境变量自动发现机制正常
- ✅ metadata.providerName 身份识别正确
- ✅ 自定义环境变量名称支持正常
- ✅ 向后兼容性保持完好

## 10. 故障排查

### 10.1 错误：`"auto" tool choice requires ...`

**原因**：模型不支持 tool_choice 参数

**解决**：设置 `supportsFunctionCalling: false`

```json
{
  "capabilities": {
    "supportsFunctionCalling": false
  }
}
```

### 10.2 错误：`No API key found`

**原因**：未配置 API Key

**解决方案**：
1. 在配置文件中添加 `apiKey`
2. 或设置对应的环境变量
3. 或在 `metadata.envKeyNames` 中指定自定义环境变量名

### 10.3 错误：模型身份识别错误

**原因**：未配置 `metadata.providerName`

**解决**：检查 `metadata.providerName` 配置

```json
{
  "metadata": {
    "providerName": "qwen"  // 确保这个值正确
  }
}
```

### 10.4 错误：`invalid type: sequence, expected a string`

**原因**：模型不支持 multimodal 消息格式

**解决**：设置 `supportsMultimodal: false`

```json
{
  "capabilities": {
    "supportsMultimodal": false
  }
}
```

## 11. 相关文档

- [用户指南：如何添加新模型](./add-new-model-guide.md)
- [设计文档：模型系统概述](./README.md)

## 12. 总结

统一 Provider 方案实现了：

1. **✅ 零代码扩展**：无需修改代码即可支持任意 OpenAI 兼容服务
2. **✅ 统一接口**：所有模型使用相同的 `provider: "openai"`
3. **✅ 灵活配置**：通过 `metadata` 和 `capabilities` 精确控制
4. **✅ 自动发现**：智能查找环境变量
5. **✅ 向后兼容**：不影响现有配置

这个方案大大简化了模型接入流程，提高了系统的可扩展性和可维护性。
