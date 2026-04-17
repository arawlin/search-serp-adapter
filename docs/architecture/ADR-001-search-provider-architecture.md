---
post_title: ADR 001 Search Provider Architecture
author1: GitHub Copilot
post_slug: adr-001-search-provider-architecture
microsoft_alias: copilot
featured_image: none
categories:
  - engineering
tags:
  - adr
  - architecture
  - serp
ai_note: true
summary: Architectural decision to implement SERP retrieval through provider adapters instead of a single search-engine-specific module.
post_date: 2026-04-17
---

This document is also available in [Chinese](./ADR-001-search-provider-architecture-zh.md).

## Decision

- Implement SERP retrieval through a provider adapter interface with Google and Baidu as the initial concrete providers.

## Context

- The source project proved the CLI and MCP pattern but coupled the core logic to Google-specific navigation and parsing.
- The follow-up requirement is to support Baidu without cloning the entire codebase again for each engine.

## Options

- Keep a single monolithic search module and branch internally on engine.
- Create a provider adapter contract and move engine-specific logic into separate files.

## Rationale

- The provider contract keeps transport code stable while isolating DOM selectors and anti-block handling per engine.
- New engines can be added without modifying the CLI and MCP entry points beyond registry registration.

## Impact

- Slightly more files and abstractions.
- Significantly lower coupling between transports and engine-specific DOM parsing.

## Review

- Reassess when the number of providers exceeds three or when shared anti-bot runtime logic becomes complex enough to require a dedicated engine runtime abstraction.