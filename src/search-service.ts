import * as path from "node:path";
import type { Browser } from "playwright";
import type { SearchExecutionOptions } from "./provider.js";
import {
  createSearchProviderRegistry,
  type SearchProviderRegistry,
} from "./provider-registry.js";
import logger from "./logger.js";
import {
  supportedEngines,
  type ResolvedSearchRequest,
  type SearchRequest,
  type SearchResponse,
} from "./types.js";

const defaultStateDirectory = path.join(process.cwd(), "browser-state");

export function resolveSearchRequest(input: SearchRequest): ResolvedSearchRequest {
  const query = input.query.trim();

  if (!query) {
    throw new Error("Search query must not be empty.");
  }

  const engine = input.engine ?? "google";
  if (!supportedEngines.includes(engine)) {
    throw new Error(`Unsupported search engine: ${engine}`);
  }

  return {
    query,
    engine,
    limit: input.limit ?? 10,
    timeout: input.timeout ?? 30000,
    headless: input.headless ?? true,
    locale: input.locale ?? "zh-CN",
    stateDir: input.stateDir ?? defaultStateDirectory,
    noSaveState: input.noSaveState ?? false,
  };
}

export async function searchWithProvider(
  input: SearchRequest,
  dependencies: {
    registry?: SearchProviderRegistry;
    sharedBrowser?: Browser;
  } = {},
): Promise<SearchResponse> {
  const resolvedInput = resolveSearchRequest(input);
  const registry = dependencies.registry ?? createSearchProviderRegistry();
  const provider = registry.get(resolvedInput.engine);
  const executionOptions: SearchExecutionOptions = {
    sharedBrowser: dependencies.sharedBrowser,
  };

  logger.info(
    {
      query: resolvedInput.query,
      engine: resolvedInput.engine,
      limit: resolvedInput.limit,
    },
    "Executing search",
  );

  return provider.search(resolvedInput, executionOptions);
}