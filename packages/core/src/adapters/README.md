# Multi-Model Support for FUXI CLI

This directory contains the multi-model adapter system that enables FUXI CLI to work with different AI model providers beyond just Gemini.

## Architecture Overview

The multi-model system is built using the adapter pattern with the following key components:

### Core Components

1. **BaseModelClient Interface** (`base/baseModelClient.ts`)
   - Unified interface for all model providers
   - Standardizes methods like `generateContent`, `generateContentStream`, `countTokens`

2. **Unified Types** (`base/types.ts`)
   - Common request/response formats across all providers
   - Model configuration definitions
   - Error handling types

3. **Model Router** (`modelRouter.ts`)
   - Routes requests to appropriate adapters
   - Handles fallback logic
   - Manages adapter lifecycle

4. **API Translator** (`utils/apiTranslator.ts`)
   - Converts between different API formats
   - Handles provider-specific request/response structures

### Supported Providers

#### 1. Gemini (Google) - `gemini/geminiAdapter.ts`
- **Models**: `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.5-flash-lite`
- **Features**: Full feature support, embeddings, function calling
- **Auth**: API key, OAuth, Vertex AI

#### 2. OpenAI - `openai/openaiAdapter.ts`
- **Models**: `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`, `gpt-3.5-turbo`
- **Features**: Chat completions, streaming, function calling, embeddings
- **Auth**: API key

#### 3. Claude (Anthropic) - `claude/claudeAdapter.ts`
- **Models**: `claude-3-5-sonnet`, `claude-3-5-haiku`, `claude-3-opus`
- **Features**: Chat completions, streaming, tool use
- **Auth**: API key

#### 4. Custom HTTP - `custom/customAdapter.ts`
- **Models**: Any OpenAI-compatible API
- **Features**: Configurable response formats, custom endpoints
- **Auth**: Flexible authentication options

## Quick Start

### Environment Configuration

```bash
# Gemini (default)
export GEMINI_API_KEY="your-gemini-key"

# OpenAI
export OPENAI_API_KEY="your-openai-key"

# Claude
export CLAUDE_API_KEY="your-claude-key"

# Custom local model
export CUSTOM_MODEL_URL="http://localhost:8000/v1"
export CUSTOM_MODEL_NAME="llama-3"
```

### Basic Usage

```typescript
import { ModelService } from '../services/modelService.js';
import type { UnifiedRequest } from './base/index.js';

const modelService = new ModelService(config);

const request: UnifiedRequest = {
  messages: [{
    role: 'user',
    content: [{ type: 'text', text: 'Hello, world!' }]
  }]
};

// Use different models
const geminiResponse = await modelService.generateContent(request, 'gemini-2.5-flash');
const openaiResponse = await modelService.generateContent(request, 'openai:gpt-4o');
const claudeResponse = await modelService.generateContent(request, 'claude:claude-3-5-sonnet');
```

### CLI Usage

```bash
# Default model (Gemini)
fuxi-cli "What is AI?"

# Specify provider and model
fuxi-cli --model openai:gpt-4o "Explain machine learning"
fuxi-cli --model claude:claude-3-5-sonnet "Write a poem"

# Use custom local model
fuxi-cli --model custom:my-local-llama "Help me code"
```

### Configuration File

Create `~/.gemini/config.json`:

```json
{
  "defaultModel": "gemini-2.5-flash",
  "models": {
    "my-gpt4": {
      "provider": "openai",
      "model": "gpt-4o",
      "apiKey": "${OPENAI_API_KEY}",
      "baseUrl": "https://api.openai.com/v1"
    },
    "local-llama": {
      "provider": "custom",
      "model": "llama-3-8b",
      "baseUrl": "http://localhost:8000/v1",
      "options": {
        "responseFormat": "openai"
      }
    }
  }
}
```

## Advanced Features

### Streaming Responses

```typescript
const stream = modelService.generateContentStream(request, 'openai:gpt-4o');

for await (const chunk of stream) {
  if (chunk.delta.content?.[0]?.text) {
    process.stdout.write(chunk.delta.content[0].text);
  }
  if (chunk.done) break;
}
```

### Function Calling

```typescript
const request: UnifiedRequest = {
  messages: [/* ... */],
  tools: [{
    name: 'get_weather',
    description: 'Get current weather',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string' }
      }
    }
  }]
};

const response = await modelService.generateContent(request);
```

### Custom Model Configuration

```typescript
const customConfig: ModelConfig = {
  provider: 'custom',
  model: 'my-local-model',
  baseUrl: 'http://localhost:8000/v1',
  authType: 'api-key',
  apiKey: 'optional-key',
  options: {
    responseFormat: 'openai',
    customHeaders: {
      'X-Custom-Header': 'value'
    }
  }
};

modelService.setCustomModelConfig('my-model', customConfig);
```

## Error Handling

The adapter system provides unified error types:

- `AuthenticationError` - Invalid API keys or permissions
- `QuotaExceededError` - Rate limits or quota exceeded
- `ModelNotFoundError` - Requested model not available
- `ServiceUnavailableError` - Provider service issues
- `ContentFilterError` - Content was filtered/blocked

## Adding New Providers

To add a new provider:

1. Create an adapter class extending `AbstractModelClient`
2. Implement required methods: `generateContent`, `generateContentStream`, `countTokens`, `validate`
3. Register the adapter: `globalAdapterRegistry.register(provider, AdapterClass)`

Example:

```typescript
export class MyProviderAdapter extends AbstractModelClient {
  async generateContent(request: UnifiedRequest): Promise<UnifiedResponse> {
    // Implementation
  }

  async* generateContentStream(request: UnifiedRequest): AsyncGenerator<StreamChunk> {
    // Implementation
  }

  // ... other methods
}

// Register
globalAdapterRegistry.register(ModelProvider.MY_PROVIDER, MyProviderAdapter);
```

## Migration from Gemini-only

The system is designed for backward compatibility:

1. Existing Gemini configurations continue to work
2. Default model remains `gemini-2.5-flash`
3. All existing CLI commands work without changes
4. Gradual migration path available

To migrate:
1. Set up environment variables for new providers
2. Start using `--model provider:model` syntax
3. Update configuration files with custom models
4. Test and validate new providers

## Performance Considerations

- Adapters are cached and reused
- Validation occurs only once per adapter
- Fallback mechanisms minimize failures
- Connection pooling for HTTP requests

## Security

- API keys loaded from environment variables
- No sensitive data logged
- Secure defaults for all providers
- Custom headers for authentication flexibility

## Development

Run examples:
```bash
npm run example:multi-model
```

Run tests:
```bash
npm test adapters/
```

## Troubleshooting

Common issues:

1. **Provider not found**: Check adapter registration
2. **Authentication failed**: Verify API keys and permissions
3. **Model not available**: Check provider model lists
4. **Rate limits**: Implement retry logic or use fallbacks
5. **Custom endpoint issues**: Verify URL and response format

For more examples, see `examples/multiModelExample.ts`.