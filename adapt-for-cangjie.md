# OpenCode 仓颉定制化技术方案与使用说明

## 目标

本次改造的目标不是只增加一个文件后缀，而是让当前 OpenCode 在开发仓颉项目时具备一条**可直接落地的高收益路径**：

- 自动识别仓颉源码与仓颉项目根目录
- 自动接入 `CangjieSDK 1.0.5` 中已经构建好的 `LSPServer`
- 自动接入 `cjfmt`
- 让 OpenCode 能直接读取 `.cj` / `.cangjie` 文件
- 充分利用发布包中现成的 `cangjie-skills` 与 `cangjie-docs`，弥补通用模型对仓颉知识不足的问题

## 本次代码改造

本次在 `/home/runner/work/opencode/opencode/packages/opencode` 中落地了以下改造：

1. **内建仓颉 SDK 发现逻辑**
   - 新增 `src/cangjie/sdk.ts`
   - 自动从以下来源发现 SDK：
     - `CANGJIE_HOME`
     - 已在 `PATH` 中的 `LSPServer`
     - 已在 `PATH` 中的 `cjfmt`
     - 已在 `PATH` 中的 `cjpm`
   - 自动补齐：
     - `PATH`
     - `CANGJIE_HOME`
     - `LD_LIBRARY_PATH` / `DYLD_LIBRARY_PATH`

2. **内建仓颉 LSP**
   - 在 `src/lsp/server.ts` 中注册 `id: "cangjie"`
   - 文件扩展名：
     - `.cj`
     - `.cangjie`
   - 项目根识别：
     - `cjpm.toml`
   - 启动命令：
     - `LSPServer`

3. **内建仓颉 formatter**
   - 在 `src/format/formatter.ts` 中注册 `cjfmt`
   - 自动在 SDK 环境下执行：
     - `cjfmt -f $FILE`

4. **仓颉语言与文本文件识别**
   - 在 `src/lsp/language.ts` 中映射：
     - `.cj -> cangjie`
     - `.cangjie -> cangjie`
   - 在 `src/file/index.ts` 中将仓颉文件标记为文本文件

5. **聚焦测试**
   - 新增 `test/cangjie/sdk.test.ts`
   - 覆盖：
     - 仓颉扩展名映射
     - SDK 根目录推断
     - `cjfmt` 工具发现
     - 运行时环境拼装

## 为什么优先集成 LSP，而不是先强塞 tree-sitter

`CangjieSDK 1.0.5` 发布页同时提供了：

- 已构建好的 SDK（二进制）
- `cangjie-language-server` 源码
- `tree-sitter-cangjie` 源码
- `cangjie-skills`
- `cangjie-docs`

结合 OpenCode 当前架构，**最优先且最稳的路径**是：

### 第一阶段（本次已落地）

直接集成 SDK 自带的 LSP 和 formatter。

原因：

- `LSPServer` 已经是可运行成品，价值最高
- 能直接提升：
  - 定义跳转
  - 引用查找
  - 补全
  - 语义级代码分析
- 对 AI agent 来说，这比只做语法高亮更能节省 Token
- `cjfmt` 能减少 agent 手工整理格式的成本

### 第二阶段（建议后续增强）

把 `tree-sitter-cangjie` 产出成稳定的 `wasm + queries` 资源，再接入 `parsers-config.ts`。

原因：

- 当前 OpenCode 的 parser 配置更适合消费**可直接访问的 wasm 与 query 资源**
- 发布页提供的是 tree-sitter **源码包**，不是现成 wasm 发布资源
- 直接内建 tree-sitter 最好采用以下两种方式之一：
  1. 单独发布 `tree-sitter-cangjie.wasm` 与 queries
  2. 在 OpenCode 构建链中增加本地 parser 资产打包

这一步并不是不能做，而是相较 LSP 接入，收益/风险比没有第一阶段高。

## 为什么这套方案能显著优化“模型不懂仓颉”的问题

通用模型对新语言不熟，通常有两类瓶颈：

1. **语言知识缺口**
2. **工程上下文缺口**

本次方案正好分别对应：

### 1) 用 `cangjie-skills` 补语言知识

OpenCode 已经支持自动发现项目中的 `skills/**/SKILL.md`。

而 `CangjieSDK` 发布页已经提供了现成的 `cangjie-skills-1.0.5.zip`，其中包含：

- 泛型
- 宏
- 并发
- 包管理
- FFI
- `cjfmt`
- `cjlint`
- `cjpm`
- 标准库
- 网络 / IO / unittest 等

**建议做法：**

把该 zip 解压到你的仓颉项目根目录下的 `skills/`。

例如：

```bash
mkdir -p skills
unzip cangjie-skills-1.0.5.zip -d .
```

只要目录结构保持 `skills/**/SKILL.md`，OpenCode 就可以直接发现并使用这些技能文档。

这一步的收益很大，因为它等价于给 agent 注入了“仓颉专项领域手册”，通常比单纯换一个更强模型更稳定。

### 2) 用 `cangjie-docs` 补工程知识

`cangjie-docs-1.0.5.zip` 中已经包含：

- 语言特性
- 标准库
- 扩展标准库
- 工具链文档

建议至少保留以下索引文档在项目旁边：

- `docs/language/summary.md`
- `docs/tools/summary.md`
- `docs/libs/standard/summary.md`

可以直接把它们放在项目文档目录中，方便 agent 通过 `read`, `glob`, `grep` 工具读取。

## 如何准备仓颉开发环境

以下示例使用 Linux x64 版本 SDK。

### 1. 下载并解压 SDK

```bash
mkdir -p ~/.local/cangjie
tar -xzf cangjie-sdk-linux-x64-1.0.5.tar.gz -C ~/.local/cangjie
```

解压后通常得到：

```text
~/.local/cangjie/cangjie
├── bin
├── runtime
├── tools
└── envsetup.sh
```

### 2. 加载环境

```bash
source ~/.local/cangjie/cangjie/envsetup.sh
```

加载后会自动配置：

- `CANGJIE_HOME`
- `PATH`
- `LD_LIBRARY_PATH`

其中最关键的是：

- `tools/bin/LSPServer`
- `tools/bin/cjfmt`
- `tools/bin/cjpm`

### 3. 验证 SDK

```bash
cjpm -h
cjfmt -h
timeout 3s LSPServer --test
```

如果 `LSPServer` 不是立刻因为缺库退出，而是正常驻留直到被 `timeout` 结束，说明环境基本正确。

## 如何使用这个定制版 OpenCode

### 开发模式

在仓库根目录执行：

```bash
bun install
bun dev <你的仓颉项目目录>
```

例如：

```bash
bun dev /path/to/my-cangjie-project
```

### 构建独立可执行文件

在仓库根目录执行：

```bash
./packages/opencode/script/build.ts --single
```

然后运行：

```bash
./packages/opencode/dist/opencode-<platform>/bin/opencode /path/to/my-cangjie-project
```

> 如果改动了 API / SDK，还可以按仓库约定执行：
>
> ```bash
> ./packages/sdk/js/script/build.ts
> ```

## 在仓颉项目中推荐的目录组织

建议你的仓颉项目最终形态类似：

```text
my-cangjie-project/
├── cjpm.toml
├── src/
│   └── main.cj
├── skills/
│   ├── generic/
│   │   └── SKILL.md
│   ├── project_management/
│   │   └── SKILL.md
│   └── ...
└── docs/
    ├── language-summary.md
    └── tools-summary.md
```

这样做的好处：

- `cjpm.toml` 让 OpenCode 自动识别仓颉项目根目录
- `.cj` 文件自动走内建仓颉 LSP
- 编辑后自动尝试 `cjfmt`
- `skills/` 直接为 agent 提供仓颉专项知识
- `docs/` 让 agent 在遇到陌生语法、标准库、工具参数时可本地检索

## 可选：显式配置 OpenCode

虽然本次改造后通常不需要额外配置，但如果你希望显式控制，可以在项目中放一个 `opencode.jsonc`：

```jsonc
{
  "lsp": {
    "cangjie": {
      "disabled": false
    }
  },
  "formatter": {
    "cjfmt": {
      "disabled": false
    }
  }
}
```

## tree-sitter 的建议接入方式

`tree-sitter-cangjie` 源码已经具备：

- `tree-sitter.json`
- `queries/highlights.scm`
- `queries/indents.scm`
- Node/Python/Rust/Go 等 binding

并且声明了文件类型：

- `cj`
- `cangjie`

建议后续按下面方式接入：

1. 从源码包构建 `tree-sitter-cangjie.wasm`
2. 固化 `queries/highlights.scm`
3. 将 wasm 与 query 以稳定 URL 或构建资产方式提供
4. 再补充到 `packages/opencode/parsers-config.ts`

这一步完成后，OpenCode 对仓颉的支持将从“语义分析 + 格式化 + 知识增强”进一步升级到“语法高亮 / 增量解析 / 更细粒度结构感知”。

## 已知限制

1. 本次没有把 tree-sitter wasm 直接内建进仓库构建链
2. 本沙箱里未预装 Bun，因此无法在本地完整跑 OpenCode 的 Bun 测试/构建命令
3. 但仓颉 SDK 本体已经通过手工 smoke test 验证

## 总结

这次定制版 OpenCode 的核心价值在于：

- **零额外配置接入仓颉 LSP**
- **零额外配置接入 cjfmt**
- **零门槛利用 CangjieSDK 提供的 skills/docs 进行知识增强**

对一个“模型原生知识相对不足”的新语言来说，这比单纯做语法着色更实用，也更符合 AI coding agent 的实际收益。
