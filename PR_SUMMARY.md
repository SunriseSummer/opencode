# OpenCode 仓颉适配 - PR 摘要

## 修改概述

本次 PR 为 OpenCode 增加了对仓颉编程语言的完整支持，包括 LSP 集成、Formatter、Tree-sitter 语法高亮和 SDK 管理。

## 主要变更

### 1. 新增文件
- `packages/opencode/src/cangjie/sdk.ts` - 仓颉 SDK 发现和管理模块
- `packages/opencode/test/cangjie/sdk.test.ts` - SDK 模块单元测试
- `packages/opencode/tree-sitter/cangjie/tree-sitter-cangjie.wasm` - Tree-sitter 语法解析器 (878KB)
- `packages/opencode/tree-sitter/cangjie/highlights.scm` - 语法高亮查询文件
- `packages/opencode/script/build-cangjie-parser.ts` - 自动化构建脚本

### 2. 修改文件

#### `packages/opencode/src/lsp/server.ts`
- 添加 `Cangjie` LSP 服务器配置
- 支持文件扩展名: `.cj`, `.cangjie`
- 项目根识别: `cjpm.toml`
- 启动命令: `LSPServer`
- **新增**: SDK 验证和错误处理
- **新增**: LSP 进程启动失败检测

#### `packages/opencode/src/lsp/language.ts`
- 添加仓颉语言映射:
  ```typescript
  ".cj": "cangjie",
  ".cangjie": "cangjie"
  ```

#### `packages/opencode/src/format/formatter.ts`
- 添加 `cjfmt` Formatter 配置
- 支持文件扩展名: `.cj`, `.cangjie`
- 命令: `cjfmt -f $FILE`
- **修复**: 改进工具发现逻辑，支持全局回退

#### `packages/opencode/src/file/index.ts`
- 将 `.cj` 和 `.cangjie` 添加到文本文件扩展名集合

#### `packages/opencode/src/cangjie/sdk.ts` (已增强)
- **新增**: 版本检查功能 (`MIN_VERSION = "1.0.5"`)
- **新增**: `version()` - 获取 SDK 版本
- **新增**: `checkVersion()` - 检查版本兼容性
- **新增**: `validate()` - 完整 SDK 验证
- 自动从 `CANGJIE_HOME` 或 PATH 发现 SDK
- 自动配置 `PATH`, `LD_LIBRARY_PATH`/`DYLD_LIBRARY_PATH`
- 支持 Windows/Linux/macOS 跨平台

#### `packages/opencode/parsers-config.ts`
- 添加仓颉 Tree-sitter 配置:
  ```typescript
  {
    filetype: "cangjie",
    wasm,  // 内置 WASM 文件
    queries: { highlights: [highlights] },
  }
  ```

## 功能特性

### 自动 SDK 发现
支持从以下位置自动发现仓颉 SDK:
1. `CANGJIE_HOME` 环境变量
2. PATH 中的 `LSPServer`, `cjfmt`, `cjpm` 工具

### LSP 支持
- 自动识别仓颉项目（通过 `cjpm.toml`）
- 代码补全
- 定义跳转
- 引用查找
- 语义分析

### Formatter 支持
- 自动格式化 `.cj` 和 `.cangjie` 文件
- 使用 `cjfmt -f $FILE` 命令

### 语法高亮
- 基于 Tree-sitter 的语法高亮
- 离线可用（内置 WASM 和查询文件）

### 版本检查
- 自动检查 SDK 版本（最低 1.0.5）
- 友好的错误提示

## 使用方法

### 开发模式
```bash
# 设置仓颉 SDK 环境
source /path/to/cangjie/envsetup.sh

# 启动 OpenCode
bun dev /path/to/your-cangjie-project
```

### 项目结构示例
```
my-cangjie-project/
├── cjpm.toml
├── src/
│   └── main.cj
└── ...
```

## 测试

### 单元测试
```bash
bun test packages/opencode/test/cangjie/sdk.test.ts
```

### 测试覆盖
- ✅ SDK 根目录推断
- ✅ 工具发现（cjpm, cjfmt, LSPServer）
- ✅ 环境变量配置
- ✅ 扩展名映射
- ✅ 版本检查

## 依赖要求

### 运行时依赖
- 仓颉 SDK 1.0.5+
- 已安装并配置 `CANGJIE_HOME` 或工具在 PATH 中

### 构建依赖（可选）
- tree-sitter-cli（用于重新构建 parser）

## 已知限制

1. 需要仓颉 SDK 1.0.5+ 才能使用完整功能
2. Tree-sitter WASM 构建需要 Node.js 环境（Node 24 有兼容性问题）

## 修复的问题

### 问题 1: Formatter 工具发现不够健壮
**修复前**: 仅检查 SDK 工具，无回退机制
**修复后**: 先检查 SDK 工具，如不存在则回退到全局命令

### 问题 2: LSP 启动缺少错误处理
**修复前**: 无启动失败检测，可能导致挂起
**修复后**: 添加进程错误处理和早期退出检测

### 问题 3: 缺少 SDK 版本检查
**修复前**: 无版本验证
**修复后**: 添加 `MIN_VERSION` 检查和验证函数

## 后续建议

1. 添加仓颉项目模板初始化功能
2. 集成 `cjpm` 包管理命令（安装、更新依赖）
3. 添加更多 LSP 功能（重构、代码操作）
4. 完善调试支持

## 兼容性

- ✅ Linux x64
- ✅ macOS x64 / arm64
- ✅ Windows（待测试）

## 相关链接

- 仓颉语言官网: https://cangjie-lang.cn/
- 仓颉 SDK: https://github.com/SunriseSummer/CangjieSDK
- OpenCode 原仓库: https://github.com/anomalyco/opencode
