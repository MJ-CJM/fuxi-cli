# Docker 开发环境

本文档介绍如何使用 Docker 容器进行 Fuxi CLI 的开发工作。

## 概述

Docker 开发环境提供了一个完整的编译环境，包含所有必要的构建工具。代码通过 volume 映射到容器内，编译产物直接输出到本地文件系统，方便在本地使用。

**重要提示**：
- 对于非交互式命令（如 `npm install`、`npm run build`），使用 `docker run --rm` 而不是 `docker run -it --rm`
- `-it` 标志会分配交互式 TTY，可能导致输出缓冲问题，让构建过程看起来卡住
- 只有在需要交互式 shell（如 `/bin/bash`）时才使用 `-it`

## 快速开始

### 1. 构建开发镜像

```bash
docker build -f Dockerfile.dev -t fuxi-cli-dev .
```

### 2. 安装依赖

**重要**：如果本地已经安装了 node_modules（在 macOS/Windows 上），需要先删除，然后在容器内重新安装：

```bash
# 删除本地 node_modules（如果存在）
rm -rf node_modules

# 在容器内安装依赖（确保使用 Linux 版本的二进制文件）
# 注意：使用 --rm 而不是 -it，避免交互式终端导致的卡住问题
docker run --rm \
  -v $(pwd):/workspace \
  -w /workspace \
  fuxi-cli-dev \
  npm install
```

或者使用 `npm ci` 确保使用锁定的依赖版本：

```bash
# 删除本地 node_modules
rm -rf node_modules

# 在容器内使用 npm ci
docker run --rm \
  -v $(pwd):/workspace \
  -w /workspace \
  fuxi-cli-dev \
  npm ci
```

### 3. 构建项目

```bash
# 注意：使用 --rm 而不是 -it，避免交互式终端导致的卡住问题
docker run --rm \
  -v $(pwd):/workspace \
  -w /workspace \
  fuxi-cli-dev \
  npm run build
```

### 4. 进入容器进行开发

```bash
# 进入容器 shell（需要使用 -it 进行交互）
docker run -it --rm \
  -v $(pwd):/workspace \
  -w /workspace \
  fuxi-cli-dev \
  /bin/bash
```

进入容器后，你可以执行任何 npm 命令：

```bash
# 在容器内
npm run build
npm test
npm run lint
npm run typecheck
```

## 常用命令

### 构建项目

```bash
docker run --rm \
  -v $(pwd):/workspace \
  -w /workspace \
  fuxi-cli-dev \
  npm run build
```

### 运行测试

```bash
docker run --rm \
  -v $(pwd):/workspace \
  -w /workspace \
  fuxi-cli-dev \
  npm test
```

### 代码检查

```bash
docker run --rm \
  -v $(pwd):/workspace \
  -w /workspace \
  fuxi-cli-dev \
  npm run lint
```

### 类型检查

```bash
docker run --rm \
  -v $(pwd):/workspace \
  -w /workspace \
  fuxi-cli-dev \
  npm run typecheck
```

### 完整预检

```bash
docker run --rm \
  -v $(pwd):/workspace \
  -w /workspace \
  fuxi-cli-dev \
  npm run preflight
```

## 环境变量

如果需要传递环境变量（如 API Keys），使用 `-e` 参数：

```bash
docker run --rm \
  -v $(pwd):/workspace \
  -w /workspace \
  -e GEMINI_API_KEY="your-key" \
  -e OPENAI_API_KEY="your-key" \
  fuxi-cli-dev \
  npm start
```

或者使用 `.env` 文件：

```bash
docker run --rm \
  -v $(pwd):/workspace \
  -w /workspace \
  --env-file .env \
  fuxi-cli-dev \
  npm start
```

## 使用别名简化命令

为了简化命令，可以在 `~/.bashrc` 或 `~/.zshrc` 中添加别名：

```bash
# 添加别名（非交互式命令使用 --rm，交互式命令使用 -it）
alias fuxi-dev='docker run --rm -v $(pwd):/workspace -w /workspace fuxi-cli-dev'
alias fuxi-dev-shell='docker run -it --rm -v $(pwd):/workspace -w /workspace fuxi-cli-dev /bin/bash'

# 使用示例（非交互式命令）
fuxi-dev npm install
fuxi-dev npm run build
fuxi-dev npm test

# 进入交互式 shell
fuxi-dev-shell
```

## 工作流程示例

### 完整的开发流程

```bash
# 1. 构建镜像（首次或 Dockerfile 更新后）
docker build -f Dockerfile.dev -t fuxi-cli-dev .

# 2. 安装依赖（使用 --rm 而不是 -it，避免交互式终端问题）
docker run --rm -v $(pwd):/workspace -w /workspace fuxi-cli-dev npm install

# 3. 构建项目（使用 --rm 而不是 -it）
docker run --rm -v $(pwd):/workspace -w /workspace fuxi-cli-dev npm run build

# 4. 编译产物在本地 bundle/ 目录
ls bundle/

# 5. 本地可以直接使用编译产物
node bundle/fuxi-cli.js --help
```

### 持续开发

```bash
# 进入容器进行开发
docker run -it --rm -v $(pwd):/workspace -w /workspace fuxi-cli-dev /bin/bash

# 在容器内
npm run build -- --watch  # 监听模式构建

# 在另一个终端，本地编辑代码
# 代码更改会自动触发容器内的重新构建
```

## Volume 映射说明

- **源代码目录** (`$(pwd)`) 映射到容器的 `/workspace`
- **编译产物**（如 `bundle/`、`dist/`）直接输出到本地目录
- **node_modules** 必须在容器内安装，因为包含平台特定的二进制文件（如 esbuild）
  - 如果本地已存在 node_modules（macOS/Windows 安装），需要先删除
  - 容器内安装的 node_modules 会同步到本地，但应避免在本地使用

## 故障排除

### 权限问题

如果遇到权限问题，确保容器内的 `node` 用户有权限写入映射的目录。可以检查：

```bash
# 检查本地目录权限
ls -la

# 如果 node_modules 有权限问题，可以在容器内修复
docker run --rm -v $(pwd):/workspace -w /workspace fuxi-cli-dev chown -R node:node /workspace
```

### node_modules 平台不匹配（esbuild 错误）

**错误信息**：`You installed esbuild for another platform than the one you're currently using`

**原因**：在 macOS/Windows 上安装的依赖包含平台特定的二进制文件（如 esbuild），无法在 Linux 容器内使用。

**解决方案**：

```bash
# 1. 删除本地 node_modules（包含平台特定的二进制文件）
rm -rf node_modules

# 2. 在容器内重新安装（使用 Linux 版本的二进制文件）
docker run --rm -v $(pwd):/workspace -w /workspace fuxi-cli-dev npm install

# 或者使用 npm ci（推荐，更可靠）
docker run --rm -v $(pwd):/workspace -w /workspace fuxi-cli-dev npm ci
```

**预防措施**：
- 如果本地已经安装了 node_modules，建议在 `.gitignore` 中确保 node_modules 不被提交
- 在容器内进行所有依赖安装和构建操作
- 本地只保留源代码，不保留 node_modules

### 构建过程卡住

**症状**：构建过程卡在 `node scripts/build.js` 或 `npm run generate`

**可能原因**：
1. Git 命令超时（已修复，添加了 5 秒超时）
2. 脚本中的异步操作问题（已修复）

**解决方案**：
- 如果构建卡住，按 `Ctrl+C` 取消，然后重新运行
- 确保 `.git` 目录已映射到容器内（默认已通过 volume 映射）
- 如果问题持续，可以尝试清理后重新构建：

```bash
# 清理构建产物
docker run --rm -v $(pwd):/workspace -w /workspace fuxi-cli-dev npm run clean

# 重新构建
docker run --rm -v $(pwd):/workspace -w /workspace fuxi-cli-dev npm run build
```

### npm workspace 符号链接冲突

**错误信息**：`EEXIST: file already exists, symlink` 或 `npm error path ../packages/vscode-ide-companion`

**原因**：node_modules 中的 workspace 符号链接损坏或冲突，通常发生在：
- 跨平台开发（macOS/Windows 本地 node_modules 映射到 Linux 容器）
- 不完整的 npm install
- 文件系统权限问题

**解决方案**：

```bash
# 方案 1：清理后重新安装（推荐）
docker run --rm -v $(pwd):/workspace -w /workspace fuxi-cli-dev npm run clean
docker run --rm -v $(pwd):/workspace -w /workspace fuxi-cli-dev npm install

# 方案 2：手动删除 node_modules 后重新安装
rm -rf node_modules
docker run --rm -v $(pwd):/workspace -w /workspace fuxi-cli-dev npm install

# 方案 3：使用 --force 强制重新安装（如果方案 1 和 2 都不行）
docker run --rm -v $(pwd):/workspace -w /workspace fuxi-cli-dev npm install --force
```

**预防措施**：
- 确保在容器内安装依赖，不要混合使用本地和容器内的 node_modules
- 如果本地已有 node_modules，在构建前先删除：`rm -rf node_modules`

### 缓存问题

如果遇到奇怪的构建错误，可以清理缓存：

```bash
docker run --rm -v $(pwd):/workspace -w /workspace fuxi-cli-dev npm run clean
docker run --rm -v $(pwd):/workspace -w /workspace fuxi-cli-dev npm install
```

## 优势

1. **环境一致性**：所有开发者使用相同的编译环境
2. **无需本地安装**：不需要在本地安装 Node.js、npm 等工具
3. **隔离性**：不污染本地系统环境
4. **快速开始**：克隆仓库后即可开始开发
5. **CI/CD 兼容**：可以用于 CI/CD 流程

## 注意事项

- 首次构建镜像可能需要一些时间
- `node_modules` 的安装和同步可能需要一些时间
- 确保有足够的磁盘空间用于镜像和容器
- 在 macOS 和 Windows 上，Docker Desktop 的性能可能不如 Linux 原生 Docker

