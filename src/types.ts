export const supportedEngines = ["google", "baidu"] as const;

export type SearchEngine = (typeof supportedEngines)[number];

export interface SearchResult extends Record<string, unknown> {
  title: string;
  link: string;
  snippet: string;
}

export interface SearchResponse extends Record<string, unknown> {
  engine: SearchEngine;
  query: string;
  results: SearchResult[];
  warning?: string;
}

export interface SearchRequest {
  query: string;
  engine?: SearchEngine;
  limit?: number;
  timeout?: number;
  headless?: boolean;
  locale?: string;
  stateDir?: string;
  noSaveState?: boolean;
}

export interface ResolvedSearchRequest {
  query: string;
  engine: SearchEngine;
  limit: number;
  timeout: number;
  headless: boolean;
  locale: string;
  stateDir: string;
  noSaveState: boolean;
}

export interface BrowserLaunchRequest {
  engine: SearchEngine;
  timeout: number;
  headless: boolean;
  locale: string;
  stateDir: string;
  noSaveState: boolean;
}