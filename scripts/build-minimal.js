/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 最小化构建脚本 - 只构建打包所需的包
 * 
 * 对于 fuxi-cli 打包，只需要：
 * - packages/core (核心逻辑)
 * - packages/cli (CLI 界面)
 * - bundle/ (通过 esbuild 打包)
 * 
 * 不需要：
 * - packages/a2a-server (除非需要)
 * - packages/test-utils (测试工具)
 * - packages/vscode-ide-companion (VSCode 扩展)
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// 检查 node_modules
const nodeModulesPath = join(root, 'node_modules');
if (!existsSync(nodeModulesPath)) {
  console.log('node_modules not found, running npm install...');
  process.env.NPM_CONFIG_PROGRESS = 'true';
  process.env.NPM_CONFIG_LOGLEVEL = 'info';
  execSync('npm install', { stdio: 'inherit', cwd: root });
  console.log('npm install completed successfully.');
}

// 1. 生成 git commit 信息
console.log('📦 Running npm run generate...');
execSync('npm run generate', { stdio: 'inherit', cwd: root });

// 2. 打包 bundle（esbuild 直接从 TypeScript 源码打包，包含 core 和 cli）
// 注意：esbuild 会从 packages/cli/index.ts 开始，自动包含所有依赖（包括 core）
console.log('📦 Bundling with esbuild (CLI only, skipping a2a-server)...');
execSync('node scripts/esbuild-minimal.js', { stdio: 'inherit', cwd: root });

// 3. 复制 bundle 资源
console.log('📋 Copying bundle assets...');
execSync('node scripts/copy_bundle_assets.js', { stdio: 'inherit', cwd: root });

console.log('✅ Minimal build completed!');
console.log('📁 Bundle location: bundle/fuxi-cli.js');

