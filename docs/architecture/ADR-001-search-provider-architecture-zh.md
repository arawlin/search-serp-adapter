---
post_title: ADR 001 搜索 Provider 架构决策
author1: GitHub Copilot
post_slug: adr-001-search-provider-architecture-zh
microsoft_alias: copilot
featured_image: none
categories:
  - engineering
tags:
  - adr
  - architecture
  - serp
ai_note: true
summary: 通过 provider 适配器而不是单一搜索引擎模块来实现 SERP 获取的架构决策。
post_date: 2026-04-17
---

本文档亦提供[英文版](./ADR-001-search-provider-architecture.md)。

## 决策

- 通过 provider 适配接口实现 SERP 获取，初始具体 provider 为 Google 与 Baidu。

## 背景

- 源项目证明了 CLI 与 MCP 模式可行，但核心逻辑与 Google 专属导航和解析强耦合。
- 后续需求是支持 Baidu，同时不希望为每个引擎复制整份代码库。

## 选项

- 保留单体搜索模块，在内部按 engine 分支。
- 创建 provider 适配契约，将引擎专属逻辑拆分到独立文件。

## 理由

- provider 契约让传输层代码保持稳定，同时将 DOM 选择器与反拦截处理隔离到各自引擎内部。
- 新引擎可以通过注册表扩展，而无需修改 CLI 与 MCP 入口的主体逻辑。

## 影响

- 文件与抽象层级略有增加。
- 传输层与引擎专属 DOM 解析之间的耦合显著降低。

## 复审条件

- 当 provider 数量超过三个，或共享反爬运行时逻辑复杂到需要独立引擎运行时抽象时，重新评估该决策。