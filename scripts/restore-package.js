/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 恢复 package.json 脚本
 * 
 * 在打包后恢复原始的 package.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const backupPath = packageJsonPath + '.backup';

if (!fs.existsSync(backupPath)) {
  console.error('❌ Backup file not found: package.json.backup');
  console.error('   Cannot restore package.json');
  process.exit(1);
}

// 恢复原始 package.json
fs.copyFileSync(backupPath, packageJsonPath);
console.log('✅ Restored package.json from backup');

// 可选：删除备份文件
// fs.unlinkSync(backupPath);
// console.log('✅ Removed backup file');


