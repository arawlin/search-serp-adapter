#!/usr/bin/env node

import { Command } from "commander";
import packageJson from "../package.json" with { type: "json" };
import { searchWithProvider } from "./search-service.js";
import type { SearchRequest } from "./types.js";

const program = new Command();

program
  .name("search-serp")
  .description("SERP CLI with pluggable search engine providers")
  .version(packageJson.version)
  .argument("<query>", "Search query")
  .option("-e, --engine <engine>", "Search engine provider: google | baidu")
  .option("-l, --limit <number>", "Result limit", (value) => Number.parseInt(value, 10))
  .option("-t, --timeout <number>", "Timeout in milliseconds", (value) => Number.parseInt(value, 10))
  .option("--locale <locale>", "Browser locale override")
  .option("--state-dir <path>", "Directory for provider browser state files")
  .option("--no-headless", "Run browser in headed mode")
  .option("--no-save-state", "Do not persist browser state")
  .action(async (query: string, options: SearchRequest) => {
    try {
      const result = await searchWithProvider({ ...options, query });
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  });

program.parse(process.argv);