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

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { glob } from 'glob';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const bundleDir = join(root, 'bundle');

// Create the bundle directory if it doesn't exist
if (!existsSync(bundleDir)) {
  mkdirSync(bundleDir);
}

// Find and copy all .sb files from packages to the root of the bundle directory
const sbFiles = glob.sync('packages/**/*.sb', { cwd: root });
for (const file of sbFiles) {
  copyFileSync(join(root, file), join(bundleDir, basename(file)));
}

// Fix the shebang in the main bundle file to suppress deprecation warnings
const bundleFile = join(bundleDir, 'fuxi-cli.js');
if (existsSync(bundleFile)) {
  const content = readFileSync(bundleFile, 'utf-8');
  const fixedContent = content.replace(
    /^#!\/usr\/bin\/env node/,
    '#!/usr/bin/env -S node --no-deprecation'
  );
  if (content !== fixedContent) {
    writeFileSync(bundleFile, fixedContent, 'utf-8');
    console.log('Fixed shebang in fuxi-cli.js to suppress deprecation warnings');
  }
}

// Create wrapper script to suppress deprecation warnings when using node command
const wrapperFile = join(bundleDir, 'fuxi-cli-wrapper.js');
const wrapperContent = `#!/usr/bin/env node

/**
 * @license
 * Copyright 2025 Fuxi CLI
 * SPDX-License-Identifier: Apache-2.0
 */

// Set Node options to suppress deprecation warnings
process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (warning.name === 'DeprecationWarning') {
    return; // Suppress deprecation warnings
  }
  console.warn(warning);
});

// Import and run the main CLI
await import('./fuxi-cli.js');
`;
writeFileSync(wrapperFile, wrapperContent, 'utf-8');
chmodSync(wrapperFile, 0o755); // Make executable
console.log('Created fuxi-cli-wrapper.js');

console.log('Assets copied to bundle/');
