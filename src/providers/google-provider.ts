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
import type { LaunchOptions, Page } from "playwright";

const googleInputSelectors = [
  "textarea[name='q']",
  "input[name='q']",
  "textarea[aria-label='Search']",
  "input[aria-label='Search']",
];

const googleResultSelectors = ["#search", "#rso", ".g", "div[role='main']"];

const googleBrowserArgs = ["--window-size=1920,1080", "--force-color-profile=srgb"];

const googleStealthArgs = ["--disable-blink-features=AutomationControlled"];

const linuxSandboxBypassArgs = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
];

export class GoogleProvider implements SearchProvider {
  readonly engine = "google" as const;

  readonly displayName = "Google";

  async search(
    input: ResolvedSearchRequest,
    options: SearchExecutionOptions = {},
  ): Promise<SearchResponse> {
    const session = await openBrowserSession(input, {
      sharedBrowser: options.sharedBrowser,
      launchOptions: this.buildLaunchOptions(input),
    });

    try {
      await session.page.goto(getEngineHomeUrl(this.engine), {
        timeout: input.timeout,
        waitUntil: "domcontentloaded",
      });

      const blockWarning = await this.maybeWaitForVerification(session.page, input);
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
      await session.page.waitForURL(/\/(search|sorry)(\?|$)/, { timeout: input.timeout }).catch(() => undefined);

      const postSubmitBlockWarning = await this.maybeWaitForVerification(session.page, input);
      if (postSubmitBlockWarning) {
        return {
          engine: this.engine,
          query: input.query,
          results: [],
          warning: postSubmitBlockWarning,
        };
      }

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

  private async maybeWaitForVerification(
    page: Page,
    input: ResolvedSearchRequest,
  ): Promise<string | undefined> {
    const blockWarning = await this.detectBlockFromPage(page);
    if (!blockWarning) {
      return undefined;
    }

    if (input.headless) {
      return blockWarning;
    }

    logger.info(
      {
        engine: this.engine,
        query: input.query,
        timeout: input.timeout,
      },
      "Waiting for headed Google verification to complete",
    );

    const resolved = await this.waitForVerificationToResolve(page, input.timeout);
    if (!resolved) {
      return [
        "Manual verification did not complete before timeout.",
        "Increase --timeout and try again.",
      ].join(" ");
    }

    logger.info(
      {
        engine: this.engine,
        query: input.query,
      },
      "Headed Google verification completed",
    );

    return undefined;
  }

  private async waitForVerificationToResolve(page: Page, timeout: number): Promise<boolean> {
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
      const blocked = await this.detectBlockFromPage(page);
      if (!blocked) {
        return true;
      }

      await page.waitForTimeout(1000);
    }

    return false;
  }

  private buildLaunchOptions(input: ResolvedSearchRequest): LaunchOptions {
    const args = [...googleBrowserArgs, ...googleStealthArgs];

    if (process.platform === "linux") {
      args.push(...linuxSandboxBypassArgs);
    }

    return {
      headless: input.headless,
      timeout: input.timeout * 2,
      args,
      ignoreDefaultArgs: ["--enable-automation"],
    };
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

  private async detectBlockFromPage(page: Page): Promise<string | undefined> {
    const pageUrl = page.url();

    try {
      return await this.detectBlock(pageUrl, await page.content());
    } catch (error) {
      if (this.isNavigationInProgressError(error)) {
        return this.detectBlock(pageUrl, "");
      }

      throw error;
    }
  }

  private isNavigationInProgressError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    return error.message.includes("page.content") && error.message.includes("page is navigating");
  }

  private async detectBlock(url: string, pageSnapshot: string): Promise<string | undefined> {
    const blockPatterns = getEngineBlockPatterns(this.engine);
    const lowerUrl = url.toLowerCase();
    const lowerSnapshot = pageSnapshot.toLowerCase();

    const matched = blockPatterns.some(
      (pattern) =>
        lowerUrl.includes(pattern.toLowerCase()) || lowerSnapshot.includes(pattern.toLowerCase()),
    );

    if (matched) {
      return [
        "Google returned a block or verification page.",
        "Re-run in headed mode to wait for manual verification and save state automatically.",
        "If it still happens, rotate the network egress IP or wait for the IP reputation to recover.",
      ].join(" ");
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