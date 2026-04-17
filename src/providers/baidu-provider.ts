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

const baiduInputSelectors = ["#kw", "input[name='wd']", "textarea[name='wd']"];

export class BaiduProvider implements SearchProvider {
  readonly engine = "baidu" as const;

  readonly displayName = "Baidu";

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

      const blockWarning = await this.detectBlock(session.page.url(), await session.page.content());
      if (blockWarning) {
        return { engine: this.engine, query: input.query, results: [], warning: blockWarning };
      }

      const inputHandle = await this.findSearchInput(session.page, baiduInputSelectors);
      if (!inputHandle) {
        return {
          engine: this.engine,
          query: input.query,
          results: [],
          warning: "Baidu search input was not found.",
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
        warning: results.length === 0 ? "No Baidu results were parsed." : undefined,
      };
    } catch (error) {
      logger.error({ error }, "Baidu provider failed");
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

  private async detectBlock(url: string, html: string): Promise<string | undefined> {
    const blockPatterns = getEngineBlockPatterns(this.engine);
    const lowerUrl = url.toLowerCase();
    const lowerHtml = html.toLowerCase();

    const matched = blockPatterns.some(
      (pattern) => lowerUrl.includes(pattern.toLowerCase()) || lowerHtml.includes(pattern.toLowerCase()),
    );

    if (matched) {
      return "Baidu returned a block or verification page.";
    }

    return undefined;
  }

  private async extractResults(
    page: import("playwright").Page,
    limit: number,
  ): Promise<SearchResult[]> {
    return page.evaluate((maxResults) => {
      const seenUrls = new Set<string>();
      const normalizedResults: SearchResult[] = [];

      const containers = Array.from(
        document.querySelectorAll("#content_left .result, #content_left .c-container, #content_left > div"),
      );

      for (const container of containers) {
        if (normalizedResults.length >= maxResults) {
          break;
        }

        const anchorElement =
          container.querySelector("h3 a") ?? container.querySelector("a[href^='http']");
        const title = anchorElement?.textContent?.trim() ?? "";
        const link = anchorElement instanceof HTMLAnchorElement ? anchorElement.href : "";
        const snippet =
          container.querySelector(".c-abstract")?.textContent?.trim() ??
          container.querySelector("div[mu]")?.textContent?.trim() ??
          container.querySelector("span.content-right_8Zs40")?.textContent?.trim() ??
          "";

        if (!title || !link || seenUrls.has(link)) {
          continue;
        }

        normalizedResults.push({ title, link, snippet });
        seenUrls.add(link);
      }

      return normalizedResults.slice(0, maxResults);
    }, limit);
  }
}