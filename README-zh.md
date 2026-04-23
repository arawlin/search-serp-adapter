---
post_title: Search SERP Adapter
author1: GitHub Copilot
post_slug: search-serp-adapter-readme-zh
microsoft_alias: copilot
featured_image: none
categories:
  - engineering
tags:
  - serp
  - mcp
  - playwright
ai_note: true
summary: 基于 provider 适配架构的 SERP CLI 与 MCP 服务，初始支持 Google 与 Baidu。
post_date: 2026-04-17
---

本文档亦提供[英文版](./README.md)。

## 概览

Search SERP Adapter 是现有 Google 搜索工具的兄弟项目。它保留了同样的核心模式，也就是基于 Playwright 的 CLI 与 stdio MCP 服务，但把原先单一搜索引擎实现替换成了 provider 适配器架构。

初始 provider 包括：

- Google
- Baidu

## 为什么要做这个项目

- 原始项目已经验证了本地执行搜索的模式。
- 如果继续把 Baidu 直接叠加进原先的单文件搜索实现，耦合会继续增加。
- 这个项目通过可复用的 provider 契约，让每个搜索引擎独立维护自己的选择器、导航流程和拦截页检测逻辑。

## 架构

- src/index.ts
  - CLI 入口
- src/mcp-server.ts
  - stdio MCP 服务入口
- src/search-service.ts
  - 请求归一化与 provider 分发
- src/provider-registry.ts
  - provider 注册与查找
- src/provider.ts
  - provider 契约
- src/providers/google-provider.ts
  - Google 专属导航与解析
- src/providers/baidu-provider.ts
  - Baidu 专属导航与解析
- src/browser-runtime.ts
  - 共享 Playwright 会话初始化与状态持久化

## 安装

```bash
pnpm install
```

或者：

```bash
npm install
```

postinstall 脚本会自动下载 Playwright Chromium。

## 构建

```bash
pnpm build
```

## CLI 使用方式

```bash
pnpm dev -- --engine google "playwright typescript"
pnpm dev -- --engine baidu "playwright typescript"
```

构建后可以直接运行：

```bash
node dist/src/index.js --engine google "search query"
node dist/src/index.js --engine baidu --limit 5 "search query"
```

### CLI 参数

- --engine <engine>
  - 搜索 provider，可选 google 或 baidu
- --limit <number>
  - 最大结果数
- --timeout <number>
  - 页面超时，单位毫秒
- --locale <locale>
  - 浏览器区域设置覆盖值
- --state-dir <path>
  - 持久化浏览器状态目录
- --no-headless
  - 使用有界面浏览器模式。若 Google 拦截，程序会等待你手动验证，完成后自动保存浏览器状态并继续
- --no-save-state
  - 禁用状态持久化

## MCP 使用方式

开发模式：

```bash
pnpm mcp
```

构建后运行：

```bash
pnpm mcp:build
```

Claude Desktop 配置示例：

```json
{
  "mcpServers": {
    "search-serp-adapter": {
      "command": "node",
      "args": ["/absolute/path/to/search-serp-adapter/dist/src/mcp-server.js"]
    }
  }
}
```

暴露的工具名称为 search-serp，输入包括：

- query
- engine
- limit
- timeout
- locale

## 返回结构

```json
{
  "engine": "baidu",
  "query": "playwright typescript",
  "results": [
    {
      "title": "Example title",
      "link": "https://example.com",
      "snippet": "Example snippet"
    }
  ],
  "warning": "可选的解析或拦截告警"
}
```

## 扩展方式

如果要增加新的搜索引擎：

1. 在 src/providers 下新增 provider 文件。
2. 实现 SearchProvider 契约。
3. 在 src/provider-registry.ts 中注册该 provider。
4. 除非需要新增 provider 专属参数，否则无需修改传输层代码。

## 当前限制

- 搜索引擎页面结构变化可能导致选择器失效。
- 当前版本对验证页或拦截页的识别仍然是启发式处理。
- 第一版聚焦于标准化搜索结果，不包含原始 HTML 导出能力。

## Google 拦截说明

- 当 Google 识别到自动化流量时，可能会返回 sorry 或 reCAPTCHA 验证页。
- 适配器现在会在提交查询后显式检测这类页面，并返回更明确的 warning。
- 如果你使用有界面模式，程序会在拦截页保持浏览器打开，等待你手动完成验证，然后自动保存 browser-state/google-browser-state.json 并继续执行。
- 如果完成验证后仍持续被拦截，问题通常不在 selector，而在出口 IP 信誉。此时应稍后重试，或更换出口 IP。

示例：

```bash
node dist/src/index.js --engine google --no-headless "助记词"
```

## 相关文档

- [requirements-zh.md](./requirements-zh.md)
- [design-zh.md](./design-zh.md)
- [tasks-zh.md](./tasks-zh.md)
- [ADR-001-search-provider-architecture-zh.md](./docs/architecture/ADR-001-search-provider-architecture-zh.md)