import {
  chromium,
  devices,
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
  type Page,
} from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";
import logger from "./logger.js";
import type { BrowserLaunchRequest, SearchEngine } from "./types.js";

const browserArgs = [
  "--disable-blink-features=AutomationControlled",
  "--disable-features=IsolateOrigins,site-per-process",
  "--disable-site-isolation-trials",
  "--disable-web-security",
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--disable-background-networking",
  "--disable-background-timer-throttling",
  "--disable-renderer-backgrounding",
  "--force-color-profile=srgb",
];

export interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  stateFilePath: string;
  browserOwned: boolean;
}

export function getEngineHomeUrl(engine: SearchEngine): string {
  if (engine === "baidu") {
    return "https://www.baidu.com";
  }

  return "https://www.google.com";
}

export function getEngineBlockPatterns(engine: SearchEngine): string[] {
  if (engine === "baidu") {
    return ["wappass.baidu.com", "verify", "安全验证"];
  }

  return ["sorry", "recaptcha", "captcha", "unusual traffic"];
}

function getStateFilePath(engine: SearchEngine, stateDir: string): string {
  return path.join(stateDir, `${engine}-browser-state.json`);
}

function buildContextOptions(
  request: BrowserLaunchRequest,
  stateFilePath: string,
): BrowserContextOptions {
  const contextOptions: BrowserContextOptions = {
    ...devices["Desktop Chrome"],
    locale: request.locale,
    isMobile: false,
    hasTouch: false,
    javaScriptEnabled: true,
  };

  if (fs.existsSync(stateFilePath)) {
    return { ...contextOptions, storageState: stateFilePath };
  }

  return contextOptions;
}

async function applyAntiBotScripts(context: BrowserContext, page: Page): Promise<void> {
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3] });
    Object.defineProperty(navigator, "languages", {
      get: () => ["zh-CN", "zh", "en-US", "en"],
    });

    // @ts-expect-error Browser compatibility shim.
    window.chrome = { runtime: {} };
  });

  await page.addInitScript(() => {
    Object.defineProperty(window.screen, "width", { get: () => 1920 });
    Object.defineProperty(window.screen, "height", { get: () => 1080 });
    Object.defineProperty(window.screen, "colorDepth", { get: () => 24 });
  });
}

export async function openBrowserSession(
  request: BrowserLaunchRequest,
  sharedBrowser?: Browser,
): Promise<BrowserSession> {
  const stateFilePath = getStateFilePath(request.engine, request.stateDir);
  const browser =
    sharedBrowser ??
    (await chromium.launch({
      headless: request.headless,
      timeout: request.timeout * 2,
      args: browserArgs,
      ignoreDefaultArgs: ["--enable-automation"],
    }));

  const context = await browser.newContext(buildContextOptions(request, stateFilePath));
  const page = await context.newPage();
  await applyAntiBotScripts(context, page);

  logger.info(
    {
      engine: request.engine,
      stateFilePath,
      reusedBrowser: Boolean(sharedBrowser),
    },
    "Browser session opened",
  );

  return {
    browser,
    context,
    page,
    stateFilePath,
    browserOwned: !sharedBrowser,
  };
}

export async function persistBrowserState(
  session: BrowserSession,
  request: BrowserLaunchRequest,
): Promise<void> {
  if (request.noSaveState) {
    return;
  }

  const stateDirectory = path.dirname(session.stateFilePath);
  if (!fs.existsSync(stateDirectory)) {
    fs.mkdirSync(stateDirectory, { recursive: true });
  }

  await session.context.storageState({ path: session.stateFilePath });
}

export async function closeBrowserSession(session: BrowserSession): Promise<void> {
  await session.page.close().catch(() => undefined);
  await session.context.close().catch(() => undefined);

  if (session.browserOwned) {
    await session.browser.close().catch(() => undefined);
  }
}