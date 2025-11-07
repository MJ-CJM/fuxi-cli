/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 最小化 esbuild 配置 - 只打包 CLI，跳过 a2a-server
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';

let esbuild;
try {
  esbuild = (await import('esbuild')).default;
} catch (_error) {
  console.warn('esbuild not available, skipping bundle step');
  process.exit(0);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const pkg = require(path.resolve(__dirname, '..', 'package.json'));

const external = [
  '@lydell/node-pty',
  'node-pty',
  '@lydell/node-pty-darwin-arm64',
  '@lydell/node-pty-darwin-x64',
  '@lydell/node-pty-linux-x64',
  '@lydell/node-pty-win32-arm64',
  '@lydell/node-pty-win32-x64',
];

const cliConfig = {
  bundle: true,
  platform: 'node',
  format: 'esm',
  external,
  loader: { '.node': 'file' },
  write: true,
  banner: {
    js: `const { createRequire: __createRequire } = await import('module'); const require = __createRequire(import.meta.url); globalThis.__filename = require('url').fileURLToPath(import.meta.url); globalThis.__dirname = require('path').dirname(globalThis.__filename);`,
  },
  entryPoints: ['packages/cli/index.ts'],
  outfile: 'bundle/fuxi-cli.js',
  define: {
    'process.env.CLI_VERSION': JSON.stringify(pkg.version),
  },
  alias: {
    'is-in-ci': path.resolve(__dirname, '..', 'packages/cli/src/patches/is-in-ci.ts'),
  },
  metafile: true,
};

try {
  const { metafile } = await esbuild.build(cliConfig);
  if (process.env.DEV === 'true') {
    writeFileSync('./bundle/esbuild.json', JSON.stringify(metafile, null, 2));
  }
  console.log('✅ Bundle created: bundle/fuxi-cli.js');
} catch (error) {
  console.error('❌ Bundle failed:', error);
  process.exit(1);
}


