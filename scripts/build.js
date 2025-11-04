/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { execSync } from 'node:child_process';
import { existsSync, lstatSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// npm install if node_modules was removed (e.g. via npm run clean or scripts/clean.js)
// or if node_modules exists but might have issues (e.g., broken symlinks)
const nodeModulesPath = join(root, 'node_modules');
if (!existsSync(nodeModulesPath)) {
  console.log('node_modules not found, running npm install...');
  execSync('npm install', { stdio: 'inherit', cwd: root });
} else {
  // node_modules exists, but try to verify it's working
  // If npm install fails, it might be due to broken symlinks in workspaces
  try {
    // Try a quick check to see if workspaces are properly linked
    execSync('npm ls --workspaces --depth=0 > /dev/null 2>&1', {
      cwd: root,
      stdio: 'pipe',
    });
  } catch {
    // If npm ls fails, node_modules might be corrupted, try to fix it
    console.log('node_modules exists but may have issues, attempting to fix...');
    try {
      // Try npm install with --force to fix broken symlinks
      execSync('npm install --force', { stdio: 'inherit', cwd: root });
    } catch (error) {
      // If --force doesn't work, suggest cleaning
      console.error(
        'npm install failed. Please run "npm run clean" first, or manually remove node_modules and try again.',
      );
      throw error;
    }
  }
}

// build all workspaces/packages
console.log('Running npm run generate...');
execSync('npm run generate', { stdio: 'inherit', cwd: root });
console.log('Running npm run build --workspaces...');
execSync('npm run build --workspaces', { stdio: 'inherit', cwd: root });

// also build container image if sandboxing is enabled
// skip (-s) npm install + build since we did that above
try {
  execSync('node scripts/sandbox_command.js -q', {
    stdio: 'inherit',
    cwd: root,
  });
  if (
    process.env.BUILD_SANDBOX === '1' ||
    process.env.BUILD_SANDBOX === 'true'
  ) {
    execSync('node scripts/build_sandbox.js -s', {
      stdio: 'inherit',
      cwd: root,
    });
  }
} catch {
  // ignore
}
