---
post_title: Search SERP Adapter
author1: GitHub Copilot
post_slug: search-serp-adapter-readme
microsoft_alias: copilot
featured_image: none
categories:
  - engineering
tags:
  - serp
  - mcp
  - playwright
ai_note: true
summary: Provider-based SERP CLI and MCP server that supports Google and Baidu through a shared adapter architecture.
post_date: 2026-04-17
---

This document is also available in [Chinese](./README-zh.md).

## Overview

Search SERP Adapter is a sibling project to the existing Google search tool. It keeps the same core model, a Playwright-powered CLI and stdio MCP server, but replaces the single-engine implementation with a provider adapter architecture.

The initial providers are:

- Google
- Baidu

## Why This Project Exists

- The original project proved the local search execution pattern.
- Adding Baidu directly into the original single-file search implementation would increase coupling.
- This project establishes a reusable provider contract so each engine can own its own selectors, navigation flow, and block-page detection.

## Architecture

- src/index.ts
  - CLI entry point
- src/mcp-server.ts
  - stdio MCP server entry point
- src/search-service.ts
  - request normalization and provider dispatch
- src/provider-registry.ts
  - provider registration and lookup
- src/provider.ts
  - provider contract
- src/providers/google-provider.ts
  - Google-specific navigation and parsing
- src/providers/baidu-provider.ts
  - Baidu-specific navigation and parsing
- src/browser-runtime.ts
  - shared Playwright session setup and state persistence

## Install

```bash
pnpm install
```

Or:

```bash
npm install
```

The postinstall script downloads Playwright Chromium automatically.

## Build

```bash
pnpm build
```

## CLI Usage

```bash
pnpm dev -- --engine google "playwright typescript"
pnpm dev -- --engine baidu "playwright typescript"
```

After building:

```bash
node dist/src/index.js --engine google "search query"
node dist/src/index.js --engine baidu --limit 5 "search query"
```

### CLI Options

- --engine <engine>
  - Search provider, google or baidu
- --limit <number>
  - Maximum number of results
- --timeout <number>
  - Page timeout in milliseconds
- --locale <locale>
  - Browser locale override
- --state-dir <path>
  - Directory for persisted browser state
- --no-headless
  - Launch headed browser mode
- --no-save-state
  - Disable state persistence

## MCP Usage

Development mode:

```bash
pnpm mcp
```

Built mode:

```bash
pnpm mcp:build
```

Claude Desktop example configuration:

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

The exposed tool is search-serp with these inputs:

- query
- engine
- limit
- timeout
- locale

## Response Shape

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
  "warning": "Optional parse or block warning"
}
```

## Extension Guide

To add a new search engine:

1. Create a new provider file under src/providers.
2. Implement the SearchProvider contract.
3. Register the provider in src/provider-registry.ts.
4. Keep transport code unchanged unless new provider-specific options are required.

## Limitations

- Search engine markup changes can break selectors.
- Verification or block pages are only detected heuristically in the initial implementation.
- The first iteration focuses on normalized search results, not raw HTML export.

## Related Docs

- [requirements.md](./requirements.md)
- [design.md](./design.md)
- [tasks.md](./tasks.md)
- [ADR-001-search-provider-architecture.md](./docs/architecture/ADR-001-search-provider-architecture.md)