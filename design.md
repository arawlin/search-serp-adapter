---
post_title: Search SERP Adapter Design
author1: GitHub Copilot
post_slug: search-serp-adapter-design
microsoft_alias: copilot
featured_image: none
categories:
  - engineering
tags:
  - architecture
  - serp
  - mcp
ai_note: true
summary: Technical design for a provider-based SERP CLI and MCP server built with Playwright and TypeScript.
post_date: 2026-04-17
---

This document is also available in [Chinese](./design-zh.md).

## Architecture

- Transport layer:
  - CLI entry point in src/index.ts
  - stdio MCP server in src/mcp-server.ts
- Application layer:
  - search service that validates options, selects a provider, and normalizes results
- Provider layer:
  - SearchProvider interface
  - google provider
  - baidu provider
- Infrastructure layer:
  - browser runtime factory
  - state persistence helpers
  - logger

## Data Flow

1. Caller provides query and engine.
2. Transport validates inputs.
3. Application resolves provider from registry.
4. Provider launches or reuses browser context.
5. Provider navigates to the engine home page and performs the search.
6. Provider extracts titles, links, and snippets from engine-specific selectors.
7. Application returns normalized SearchResponse.

## Public Interfaces

- SearchProvider
  - search(input, runtime): Promise<SearchResponse>
- searchWithProvider(options): Promise<SearchResponse>
- createSearchProviderRegistry(): SearchProviderRegistry

## Error Matrix

| Condition | Handling |
| --- | --- |
| Unsupported provider | Throw validation error before browser launch |
| Empty query | Throw validation error before browser launch |
| Timeout while loading page | Return failure result with engine metadata |
| Block page detected | Return failure result with descriptive snippet |
| Parsing selectors fail | Return empty results with parse warning snippet |

## Testing Strategy

- Validate compile-time type safety with TypeScript strict mode.
- Run npm run build as the initial quality gate.
- Keep provider logic isolated so unit tests can mock provider registry in a future iteration.

## Sequence

```text
CLI or MCP -> search service -> provider registry -> specific provider -> Playwright -> normalized response
```