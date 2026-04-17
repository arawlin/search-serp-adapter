---
post_title: Search SERP Adapter Requirements
author1: GitHub Copilot
post_slug: search-serp-adapter-requirements
microsoft_alias: copilot
featured_image: none
categories:
  - engineering
tags:
  - serp
  - mcp
  - playwright
ai_note: true
summary: Requirements for a new sibling project that exposes search engine SERP retrieval through provider adapters, CLI, and MCP.
post_date: 2026-04-17
---

This document is also available in [Chinese](./requirements-zh.md).

## Scope

- Create a new sibling project named search-serp-adapter under the parent directory of the current repository.
- Mirror the current project's responsibilities as a CLI and stdio MCP server.
- Replace the single-engine implementation with a provider-based search engine adapter architecture.

## EARS Requirements

- WHEN a user runs the CLI with a query, THE SYSTEM SHALL execute the query through a selected search provider and return JSON results.
- WHEN a caller selects google as the provider, THE SYSTEM SHALL execute Google SERP retrieval through the Google provider implementation.
- WHEN a caller selects baidu as the provider, THE SYSTEM SHALL execute Baidu SERP retrieval through the Baidu provider implementation.
- WHEN a provider is not specified, THE SYSTEM SHALL default to google.
- WHEN an MCP client calls the search tool, THE SYSTEM SHALL expose provider selection, query text, result limit, and timeout as validated tool inputs.
- WHEN a provider returns search results, THE SYSTEM SHALL normalize them into a shared response model containing query, engine, and result items.
- IF a provider cannot find any supported result container, THEN THE SYSTEM SHALL return a structured failure result instead of crashing the process.
- WHEN browser state persistence is enabled, THE SYSTEM SHALL save and reuse per-provider browser state to reduce repeated verification.
- WHEN documentation is created for the new project, THE SYSTEM SHALL provide synchronized English and Chinese variants.

## Constraints

- Reuse the current project's technology stack: TypeScript, Playwright, Commander, Pino, Zod, and MCP SDK.
- Keep the implementation stdio-based for MCP transport.
- Avoid hardcoded secrets or credentials.
- Keep the initial provider surface limited to Google and Baidu.

## Edge Cases

- Invalid provider name.
- Query string is empty or whitespace only.
- Search engine returns a verification or block page.
- Search engine DOM structure changes and primary selectors fail.
- Search succeeds but returns zero parsed items.

## Confidence

- Confidence Score: 92%
- Rationale: The current repository already demonstrates the required CLI, MCP, and Playwright patterns. The main work is architectural extraction and provider specialization, not research.