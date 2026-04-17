import type { Browser } from "playwright";
import type {
  ResolvedSearchRequest,
  SearchEngine,
  SearchResponse,
} from "./types.js";

export interface SearchExecutionOptions {
  sharedBrowser?: Browser;
}

export interface SearchProvider {
  readonly engine: SearchEngine;
  readonly displayName: string;
  search(
    input: ResolvedSearchRequest,
    options?: SearchExecutionOptions,
  ): Promise<SearchResponse>;
}