---
post_title: Search SERP Adapter 需求说明
author1: GitHub Copilot
post_slug: search-serp-adapter-requirements-zh
microsoft_alias: copilot
featured_image: none
categories:
  - engineering
tags:
  - serp
  - mcp
  - playwright
ai_note: true
summary: 新兄弟项目的需求说明，目标是通过 provider 适配器、CLI 和 MCP 暴露搜索引擎 SERP 获取能力。
post_date: 2026-04-17
---

本文档亦提供[英文版](./requirements.md)。

## 范围

- 在当前仓库的上级目录创建名为 search-serp-adapter 的新兄弟项目。
- 复刻当前项目作为 CLI 和 stdio MCP 服务的职责。
- 将单一搜索引擎实现替换为基于 provider 的搜索引擎适配器架构。

## EARS 需求

- WHEN 用户通过 CLI 传入查询词时，THE SYSTEM SHALL 通过选定的搜索 provider 执行查询并返回 JSON 结果。
- WHEN 调用方选择 google 作为 provider 时，THE SYSTEM SHALL 通过 Google provider 实现执行 Google SERP 获取。
- WHEN 调用方选择 baidu 作为 provider 时，THE SYSTEM SHALL 通过 Baidu provider 实现执行 Baidu SERP 获取。
- WHEN 调用方未指定 provider 时，THE SYSTEM SHALL 默认使用 google。
- WHEN MCP 客户端调用搜索工具时，THE SYSTEM SHALL 将 provider 选择、查询文本、结果数量和超时时间作为经过校验的工具输入暴露出来。
- WHEN provider 返回搜索结果时，THE SYSTEM SHALL 将结果统一为共享响应模型，包含 query、engine 和结果项。
- IF provider 无法找到任何受支持的结果容器，THEN THE SYSTEM SHALL 返回结构化失败结果，而不是让进程崩溃。
- WHEN 启用浏览器状态持久化时，THE SYSTEM SHALL 为不同 provider 保存并复用浏览器状态，以减少重复验证。
- WHEN 为新项目创建文档时，THE SYSTEM SHALL 同步提供英文与中文版本。

## 约束

- 复用当前项目的技术栈：TypeScript、Playwright、Commander、Pino、Zod 和 MCP SDK。
- MCP 传输保持为 stdio。
- 不得硬编码 secrets 或凭据。
- 初始 provider 范围仅限 Google 与 Baidu。

## 边界情况

- provider 名称无效。
- 查询字符串为空或仅包含空白字符。
- 搜索引擎返回验证页或拦截页。
- 搜索引擎 DOM 结构变化，导致主选择器失效。
- 搜索成功但未解析出任何结果项。

## 置信度

- Confidence Score: 92%
- Rationale: 当前仓库已提供所需的 CLI、MCP 和 Playwright 模式，主要工作是架构抽取与 provider 专用化，而不是未知领域研究。