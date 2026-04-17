---
post_title: Search SERP Adapter 设计说明
author1: GitHub Copilot
post_slug: search-serp-adapter-design-zh
microsoft_alias: copilot
featured_image: none
categories:
  - engineering
tags:
  - architecture
  - serp
  - mcp
ai_note: true
summary: 基于 Playwright 与 TypeScript 的 provider 化 SERP CLI 与 MCP 服务技术设计。
post_date: 2026-04-17
---

本文档亦提供[英文版](./design.md)。

## 架构

- 传输层：
  - CLI 入口位于 src/index.ts
  - stdio MCP 服务位于 src/mcp-server.ts
- 应用层：
  - 搜索服务负责校验参数、选择 provider 并统一结果结构
- Provider 层：
  - SearchProvider 接口
  - google provider
  - baidu provider
- 基础设施层：
  - 浏览器运行时工厂
  - 状态持久化工具
  - logger

## 数据流

1. 调用方提供 query 和 engine。
2. 传输层校验输入。
3. 应用层从注册表解析 provider。
4. Provider 启动或复用浏览器上下文。
5. Provider 访问引擎首页并执行搜索。
6. Provider 从引擎专属选择器中提取标题、链接和摘要。
7. 应用层返回统一的 SearchResponse。

## 公共接口

- SearchProvider
  - search(input, runtime): Promise<SearchResponse>
- searchWithProvider(options): Promise<SearchResponse>
- createSearchProviderRegistry(): SearchProviderRegistry

## 错误矩阵

| 条件 | 处理方式 |
| --- | --- |
| 不支持的 provider | 在启动浏览器前抛出校验错误 |
| 空查询 | 在启动浏览器前抛出校验错误 |
| 页面加载超时 | 返回包含引擎元数据的失败结果 |
| 检测到拦截页 | 返回带描述性 snippet 的失败结果 |
| 解析选择器失败 | 返回空结果并携带解析告警 snippet |

## 测试策略

- 通过 TypeScript strict 模式验证编译期类型安全。
- 以 npm run build 作为首个质量门禁。
- 保持 provider 逻辑隔离，便于后续迭代中通过 mock provider registry 进行单元测试。

## 时序

```text
CLI or MCP -> search service -> provider registry -> specific provider -> Playwright -> normalized response
```