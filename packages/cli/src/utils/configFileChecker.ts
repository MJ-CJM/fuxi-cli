/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { Storage } from '@google/gemini-cli-core';

const GEMINI_DIR = '.gemini';
const CONFIG_FILENAME = 'config.json';
const SETTINGS_FILENAME = 'settings.json';

export interface ConfigFilesCheckResult {
  allExist: boolean;
  missingFiles: string[];
  errorMessage: string | null;
}

/**
 * Check if required configuration files exist
 * @returns Check result with missing files and error message
 */
export function checkRequiredConfigFiles(): ConfigFilesCheckResult {
  const missingFiles: string[] = [];

  // Check config.json in ~/.gemini/
  const configPath = path.join(os.homedir(), GEMINI_DIR, CONFIG_FILENAME);
  if (!fs.existsSync(configPath)) {
    missingFiles.push(configPath);
  }

  // Check settings.json - check both user and workspace locations
  const userSettingsPath = Storage.getGlobalSettingsPath();
  const workspaceSettingsPath = path.join(process.cwd(), GEMINI_DIR, SETTINGS_FILENAME);

  const userSettingsExists = fs.existsSync(userSettingsPath);
  const workspaceSettingsExists = fs.existsSync(workspaceSettingsPath);

  if (!userSettingsExists && !workspaceSettingsExists) {
    missingFiles.push(userSettingsPath);
  }

  if (missingFiles.length === 0) {
    return {
      allExist: true,
      missingFiles: [],
      errorMessage: null,
    };
  }

  // Generate detailed error message
  const errorMessage = generateConfigErrorMessage(missingFiles, configPath, userSettingsPath);

  return {
    allExist: false,
    missingFiles,
    errorMessage,
  };
}

/**
 * Generate a detailed error message with configuration instructions
 */
function generateConfigErrorMessage(
  missingFiles: string[],
  configPath: string,
  settingsPath: string,
): string {
  const lines: string[] = [];

  lines.push('⚠️  Required configuration files are missing');
  lines.push('');
  lines.push('This project requires custom model configuration files to be set up.');
  lines.push('');

  // Missing files section
  lines.push('Missing files:');
  missingFiles.forEach(file => {
    lines.push(`  • ${file}`);
  });
  lines.push('');

  // Configuration instructions
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push('📁 Configuration File Paths:');
  lines.push('');
  lines.push(`  config.json:   ${configPath}`);
  lines.push(`  settings.json: ${settingsPath}`);
  lines.push('');

  // Required fields for config.json
  lines.push('📝 Required Fields in config.json:');
  lines.push('');
  lines.push('  {');
  lines.push('    "models": {');
  lines.push('      "your-model-name": {');
  lines.push('        "provider": "custom|openai|gemini|claude|qwen",');
  lines.push('        "model": "model-identifier",');
  lines.push('        "apiKey": "your-api-key",');
  lines.push('        "baseUrl": "https://api.example.com"');
  lines.push('      }');
  lines.push('    },');
  lines.push('    "defaultModel": "your-model-name"');
  lines.push('  }');
  lines.push('');

  // Required fields for settings.json
  lines.push('📝 Required Fields in settings.json:');
  lines.push('');
  lines.push('  {');
  lines.push('    "experimental": {');
  lines.push('      "useModelRouter": true');
  lines.push('    },');
  lines.push('    "security": {');
  lines.push('      "auth": {');
  lines.push('        "selectedType": "USE_CUSTOM"');
  lines.push('      }');
  lines.push('    }');
  lines.push('  }');
  lines.push('');

  // Example configuration
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push('📄 Complete Configuration Example:');
  lines.push('');
  lines.push('config.json:');
  lines.push('  {');
  lines.push('    "models": {');
  lines.push('      "my-custom-model": {');
  lines.push('        "provider": "openai",');
  lines.push('        "model": "gpt-4",');
  lines.push('        "apiKey": "sk-...",');
  lines.push('        "baseUrl": "https://api.openai.com/v1"');
  lines.push('      }');
  lines.push('    },');
  lines.push('    "defaultModel": "my-custom-model"');
  lines.push('  }');
  lines.push('');
  lines.push('settings.json:');
  lines.push('  {');
  lines.push('    "experimental": {');
  lines.push('      "useModelRouter": true');
  lines.push('    },');
  lines.push('    "security": {');
  lines.push('      "auth": {');
  lines.push('        "selectedType": "USE_CUSTOM"');
  lines.push('      }');
  lines.push('    },');
  lines.push('    "model": {');
  lines.push('      "name": "my-custom-model"');
  lines.push('    }');
  lines.push('  }');
  lines.push('');

  // Documentation link
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push('📚 Documentation:');
  lines.push('');
  lines.push('  For detailed configuration guide, please refer to:');
  lines.push('  https://github.com/google-gemini/gemini-cli/blob/main/docs/configuration.md');
  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push('Please create the required configuration files and try again.');
  lines.push('');

  return lines.join('\n');
}
