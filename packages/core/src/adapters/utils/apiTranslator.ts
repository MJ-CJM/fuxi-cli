/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  UnifiedRequest,
  UnifiedResponse,
  UnifiedMessage,
  ContentPart,
  ToolDefinition
} from '../base/index.js';

import {
  MessageRole
} from '../base/index.js';

/**
 * Utility class for translating between different API formats
 */
export class APITranslator {
  /**
   * Convert Gemini Content format to UnifiedMessage
   */
  static geminiContentToUnified(content: any): UnifiedMessage {
    const role = content.role === 'user' ? MessageRole.USER :
                 content.role === 'model' ? MessageRole.ASSISTANT :
                 MessageRole.SYSTEM;

    const parts: ContentPart[] = content.parts?.map((part: any) => {
      if (part.text) {
        return { type: 'text', text: part.text };
      }
      if (part.inlineData) {
        return {
          type: 'image',
          image: {
            data: part.inlineData.data,
            mimeType: part.inlineData.mimeType
          }
        };
      }
      if (part.functionCall) {
        return {
          type: 'function_call',
          functionCall: {
            name: part.functionCall.name,
            args: part.functionCall.args,
            id: part.functionCall.id,
          }
        };
      }
      if (part.functionResponse) {
        return {
          type: 'function_response',
          functionResponse: {
            name: part.functionResponse.name,
            content: part.functionResponse.response,
            id: part.functionResponse.id,
          }
        };
      }
      return { type: 'text', text: '' };
    }) || [];

    return { role, content: parts };
  }

  /**
   * Convert UnifiedMessage to Gemini Content format
   */
  static unifiedToGeminiContent(message: UnifiedMessage): any {
    const role = message.role === MessageRole.USER ? 'user' :
                 message.role === MessageRole.ASSISTANT ? 'model' :
                 'user'; // Default to user for system messages

    const parts = message.content
      .map(part => {
        switch (part.type) {
          case 'text':
            return typeof part.text === 'string' && part.text.trim().length > 0
              ? { text: part.text }
              : null;
          case 'image':
            return {
              inlineData: {
                data: part.image?.data,
                mimeType: part.image?.mimeType
              }
            };
          case 'function_call':
            return {
              functionCall: {
                name: part.functionCall?.name,
                args: part.functionCall?.args,
                id: part.functionCall?.id,
              }
            };
          case 'function_response':
            return {
              functionResponse: {
                name: part.functionResponse?.name,
                response: part.functionResponse?.content,
                id: part.functionResponse?.id,
              }
            };
          default:
            return null;
        }
      })
      .filter((part): part is Exclude<typeof part, null> => part !== null);

    return { role, parts };
  }

  /**
   * Convert OpenAI message format to UnifiedMessage
   */
  static openaiMessageToUnified(message: any): UnifiedMessage {
    const role = message.role === 'user' ? MessageRole.USER :
                 message.role === 'assistant' ? MessageRole.ASSISTANT :
                 message.role === 'system' ? MessageRole.SYSTEM :
                 MessageRole.FUNCTION;

    let content: ContentPart[];

    if (typeof message.content === 'string') {
      content = [{ type: 'text', text: message.content }];
    } else if (Array.isArray(message.content)) {
      content = message.content.map((part: any) => {
        if (part.type === 'text') {
          return { type: 'text', text: part.text };
        }
        if (part.type === 'image_url') {
          return {
            type: 'image',
            image: {
              data: part.image_url.url,
              mimeType: 'image/jpeg' // Default, should be detected
            }
          };
        }
        return { type: 'text', text: '' };
      });
    } else {
      content = [{ type: 'text', text: '' }];
    }

    // Handle function calls
    if (message.function_call) {
      content.push({
        type: 'function_call',
        functionCall: {
          name: message.function_call.name,
          args: this.parseFunctionArguments(message.function_call.arguments),
          id: message.function_call.id,
        }
      });
    }

    // Handle tool calls
    if (message.tool_calls) {
      for (const toolCall of message.tool_calls) {
        if (toolCall.type === 'function') {
          content.push({
            type: 'function_call',
            functionCall: {
              name: toolCall.function.name,
              args: this.parseFunctionArguments(toolCall.function.arguments),
              id: toolCall.id,
            }
          });
        }
      }
    }

    return { role, content };
  }

  /**
   * Convert UnifiedMessage to OpenAI message format
   * @param message The unified message to convert
   * @param supportsMultimodal Whether the target model supports multimodal (array) content format
   */
  static unifiedToOpenaiMessage(message: UnifiedMessage, supportsMultimodal: boolean = true): any {
    const role = message.role === MessageRole.USER ? 'user' :
                 message.role === MessageRole.ASSISTANT ? 'assistant' :
                 message.role === MessageRole.SYSTEM ? 'system' :
                 'function';

    const textParts = message.content.filter(part => part.type === 'text');
    const imageParts = message.content.filter(part => part.type === 'image');
    const functionCalls = message.content.filter(part => part.type === 'function_call');
    const functionResponses = message.content.filter(part => part.type === 'function_response');

    // Debug log for messages with multiple text parts
    if (textParts.length > 1 && process.env['DEBUG_MESSAGE_FORMAT']) {
      console.log('[DEBUG] Message with multiple text parts:', {
        role,
        textPartsCount: textParts.length,
        supportsMultimodal,
        firstText: textParts[0].text?.substring(0, 50)
      });
    }

    if (functionResponses.length > 0) {
      const primaryResponse = functionResponses[0].functionResponse;
      const fallbackText = textParts
        .map((part) => part.text || '')
        .filter(Boolean)
        .join('\n');

      let content = fallbackText;
      if (!content || content.length === 0) {
        const responsePayload = primaryResponse?.content ?? primaryResponse?.response;
        if (typeof responsePayload === 'string') {
          content = responsePayload;
        } else if (responsePayload && typeof responsePayload === 'object') {
          content = JSON.stringify(responsePayload);
        }
      }
      if (!content || content.length === 0) {
        content = 'Tool execution completed.';
      }

      return {
        role: 'tool',
        tool_call_id:
          primaryResponse?.id ||
          functionResponses[0].functionResponse?.name ||
          `tool_${Date.now()}`,
        name: primaryResponse?.name,
        content,
      };
    }

    // For models that don't support multimodal format, always use string content
    if (!supportsMultimodal) {
      // Combine all text parts into a single string
      const combinedText = textParts.map(part => part.text || '').join('\n').trim();

      const result: any = {
        role,
        content: combinedText || ''
      };

      // Add function calls as tool_calls
      if (functionCalls.length > 0) {
        result.tool_calls = functionCalls.map((part, index) => ({
          id: part.functionCall?.id || `call_${index}`,
          type: 'function',
          function: {
            name: part.functionCall?.name,
            arguments: JSON.stringify(part.functionCall?.args)
          }
        }));
      }

      // Debug: Log converted message
      if (process.env['DEBUG_MESSAGE_FORMAT']) {
        console.log('[DEBUG] Converted message (supportsMultimodal=false):', {
          role,
          contentType: typeof result.content,
          contentLength: result.content.length,
          hasToolCalls: !!result.tool_calls,
          textPartsCount: textParts.length,
          imageParts: imageParts.length,
          functionCalls: functionCalls.length,
          functionResponses: functionResponses.length
        });
      }

      return result;
    }

    // Simple text message
    if (textParts.length === 1 && imageParts.length === 0 && functionCalls.length === 0) {
      const result: any = {
        role,
        content: textParts[0].text
      };

      return result;
    }

    // Multimodal or complex message
    const content: any[] = [];

    // Add text parts
    for (const part of textParts) {
      if (typeof part.text === 'string' && part.text.trim().length === 0) {
        continue;
      }
      content.push({
        type: 'text',
        text: part.text
      });
    }

    // Add image parts
    for (const part of imageParts) {
      content.push({
        type: 'image_url',
        image_url: {
          url: part.image?.data
        }
      });
    }

    const result: any = { role, content };

    // Add function calls as tool_calls
    if (functionCalls.length > 0) {
      result.tool_calls = functionCalls.map((part, index) => ({
        id: part.functionCall?.id || `call_${index}`,
        type: 'function',
        function: {
          name: part.functionCall?.name,
          arguments: JSON.stringify(part.functionCall?.args)
        }
      }));
    }

    return result;
  }

  /**
   * Convert UnifiedRequest to OpenAI chat completion format
   * @param request The unified request
   * @param supportsMultimodal Whether the target model supports multimodal content format
   */
  static unifiedToOpenaiRequest(request: UnifiedRequest, supportsMultimodal: boolean = true): any {
    let messages = request.messages.map(msg => this.unifiedToOpenaiMessage(msg, supportsMultimodal));

    // Add system message if provided
    if (request.systemMessage) {
      messages.unshift({
        role: 'system',
        content: request.systemMessage
      });
    }

    // Debug: Log all messages when multimodal is disabled
    if (!supportsMultimodal && process.env['DEBUG_MESSAGE_FORMAT']) {
      console.log('[DEBUG] Converting request with supportsMultimodal=false');
      messages.forEach((msg, idx) => {
        console.log(`[DEBUG] Message ${idx}:`, {
          role: msg.role,
          contentType: typeof msg.content,
          isArray: Array.isArray(msg.content),
          hasToolCalls: !!msg.tool_calls,
          preview: typeof msg.content === 'string' ? msg.content.substring(0, 50) : 'array'
        });
      });
    }

    // Validate and fix tool_calls to ensure API compliance
    const originalCount = messages.length;
    messages = this.validateAndFixToolCalls(messages);
    
    if (process.env['DEBUG_MESSAGE_FORMAT'] && originalCount !== messages.length) {
      console.log('[DEBUG] Message validation:', {
        originalCount,
        validatedCount: messages.length,
        removed: originalCount - messages.length
      });
    }

    const result: any = {
      model: request.model,
      messages,
      stream: request.stream || false
    };

    if (request.maxTokens) {
      result.max_tokens = request.maxTokens;
    }

    if (request.temperature !== undefined) {
      result.temperature = request.temperature;
    }

    if (request.tools && request.tools.length > 0) {
      result.tools = request.tools.map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }
      }));

      // Add tool_choice if specified in request, otherwise don't set it
      // (some models don't support "auto" by default)
      if (request.toolChoice) {
        result.tool_choice = request.toolChoice;
      }
    }

    return result;
  }

  /**
   * Convert OpenAI response to UnifiedResponse
   */
  static openaiResponseToUnified(response: any): UnifiedResponse {
    const choice = response.choices?.[0];
    if (!choice) {
      return {
        content: [],
        finishReason: 'stop'
      };
    }

    const message = choice.message || choice.delta;
    const content: ContentPart[] = [];

    if (message.content) {
      content.push({
        type: 'text',
        text: message.content
      });
    }

    // Handle tool calls
    if (message.tool_calls) {
      for (const toolCall of message.tool_calls) {
        if (toolCall.function) {
          content.push({
            type: 'function_call',
            functionCall: {
              name: toolCall.function.name,
              args: this.parseFunctionArguments(toolCall.function.arguments),
              id: toolCall.id,
            }
          });
        }
      }
    }

    return {
      content,
      finishReason: choice.finish_reason || 'stop',
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens
      } : undefined,
      model: response.model
    };
  }

  /**
   * Convert Gemini tool definition to unified format
   */
  static geminiToolToUnified(tool: any): ToolDefinition {
    return {
      name: tool.function_declarations[0].name,
      description: tool.function_declarations[0].description,
      parameters: tool.function_declarations[0].parameters
    };
  }

  /**
   * Convert unified tool definition to Gemini format
   */
  static unifiedToGeminiTool(tool: ToolDefinition): any {
    return {
      function_declarations: [{
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }]
    };
  }

  /**
   * Parse function arguments with robust error handling
   */
  private static parseFunctionArguments(
    rawArguments?: string,
  ): Record<string, any> {
    if (!rawArguments || rawArguments.trim().length === 0) {
      return {};
    }

    try {
      return JSON.parse(rawArguments);
    } catch (initialError) {
      try {
        const repaired = this.repairJsonString(rawArguments);
        return JSON.parse(repaired);
      } catch (repairError) {
        console.warn(
          'Failed to parse function arguments; trying parameter extraction.',
          repairError,
        );

        return this.extractParametersFromMalformedJson(rawArguments);
      }
    }
  }

  /**
   * Extract parameters from malformed JSON using pattern matching
   */
  private static extractParametersFromMalformedJson(raw: string): Record<string, any> {
    const result: Record<string, any> = {};

    // Define parameter extraction patterns
    const parameterPatterns: Record<string, RegExp[]> = {
      file_path: [
        /(?:["']?file_path["']?\s*[:=]\s*["']([^"']*?)["'])/i,
        /(?:["']?file_path["']?\s*[:=]\s*([^,}\s]+))/i,
        /(?:file_path["']?\s*[:=]\s*["']?([^"',}]+))/i,
      ],
      content: [
        /(?:["']?content["']?\s*[:=]\s*["'])([\s\S]*?)(?:["'](?:\s*[,}]|$))/i,
        /(?:["']?content["']?\s*[:=]\s*)([\s\S]*?)(?=\s*(?:,\s*["']?\w+["']?\s*[:=]|$|}))/i,
      ],
      old_string: [
        /(?:["']?old_string["']?\s*[:=]\s*["'])([\s\S]*?)(?:["'](?:\s*[,}]|$))/i,
        /(?:["']?old_string["']?\s*[:=]\s*)([\s\S]*?)(?=\s*(?:,\s*["']?\w+["']?\s*[:=]|$|}))/i,
      ],
      new_string: [
        /(?:["']?new_string["']?\s*[:=]\s*["'])([\s\S]*?)(?:["'](?:\s*[,}]|$))/i,
        /(?:["']?new_string["']?\s*[:=]\s*)([\s\S]*?)(?=\s*(?:,\s*["']?\w+["']?\s*[:=]|$|}))/i,
      ],
    };

    // Extract each parameter using its patterns
    for (const [paramName, patterns] of Object.entries(parameterPatterns)) {
      for (const pattern of patterns) {
        const match = raw.match(pattern);
        if (match && match[1] && match[1].trim()) {
          let value = match[1].trim();
          // Clean up value - remove trailing quotes or brackets
          value = value.replace(/["'}]*$/, '').trim();
          if (value) {
            result[paramName] = value;
            break; // Found this parameter, move to next
          }
        }
      }
    }

    // Fallback: try generic key-value extraction if nothing found
    if (Object.keys(result).length === 0) {
      return this.fallbackParameterExtraction(raw);
    }

    return result;
  }

  /**
   * Final fallback: generic key-value extraction
   */
  private static fallbackParameterExtraction(raw: string): Record<string, any> {
    const result: Record<string, any> = {};
    const fallbackPattern = /(\w+)\s*[:=]\s*(.+?)(?=\s*,\s*\w+\s*[:=]|$)/g;

    let match;
    while ((match = fallbackPattern.exec(raw)) !== null) {
      const key = match[1].trim();
      let value = match[2].trim();

      // Clean up the value
      value = value.replace(/^["']|["']$/g, '').trim();
      value = value.replace(/[}]*$/, '').trim();

      // Only extract known tool parameters
      const allowedParams = ['file_path', 'content', 'old_string', 'new_string', 'command', 'pattern'];
      if (value && allowedParams.includes(key)) {
        result[key] = value;
      }
    }

    return result;
  }

  private static repairJsonString(raw: string): string {
    let inString = false;
    let isEscaped = false;
    let repaired = '';

    for (let i = 0; i < raw.length; i++) {
      const char = raw[i];

      if (inString) {
        if (isEscaped) {
          isEscaped = false;
          repaired += char;
          continue;
        }

        if (char === '\\') {
          isEscaped = true;
          repaired += char;
          continue;
        }

        if (char === '"') {
          inString = false;
          repaired += char;
          continue;
        }

        if (char === '\n') {
          repaired += '\\n';
          continue;
        }

        if (char === '\r') {
          repaired += '\\r';
          continue;
        }

        repaired += char;
        continue;
      }

      if (char === '"') {
        inString = true;
      }

      repaired += char;
    }

    return repaired;
  }

  /**
   * Validate and fix tool_calls in message history to ensure API compliance
   * OpenAI-compatible APIs require that every assistant message with tool_calls
   * must be followed by tool response messages for each tool_call_id
   */
  private static validateAndFixToolCalls(messages: any[]): any[] {
    const validatedMessages: any[] = [];
    const removedToolCallIds = new Set<string>(); // Track removed tool_call_ids
    
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      
      // Skip tool messages that correspond to removed tool_calls
      if (msg.role === 'tool' && msg.tool_call_id && removedToolCallIds.has(msg.tool_call_id)) {
        console.warn(
          `[APITranslator] Removing orphaned tool response at index ${i} for removed tool_call_id: ${msg.tool_call_id}`
        );
        continue;
      }
      
      // If this is an assistant message with tool_calls
      if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
        const toolCallIds = msg.tool_calls.map((tc: any) => tc.id);
        
        // Check if all tool_calls have corresponding responses
        const hasAllResponses = this.checkToolResponses(toolCallIds, messages, i + 1);
        
        if (!hasAllResponses) {
          // This assistant message has tool_calls without proper responses
          // We need to either skip it or strip the tool_calls
          console.warn(
            `[APITranslator] Removing incomplete tool_calls from assistant message at index ${i}. ` +
            `Tool call IDs: ${toolCallIds.join(', ')}`
          );
          
          // Mark these tool_call_ids as removed so we can skip corresponding tool responses
          toolCallIds.forEach((id: string) => removedToolCallIds.add(id));
          
          // Check if the message has meaningful text content
          let hasTextContent = false;
          if (msg.content) {
            if (typeof msg.content === 'string') {
              hasTextContent = msg.content.trim().length > 0;
            } else if (Array.isArray(msg.content)) {
              hasTextContent = msg.content.some((part: any) => 
                part.type === 'text' && part.text && part.text.trim().length > 0
              );
            }
          }
          
          // If the message has text content, preserve it without tool_calls
          if (hasTextContent) {
            const cleanedMsg: any = {
              role: 'assistant',
              content: msg.content
            };
            validatedMessages.push(cleanedMsg);
          }
          // If no content, skip this message entirely
          continue;
        }
      }
      
      validatedMessages.push(msg);
    }
    
    return validatedMessages;
  }

  /**
   * Check if all tool_call_ids have corresponding tool response messages
   * @param toolCallIds Array of tool call IDs to check
   * @param messages Full message array
   * @param startIndex Index to start searching from
   * @returns true if all tool calls have responses, false otherwise
   */
  private static checkToolResponses(
    toolCallIds: string[],
    messages: any[],
    startIndex: number
  ): boolean {
    const foundIds = new Set<string>();
    
    // Search through subsequent messages for tool responses
    for (let i = startIndex; i < messages.length; i++) {
      const msg = messages[i];
      
      // Stop searching if we encounter another assistant message
      // (tool responses must come immediately after the assistant message with tool_calls)
      if (msg.role === 'assistant') {
        break;
      }
      
      // Collect tool response IDs
      if (msg.role === 'tool' && msg.tool_call_id) {
        foundIds.add(msg.tool_call_id);
      }
    }
    
    // Check if all tool_call_ids have corresponding responses
    return toolCallIds.every(id => foundIds.has(id));
  }
}
