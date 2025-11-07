/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 打包前准备脚本
 * 
 * 功能：
 * 1. 清理 package.json 中的 dependencies（已通过 esbuild 打包）
 * 2. 只保留 optionalDependencies（node-pty 是 external，需要单独安装）
 * 3. 备份原始 package.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');

// 读取原始 package.json
const originalPackageJson = JSON.parse(
  fs.readFileSync(packageJsonPath, 'utf-8')
);

// 备份原始 package.json
const backupPath = packageJsonPath + '.backup';
if (fs.existsSync(backupPath)) {
  console.log('⚠️  Backup file already exists, overwriting...');
}
fs.copyFileSync(packageJsonPath, backupPath);
console.log('✅ Backed up package.json to package.json.backup');

// 创建生产版 package.json
// 移除已打包的依赖（esbuild 已将所有依赖打包进 bundle/fuxi-cli.js）
// 只保留 optionalDependencies（node-pty 是 external，需要单独安装）
const productionPackageJson = {
  ...originalPackageJson,
  dependencies: {}, // 清空，因为已打包
  devDependencies: {}, // 清空，不需要
  // 保留 optionalDependencies（node-pty 相关）
  optionalDependencies: originalPackageJson.optionalDependencies || {},
};

// 保存生产版 package.json
fs.writeFileSync(
  packageJsonPath,
  JSON.stringify(productionPackageJson, null, 2),
  'utf-8'
);

console.log('✅ Prepared package.json for packing');
console.log('   - Removed dependencies (already bundled)');
console.log('   - Removed devDependencies');
console.log('   - Kept optionalDependencies (node-pty)');


