# 构建和打包优化指南

## 问题分析

原始构建流程存在以下冗余：

1. **构建了不必要的包**：
   - `packages/a2a-server` - 除非需要 A2A 服务器功能
   - `packages/test-utils` - 测试工具，打包时不需要
   - `packages/vscode-ide-companion` - VSCode 扩展，打包时不需要

2. **依赖下载问题**：
   - `package.json` 中声明了 `dependencies`，但 esbuild 已将依赖打包进 `bundle/fuxi-cli.js`
   - 安装 `.tgz` 包时，npm 仍会尝试从网络下载这些依赖，导致超时

## 优化方案

### 1. 最小化构建（`build:minimal`）

只构建打包所需的包，跳过不必要的 workspace：

```bash
npm run build:minimal
```

**优化点**：
- ✅ 只打包 CLI（跳过 a2a-server）
- ✅ 直接从 TypeScript 源码打包（无需先构建 dist）
- ✅ 跳过 test-utils 和 vscode-ide-companion

**对比**：
- 原流程：构建所有 5 个 workspace（core, cli, a2a-server, test-utils, vscode-ide-companion）
- 优化后：只打包 CLI（esbuild 自动包含 core）

### 2. 优化打包（`pack:optimized`）

一键完成构建、清理依赖、打包、恢复：

```bash
npm run pack:optimized
```

**流程**：
1. `build:minimal` - 最小化构建
2. `pack:prepare` - 清理 package.json 中的 dependencies
3. `npm pack` - 打包
4. `pack:restore` - 恢复原始 package.json

**效果**：
- ✅ 打包时不会尝试下载已打包的依赖
- ✅ 只保留 `optionalDependencies`（node-pty，因为它是 external）

## 使用指南

### 方式一：优化打包（推荐）

```bash
# 一键完成：构建 + 清理依赖 + 打包 + 恢复
npm run pack:optimized

# 生成文件：fuxi-cli-1.0.0.tgz
# 安装：
npm install -g ./fuxi-cli-1.0.0.tgz
```

### 方式二：手动步骤

```bash
# 1. 最小化构建
npm run build:minimal

# 2. 准备打包（清理依赖）
npm run pack:prepare

# 3. 打包
npm pack

# 4. 恢复 package.json
npm run pack:restore

# 5. 安装
npm install -g ./fuxi-cli-1.0.0.tgz
```

### 方式三：仅构建（不打包）

```bash
# 只构建，不打包
npm run build:minimal
```

## 性能对比

### 构建时间

| 方式 | 构建的包 | 预计时间 |
|------|---------|---------|
| `npm run build` | 所有 5 个 workspace | ~2-3 分钟 |
| `npm run build:minimal` | 只打包 CLI | ~30-60 秒 |

### 打包大小

| 方式 | package.json dependencies | 安装时网络请求 |
|------|--------------------------|---------------|
| `npm pack`（原） | 包含所有依赖 | 会尝试下载 |
| `npm run pack:optimized` | 已清理 | 只下载 node-pty（可选） |

## 脚本说明

### `build-minimal.js`
- 最小化构建脚本
- 只打包 CLI，跳过 a2a-server、test-utils、vscode-ide-companion

### `esbuild-minimal.js`
- 优化的 esbuild 配置
- 只打包 CLI，不构建 a2a-server

### `prepare-for-pack.js`
- 打包前准备
- 清理 `dependencies` 和 `devDependencies`
- 保留 `optionalDependencies`（node-pty）

### `restore-package.js`
- 恢复原始 package.json
- 从备份文件恢复

## 注意事项

1. **备份文件**：`prepare-for-pack.js` 会创建 `package.json.backup`
2. **Git 状态**：如果使用 Git，建议在打包前提交更改，避免误提交修改后的 package.json
3. **依赖清理**：清理后的 package.json 只用于打包，不影响开发

## 故障排查

### 问题：打包后安装时仍尝试下载依赖

**原因**：`pack:prepare` 未执行或失败

**解决**：
```bash
# 检查 package.json.backup 是否存在
ls -la package.json.backup

# 手动执行准备
npm run pack:prepare
npm pack
npm run pack:restore
```

### 问题：构建失败

**原因**：可能缺少依赖

**解决**：
```bash
# 清理并重新安装
npm run clean
npm install
npm run build:minimal
```

## 总结

通过优化：
- ✅ **构建时间减少 50-70%**（跳过不必要的包）
- ✅ **打包大小不变**（依赖已打包进 bundle）
- ✅ **安装速度提升**（无需下载已打包的依赖）
- ✅ **网络依赖减少**（只下载 node-pty，可选）


