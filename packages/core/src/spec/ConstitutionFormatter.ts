/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Constitution } from './types.js';

/**
 * Format Constitution for AI consumption
 * 
 * Converts a Constitution object into a structured, AI-readable text format
 * that can be included in tool responses (llmContent) to provide context
 * for AI decision-making.
 * 
 * @param constitution - The Constitution object to format
 * @param format - 'full' for complete content, 'summary' for brief overview
 * @returns Formatted Constitution text
 */
export function formatConstitutionForAI(
  constitution: Constitution,
  format: 'full' | 'summary' = 'full'
): string {
  if (format === 'summary') {
    return formatConstitutionSummary(constitution);
  }

  let output = `[Constitution Context - Version ${constitution.version}]\n\n`;

  // Core Engineering Principles
  if (constitution.principles && constitution.principles.length > 0) {
    output += `**Core Engineering Principles:**\n`;
    constitution.principles.forEach((principle, index) => {
      output += `${index + 1}. ${principle}\n`;
    });
    output += '\n';
  }

  // Technical Constraints
  if (constitution.constraints && constitution.constraints.length > 0) {
    output += `**Technical Constraints:**\n`;
    constitution.constraints.forEach((constraint, index) => {
      output += `${index + 1}. ${constraint}\n`;
    });
    output += '\n';
  }

  // Quality Standards
  if (constitution.qualityStandards) {
    output += `**Quality Standards:**\n`;
    if (constitution.qualityStandards.testing) {
      output += `- **Testing**: ${constitution.qualityStandards.testing}\n`;
    }
    if (constitution.qualityStandards.security) {
      output += `- **Security**: ${constitution.qualityStandards.security}\n`;
    }
    if (constitution.qualityStandards.performance) {
      output += `- **Performance**: ${constitution.qualityStandards.performance}\n`;
    }
    if (constitution.qualityStandards.accessibility) {
      output += `- **Accessibility**: ${constitution.qualityStandards.accessibility}\n`;
    }
    output += '\n';
  }

  // Architecture Guidelines
  if (constitution.architectureGuidelines && constitution.architectureGuidelines.length > 0) {
    output += `**Architecture Guidelines:**\n`;
    constitution.architectureGuidelines.forEach((guideline, index) => {
      output += `${index + 1}. ${guideline}\n`;
    });
    output += '\n';
  }

  // Coding Standards
  if (constitution.codingStandards && constitution.codingStandards.length > 0) {
    output += `**Coding Standards:**\n`;
    constitution.codingStandards.forEach((standard, index) => {
      output += `${index + 1}. ${standard}\n`;
    });
    output += '\n';
  }

  return output.trim();
}

/**
 * Format Constitution summary for brief context
 * 
 * Provides a condensed version of the Constitution for use in tool descriptions
 * or when full content would be too verbose.
 * 
 * @param constitution - The Constitution object to format
 * @returns Formatted Constitution summary text
 */
export function formatConstitutionSummary(constitution: Constitution): string {
  let output = `[Constitution v${constitution.version}] `;
  
  const parts: string[] = [];
  
  if (constitution.principles && constitution.principles.length > 0) {
    parts.push(`${constitution.principles.length} principles`);
  }
  
  if (constitution.constraints && constitution.constraints.length > 0) {
    parts.push(`${constitution.constraints.length} constraints`);
  }
  
  if (constitution.architectureGuidelines && constitution.architectureGuidelines.length > 0) {
    parts.push(`${constitution.architectureGuidelines.length} architecture guidelines`);
  }
  
  if (constitution.codingStandards && constitution.codingStandards.length > 0) {
    parts.push(`${constitution.codingStandards.length} coding standards`);
  }
  
  output += parts.join(', ');
  
  return output;
}

