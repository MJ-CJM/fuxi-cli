# Docker 开发环境

本文档介绍如何使用 Docker 容器进行 Fuxi CLI 的开发工作。

## 概述

Docker 开发环境提供了两种部署方式：

### 方式 1：文件映射模式（当前默认，推荐用于开发）

**特点**：
- 代码通过 volume 映射到容器内，修改代码后无需重建镜像
- 编译产物直接输出到本地文件系统
- 适合开发和调试，支持热重载
- 容器只包含编译环境，不包含代码

**使用场景**：
- 日常开发
- 代码频繁修改
- 需要查看和调试编译产物

### 方式 2：完整打包模式（适合生产部署）

**特点**：
- 代码和依赖都打包到镜像中
- 镜像自包含，可独立运行
- 适合生产部署和分发
- 需要重新构建镜像才能更新代码

**使用场景**：
- 生产环境部署
- 镜像分发
- CI/CD 流水线

本文档主要介绍**方式 1（文件映射模式）**。如需完整打包，请参考下方的"完整打包模式"章节。

**关于依赖安装**：
- 容器已经包含了所有编译工具（Node.js、npm、构建工具等）
- 但 `node_modules` 不能打包到镜像中，因为：
  - 代码通过 volume 映射，依赖也应该在容器内安装
  - 避免跨平台问题（macOS/Windows 的 node_modules 不能在 Linux 容器内使用）
  - 镜像会更小，构建更快
- 首次运行 `npm run build` 时，会自动检测并安装依赖（可能需要几分钟）
- 依赖安装完成后会缓存在本地，后续构建会很快

**重要提示**：
- 对于非交互式命令（如 `npm install`、`npm run build`），使用 `docker run --rm` 而不是 `docker run -it --rm`
- `-it` 标志会分配交互式 TTY，可能导致输出缓冲问题，让构建过程看起来卡住
- 只有在需要交互式 shell（如 `/bin/bash`）时才使用 `-it`

## 快速开始

### 1. 构建开发镜像

```bash
docker build -f Dockerfile.dev -t fuxi-cli-dev .
```

### 2. 安装依赖（可选）

**注意**：如果直接运行 `npm run build`，构建脚本会自动检测并安装依赖。但如果你想单独安装依赖，可以：

```bash
# 删除本地 node_modules（如果存在，避免平台不匹配问题）
rm -rf node_modules

# 在容器内安装依赖（确保使用 Linux 版本的二进制文件）
# 注意：首次安装可能需要几分钟时间，请耐心等待
docker run --rm \
  -v $(pwd):/workspace \
  -w /workspace \
  fuxi-cli-dev \
  npm install
```

**或者**：直接运行构建，构建脚本会自动处理依赖安装：
```bash
docker run --rm \
  -v $(pwd):/workspace \
  -w /workspace \
  fuxi-cli-dev \
  npm run build
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

### 传递 API Keys 和其他配置

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

### 配置代理

如果需要在容器内使用代理访问外部网络（如 npm registry、API 服务等），可以通过环境变量传递：

#### 方法 1：运行时传递代理环境变量（推荐）

```bash
docker run --rm \
  -v $(pwd):/workspace \
  -w /workspace \
  -e HTTP_PROXY="http://proxy.example.com:8080" \
  -e HTTPS_PROXY="http://proxy.example.com:8080" \
  -e NO_PROXY="localhost,127.0.0.1" \
  fuxi-cli-dev \
  npm install
```

#### 方法 2：使用 .env 文件

在项目根目录创建 `.env` 文件：

```bash
# .env
HTTP_PROXY=http://proxy.example.com:8080
HTTPS_PROXY=http://proxy.example.com:8080
NO_PROXY=localhost,127.0.0.1
```

然后运行：

```bash
docker run --rm \
  -v $(pwd):/workspace \
  -w /workspace \
  --env-file .env \
  fuxi-cli-dev \
  npm install
```

#### 方法 3：在 Dockerfile 中设置（构建时）

如果需要所有容器都使用相同的代理，可以在 `Dockerfile.dev` 中取消注释代理配置部分：

```dockerfile
# 在 Dockerfile.dev 中
ARG HTTP_PROXY
ARG HTTPS_PROXY
ENV HTTP_PROXY=${HTTP_PROXY}
ENV HTTPS_PROXY=${HTTPS_PROXY}
```

构建时传递参数：

```bash
docker build \
  --build-arg HTTP_PROXY=http://proxy.example.com:8080 \
  --build-arg HTTPS_PROXY=http://proxy.example.com:8080 \
  -f Dockerfile.dev \
  -t fuxi-cli-dev .
```

**注意**：
- 方法 1（运行时传递）最灵活，可以根据不同场景使用不同代理
- 方法 2（.env 文件）适合固定配置，便于管理
- 方法 3（Dockerfile）会让所有容器都使用相同代理，不够灵活

#### 代理配置示例

**企业内网代理**：
```bash
-e HTTP_PROXY="http://proxy.company.com:8080" \
-e HTTPS_PROXY="http://proxy.company.com:8080" \
-e NO_PROXY="localhost,127.0.0.1,.internal.company.com"
```

**需要认证的代理**：
```bash
-e HTTP_PROXY="http://user:password@proxy.example.com:8080" \
-e HTTPS_PROXY="http://user:password@proxy.example.com:8080"
```

**SOCKS5 代理**（注意：某些工具可能不支持）：
```bash
-e HTTP_PROXY="socks5://proxy.example.com:1080" \
-e HTTPS_PROXY="socks5://proxy.example.com:1080"
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

### 完整的开发流程（文件映射模式）

**注意**：以下流程使用的是**文件映射模式**，代码通过 volume 映射到容器，编译产物在本地。

```bash
# 1. 构建镜像（首次或 Dockerfile.dev 更新后）
docker build -f Dockerfile.dev -t fuxi-cli-dev .

# 2. 安装依赖（使用 --rm 而不是 -it，避免交互式终端问题）
docker run --rm -v $(pwd):/workspace -w /workspace fuxi-cli-dev npm install

# 3. 构建项目（使用 --rm 而不是 -it）
docker run --rm -v $(pwd):/workspace -w /workspace fuxi-cli-dev npm run build

# 4. 编译产物在本地 bundle/ 目录（通过 volume 映射输出）
ls bundle/

# 5. 本地可以直接使用编译产物
node bundle/fuxi-cli.js --help

# 6. 修改代码后，重新构建即可（无需重建镜像）
# 编辑代码...
docker run --rm -v $(pwd):/workspace -w /workspace fuxi-cli-dev npm run build
```

**关键点**：
- `-v $(pwd):/workspace` 将本地代码目录映射到容器的 `/workspace`
- 编译产物会直接输出到本地的 `bundle/` 目录
- 修改代码后，只需重新运行构建命令，无需重建镜像

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

## 内网运行配置

### 配置 npm registry

项目默认使用公共 npm registry。如果需要在内网环境运行，可以配置内网 npm 镜像源：

1. **使用内网镜像源**：
   ```bash
   # 在容器内创建或修改 .npmrc
   docker run -it --rm -v $(pwd):/workspace -w /workspace fuxi-cli-dev /bin/bash
   
   # 在容器内编辑 .npmrc
   echo "registry=https://your-internal-npm-registry.com/" > .npmrc
   ```

2. **仅 @google/* 包使用内网源**：
   ```bash
   # 在 .npmrc 中配置
   @google:registry=https://your-internal-npm-registry.com/
   registry=https://registry.npmjs.org/
   ```

3. **参考示例配置**：
   项目提供了 `.npmrc.internal.example` 示例文件，包含多种内网配置方案。

### 离线安装

如果完全无法访问外部网络，可以预先在外网环境下载所有依赖：

```bash
# 在外网环境
npm install --offline-install
# 或使用 npm pack 打包所有依赖
npm pack --pack-destination ./offline-packages

# 在内网环境
npm install --offline ./offline-packages
```

详细的内网配置方案请参考 `.npmrc.internal.example` 文件。

## 优势

1. **环境一致性**：所有开发者使用相同的编译环境
2. **无需本地安装**：不需要在本地安装 Node.js、npm 等工具
3. **隔离性**：不污染本地系统环境
4. **快速开始**：克隆仓库后即可开始开发
5. **CI/CD 兼容**：可以用于 CI/CD 流程
6. **内网支持**：支持内网 npm 镜像源配置

## 注意事项

- 首次构建镜像可能需要一些时间
- `node_modules` 的安装和同步可能需要一些时间
- 确保有足够的磁盘空间用于镜像和容器
- 在 macOS 和 Windows 上，Docker Desktop 的性能可能不如 Linux 原生 Docker
- 如果使用内网镜像源，确保镜像源已同步所有需要的包

## 完整打包模式

### 概述

完整打包模式将代码和所有依赖都打包到 Docker 镜像中，生成一个自包含的镜像，可以在任何支持 Docker 的环境中运行，无需挂载本地目录。

### 创建 Dockerfile.prod

创建 `Dockerfile.prod` 用于生产打包：

```dockerfile
# Production Dockerfile for Fuxi CLI
# This Dockerfile packages the entire application into a single image

FROM docker.io/library/node:20-slim AS builder

# Install build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 \
  make \
  g++ \
  git \
  curl \
  ca-certificates \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY packages/*/package.json ./packages/*/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM docker.io/library/node:20-slim

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy built files from builder
COPY --from=builder /app/bundle ./bundle
COPY --from=builder /app/package.json ./

# Set entrypoint
ENTRYPOINT ["node", "bundle/fuxi-cli.js"]

# Default command
CMD ["--help"]
```

### 构建生产镜像

项目已提供 `Dockerfile.prod` 文件，使用多阶段构建优化镜像大小：

```bash
# 构建镜像
docker build -f Dockerfile.prod -t fuxi-cli:latest .

# 如果需要在构建时使用代理（内网环境）
docker build \
  --build-arg HTTP_PROXY=http://proxy.example.com:8080 \
  --build-arg HTTPS_PROXY=http://proxy.example.com:8080 \
  -f Dockerfile.prod \
  -t fuxi-cli:latest .

# 查看镜像大小
docker images fuxi-cli:latest
```

### 运行生产镜像

```bash
# 运行 CLI（交互式）
docker run -it --rm fuxi-cli:latest

# 运行 CLI（非交互式）
docker run --rm fuxi-cli:latest "你的问题"

# 挂载配置文件（如果需要）
docker run -it --rm \
  -v ~/.gemini:/home/node/.gemini \
  fuxi-cli:latest
```

### 两种模式对比

| 特性 | 文件映射模式 | 完整打包模式 |
|------|------------|------------|
| **镜像大小** | 小（只包含工具） | 大（包含代码和依赖） |
| **代码更新** | 无需重建镜像 | 需要重建镜像 |
| **开发体验** | 支持热重载 | 不支持热重载 |
| **构建速度** | 快（只构建一次） | 慢（每次更新都要重建） |
| **部署方式** | 需要挂载代码目录 | 自包含，直接运行 |
| **适用场景** | 开发、调试 | 生产、分发 |
| **网络要求** | 运行时需要网络（安装依赖） | 构建时需要网络，运行时可选 |

### 选择建议

- **开发阶段**：使用文件映射模式，便于快速迭代
- **生产部署**：使用完整打包模式，镜像自包含，便于分发
- **CI/CD**：根据需求选择，通常使用完整打包模式

### 完整打包模式注意事项

1. **环境变量**：如果需要传递配置，使用 `-e` 或 `--env-file`
2. **配置文件**：如果使用 `~/.gemini/config.json`，需要挂载目录：
   ```bash
   docker run -it --rm \
     -v ~/.gemini:/home/node/.gemini \
     fuxi-cli:latest
   ```
3. **代理配置**：在构建时或运行时传递代理环境变量
4. **镜像大小优化**：使用多阶段构建（已在 Dockerfile.prod 中实现）

