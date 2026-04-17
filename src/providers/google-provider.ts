import logger from "../logger.js";
import {
  closeBrowserSession,
  getEngineBlockPatterns,
  getEngineHomeUrl,
  openBrowserSession,
  persistBrowserState,
} from "../browser-runtime.js";
import type { SearchExecutionOptions, SearchProvider } from "../provider.js";
import type {
  ResolvedSearchRequest,
  SearchResponse,
  SearchResult,
} from "../types.js";

const googleInputSelectors = [
  "textarea[name='q']",
  "input[name='q']",
  "textarea[aria-label='Search']",
  "input[aria-label='Search']",
];

const googleResultSelectors = ["#search", "#rso", ".g", "div[role='main']"];

export class GoogleProvider implements SearchProvider {
  readonly engine = "google" as const;

  readonly displayName = "Google";

  async search(
    input: ResolvedSearchRequest,
    options: SearchExecutionOptions = {},
  ): Promise<SearchResponse> {
    const session = await openBrowserSession(input, options.sharedBrowser);

    try {
      await session.page.goto(getEngineHomeUrl(this.engine), {
        timeout: input.timeout,
        waitUntil: "domcontentloaded",
      });

      const blockWarning = await this.detectBlock(session.page.url(), await session.page.title());
      if (blockWarning) {
        return { engine: this.engine, query: input.query, results: [], warning: blockWarning };
      }

      const inputHandle = await this.findSearchInput(session.page, googleInputSelectors);
      if (!inputHandle) {
        return {
          engine: this.engine,
          query: input.query,
          results: [],
          warning: "Google search input was not found.",
        };
      }

      await inputHandle.click();
      await inputHandle.fill(input.query);
      await session.page.keyboard.press("Enter");
      await session.page.waitForLoadState("networkidle", { timeout: input.timeout });

      const results = await this.extractResults(session.page, input.limit);
      await persistBrowserState(session, input);

      return {
        engine: this.engine,
        query: input.query,
        results,
        warning: results.length === 0 ? "No Google results were parsed." : undefined,
      };
    } catch (error) {
      logger.error({ error }, "Google provider failed");
      return {
        engine: this.engine,
        query: input.query,
        results: [],
        warning: error instanceof Error ? error.message : String(error),
      };
    } finally {
      await closeBrowserSession(session);
    }
  }

  private async findSearchInput(page: import("playwright").Page, selectors: string[]) {
    for (const selector of selectors) {
      const handle = await page.$(selector);
      if (handle) {
        return handle;
      }
    }

    return undefined;
  }

  private async detectBlock(url: string, title: string): Promise<string | undefined> {
    const blockPatterns = getEngineBlockPatterns(this.engine);
    const lowerUrl = url.toLowerCase();
    const lowerTitle = title.toLowerCase();

    const matched = blockPatterns.some(
      (pattern) => lowerUrl.includes(pattern.toLowerCase()) || lowerTitle.includes(pattern.toLowerCase()),
    );

    if (matched) {
      return "Google returned a block or verification page.";
    }

    return undefined;
  }

  private async extractResults(
    page: import("playwright").Page,
    limit: number,
  ): Promise<SearchResult[]> {
    for (const selector of googleResultSelectors) {
      const handle = await page.$(selector);
      if (handle) {
        break;
      }
    }

    return page.evaluate((maxResults) => {
      const seenUrls = new Set<string>();
      const normalizedResults: SearchResult[] = [];

      const containers = Array.from(
        document.querySelectorAll("#search div[data-hveid], #rso div[data-hveid], .g"),
      );

      for (const container of containers) {
        if (normalizedResults.length >= maxResults) {
          break;
        }

        const titleElement = container.querySelector("h3");
        const anchorElement =
          titleElement?.closest("a") ??
          titleElement?.querySelector("a") ??
          container.querySelector("a[href^='http']");

        const title = titleElement?.textContent?.trim() ?? "";
        const link = anchorElement instanceof HTMLAnchorElement ? anchorElement.href : "";
        const snippet =
          container.querySelector(".VwiC3b")?.textContent?.trim() ??
          container.querySelector("[data-sncf='1']")?.textContent?.trim() ??
          "";

        if (!title || !link || seenUrls.has(link) || link.includes("google.com")) {
          continue;
        }

        normalizedResults.push({ title, link, snippet });
        seenUrls.add(link);
      }

      return normalizedResults.slice(0, maxResults);
    }, limit);
  }
}