#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { chromium, type Browser } from "playwright";
import { z } from "zod";
import logger from "./logger.js";
import { searchWithProvider } from "./search-service.js";

const server = new McpServer({
  name: "search-serp-adapter",
  version: "0.1.0",
});

let sharedBrowser: Browser | undefined;

server.registerTool(
  "search-serp",
  {
    description:
      "Execute a live SERP search through a selected provider and return normalized title, link, and snippet results.",
    inputSchema: {
      query: z.string().min(1).describe("Search query string"),
      engine: z.enum(["google", "baidu"]).optional().describe("Search engine provider"),
      limit: z.number().int().min(1).max(20).optional().describe("Maximum result count"),
      timeout: z.number().int().min(1000).max(120000).optional().describe("Timeout in milliseconds"),
      locale: z.string().optional().describe("Browser locale override"),
    },
  },
  async ({ query, engine, limit, timeout, locale }) => {
    try {
      const response = await searchWithProvider(
        { query, engine, limit, timeout, locale },
        { sharedBrowser },
      );

      return {
        content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        structuredContent: response,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ error }, "MCP search failed");

      return {
        isError: true,
        content: [{ type: "text", text: message }],
        structuredContent: { error: message },
      };
    }
  },
);

async function ensureSharedBrowser(): Promise<Browser> {
  if (sharedBrowser) {
    return sharedBrowser;
  }

  sharedBrowser = await chromium.launch({
    headless: true,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--disable-features=IsolateOrigins,site-per-process",
      "--disable-site-isolation-trials",
      "--disable-web-security",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
    ignoreDefaultArgs: ["--enable-automation"],
  });

  return sharedBrowser;
}

async function cleanupBrowser(): Promise<void> {
  if (!sharedBrowser) {
    return;
  }

  await sharedBrowser.close().catch(() => undefined);
  sharedBrowser = undefined;
}

async function main(): Promise<void> {
  await ensureSharedBrowser();

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("search-serp-adapter MCP server is ready");
}

process.on("SIGINT", async () => {
  await cleanupBrowser();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await cleanupBrowser();
  process.exit(0);
});

process.on("exit", () => {
  void cleanupBrowser();
});

main().catch(async (error) => {
  logger.error({ error }, "Failed to start MCP server");
  await cleanupBrowser();
  process.exit(1);
});