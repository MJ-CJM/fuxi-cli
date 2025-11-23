/**
 * @license
 * Copyright 2025 Gemini CLI
 * SPDX-License-Identifier: MIT
 */

import type { AgentContext } from './types.js';
import type { UnifiedMessage } from '../adapters/base/types.js';

/**
 * Manages conversation contexts for agents
 *
 * Supports two modes:
 * - Isolated: Each agent has its own independent context
 * - Shared: Agent shares the main session context
 */
export class ContextManager {
  private contexts: Map<string, AgentContext> = new Map();
  private mainSessionContext: UnifiedMessage[] = []; // Initialize as empty array, not null

  /**
   * Set main session context (for shared mode)
   *
   * @param context - Main session conversation history
   */
  setMainSessionContext(context: UnifiedMessage[]): void {
    this.mainSessionContext = context;
  }

  /**
   * Get main session context
   *
   * @returns Main session conversation history
   */
  getMainSessionContext(): UnifiedMessage[] {
    return this.mainSessionContext; // Now guaranteed to be an array
  }

  /**
   * Get or create context for an agent
   *
   * @param agentName - Agent name
   * @param mode - Context mode (isolated or shared)
   * @returns Agent context
   */
  getContext(
    agentName: string,
    mode: 'isolated' | 'shared' = 'isolated'
  ): AgentContext {
    // Shared mode: return context that references main session
    if (mode === 'shared') {
      return this.getSharedContext(agentName);
    }

    // Isolated mode: return agent's own context
    let context = this.contexts.get(agentName);

    if (!context) {
      context = {
        agentName,
        conversationHistory: [],
        metadata: { mode: 'isolated' },
        createdAt: new Date(),
        lastAccessedAt: new Date(),
      };
      this.contexts.set(agentName, context);
    } else {
      // Update last accessed time
      context.lastAccessedAt = new Date();
    }

    return context;
  }

  /**
   * Get shared context for an agent
   *
   * @param agentName - Agent name
   * @returns Context that references main session
   */
  private getSharedContext(agentName: string): AgentContext {
    const sharedKey = `__shared__${agentName}`;
    let sharedContext = this.contexts.get(sharedKey);

    if (!sharedContext) {
      sharedContext = {
        agentName,
        conversationHistory: this.mainSessionContext, // Direct reference, no need for || []
        metadata: { mode: 'shared' },
        createdAt: new Date(),
        lastAccessedAt: new Date(),
      };
      this.contexts.set(sharedKey, sharedContext);
    } else {
      // Always update reference to latest main session context
      sharedContext.conversationHistory = this.mainSessionContext; // Direct reference
      sharedContext.lastAccessedAt = new Date();
    }

    return sharedContext;
  }

  /**
   * Add a message to agent's conversation history
   *
   * @param agentName - Agent name
   * @param message - Message to add
   * @param mode - Context mode
   */
  addMessage(
    agentName: string,
    message: UnifiedMessage,
    mode: 'isolated' | 'shared' = 'isolated'
  ): void {
    if (mode === 'shared') {
      // Shared mode: add to main session context
      // mainSessionContext is now guaranteed to be an array (initialized in constructor)
      this.mainSessionContext.push(message);
    } else {
      // Isolated mode: add to agent's own context
      const context = this.getContext(agentName, 'isolated');
      context.conversationHistory.push(message);
    }
  }

  /**
   * Add a hybrid mode summary to main session
   * Used by hybrid mode to write only the final summary to main session context
   *
   * @param agentName - Agent name
   * @param summary - Summary message to add
   */
  addHybridSummary(agentName: string, summary: UnifiedMessage): void {
    // Add special metadata to indicate this is a hybrid summary
    const annotatedSummary: UnifiedMessage = {
      ...summary,
      metadata: {
        ...summary.metadata,
        source: 'hybrid_agent',
        agentName,
        timestamp: new Date().toISOString(),
      }
    };

    // Get summary text for logging
    // const firstContent = summary.content[0];
    // const summaryText: string = (firstContent?.type === 'text' && firstContent.text) ? firstContent.text : '<non-text>';

    // Create clean preview (single line, no newlines)
    // const cleanText = summaryText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    // const previewLength = Math.min(150, cleanText.length);
    // const preview = cleanText.substring(0, previewLength) + (previewLength < cleanText.length ? '...' : '');

    // Log hybrid summary addition (always visible like Router/AgentExecutor logs)
    // console.error(`[HybridMode] Adding to main session: agent=${agentName}, length=${summaryText.length} chars, session: ${this.mainSessionContext.length} -> ${this.mainSessionContext.length + 1}`);
    // console.error(`[HybridMode] Summary preview: ${preview}`);

    this.mainSessionContext.push(annotatedSummary);
  }

  /**
   * Get conversation history for an agent
   *
   * @param agentName - Agent name
   * @param mode - Context mode
   * @returns Array of messages
   */
  getHistory(
    agentName: string,
    mode: 'isolated' | 'shared' = 'isolated'
  ): UnifiedMessage[] {
    const context = this.getContext(agentName, mode);
    return [...context.conversationHistory]; // Return copy to prevent mutation
  }

  /**
   * Get context mode for an agent
   *
   * @param agentName - Agent name
   * @returns Context mode
   */
  getContextMode(agentName: string): 'isolated' | 'shared' | null {
    const isolatedContext = this.contexts.get(agentName);
    if (isolatedContext?.metadata?.['mode'] === 'isolated') {
      return 'isolated';
    }

    const sharedContext = this.contexts.get(`__shared__${agentName}`);
    if (sharedContext?.metadata?.['mode'] === 'shared') {
      return 'shared';
    }

    return null;
  }

  /**
   * Clear conversation history for an agent
   *
   * @param agentName - Agent name
   */
  clearHistory(agentName: string): void {
    // Clear isolated context
    const isolatedContext = this.contexts.get(agentName);
    if (isolatedContext) {
      isolatedContext.conversationHistory = [];
      isolatedContext.lastAccessedAt = new Date();
    }

    // Clear shared context record (but not main session)
    const sharedKey = `__shared__${agentName}`;
    const sharedContext = this.contexts.get(sharedKey);
    if (sharedContext) {
      this.contexts.delete(sharedKey);
    }
  }

  /**
   * Set metadata for an agent's context
   *
   * @param agentName - Agent name
   * @param key - Metadata key
   * @param value - Metadata value
   */
  setMetadata(agentName: string, key: string, value: any): void {
    const context = this.getContext(agentName);
    context.metadata[key] = value;
  }

  /**
   * Get metadata from an agent's context
   *
   * @param agentName - Agent name
   * @param key - Metadata key
   * @returns Metadata value or undefined
   */
  getMetadata(agentName: string, key: string): any {
    const context = this.contexts.get(agentName);
    return context?.metadata[key];
  }

  /**
   * Check if an agent has an active context
   *
   * @param agentName - Agent name
   * @returns True if context exists
   */
  hasContext(agentName: string): boolean {
    return (
      this.contexts.has(agentName) ||
      this.contexts.has(`__shared__${agentName}`)
    );
  }

  /**
   * Delete an agent's context
   *
   * @param agentName - Agent name
   * @returns True if deleted, false if not found
   */
  deleteContext(agentName: string): boolean {
    const isolated = this.contexts.delete(agentName);
    const shared = this.contexts.delete(`__shared__${agentName}`);
    return isolated || shared;
  }

  /**
   * Get all active context names
   *
   * @returns Array of agent names with active contexts
   */
  getActiveAgents(): string[] {
    const agents = new Set<string>();
    for (const key of this.contexts.keys()) {
      if (key.startsWith('__shared__')) {
        agents.add(key.replace('__shared__', ''));
      } else {
        agents.add(key);
      }
    }
    return Array.from(agents);
  }

  /**
   * Get context statistics
   *
   * @param agentName - Agent name
   * @returns Context stats or null
   */
  getContextStats(agentName: string): {
    messageCount: number;
    createdAt: Date;
    lastAccessedAt: Date;
    durationMs: number;
    mode?: 'isolated' | 'shared';
  } | null {
    // Try isolated first
    let context = this.contexts.get(agentName);
    if (!context) {
      // Try shared
      context = this.contexts.get(`__shared__${agentName}`);
    }

    if (!context) {
      return null;
    }

    return {
      messageCount: context.conversationHistory.length,
      createdAt: context.createdAt,
      lastAccessedAt: context.lastAccessedAt,
      durationMs: context.lastAccessedAt.getTime() - context.createdAt.getTime(),
      mode: context.metadata?.['mode'] as 'isolated' | 'shared' | undefined,
    };
  }

  /**
   * Trim old contexts to prevent memory growth
   *
   * @param maxAge - Maximum age in milliseconds (default: 24 hours)
   * @returns Number of contexts deleted
   */
  trimOldContexts(maxAge: number = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let deleted = 0;

    for (const [agentName, context] of this.contexts.entries()) {
      const age = now - context.lastAccessedAt.getTime();
      if (age > maxAge) {
        this.contexts.delete(agentName);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Get total number of active contexts
   */
  getContextCount(): number {
    return this.contexts.size;
  }

  /**
   * Export context for persistence
   *
   * @param agentName - Agent name
   * @returns Serializable context or null
   */
  exportContext(agentName: string): AgentContext | null {
    const context = this.contexts.get(agentName);
    if (!context) {
      return null;
    }

    // Return a deep copy
    return JSON.parse(JSON.stringify(context));
  }

  /**
   * Import context from persistence
   *
   * @param context - Context to import
   */
  importContext(context: AgentContext): void {
    // Convert date strings back to Date objects
    const imported: AgentContext = {
      ...context,
      createdAt: new Date(context.createdAt),
      lastAccessedAt: new Date(context.lastAccessedAt),
    };

    this.contexts.set(context.agentName, imported);
  }

  /**
   * Clear all contexts
   */
  clearAll(): void {
    this.contexts.clear();
  }
}
