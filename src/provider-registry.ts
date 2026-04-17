import type { SearchProvider } from "./provider.js";
import type { SearchEngine } from "./types.js";
import { BaiduProvider } from "./providers/baidu-provider.js";
import { GoogleProvider } from "./providers/google-provider.js";

export class SearchProviderRegistry {
  private readonly providers = new Map<SearchEngine, SearchProvider>();

  register(provider: SearchProvider): void {
    this.providers.set(provider.engine, provider);
  }

  get(engine: SearchEngine): SearchProvider {
    const provider = this.providers.get(engine);
    if (!provider) {
      throw new Error(`Unsupported search engine: ${engine}`);
    }

    return provider;
  }

  list(): SearchEngine[] {
    return Array.from(this.providers.keys());
  }
}

export function createSearchProviderRegistry(): SearchProviderRegistry {
  const registry = new SearchProviderRegistry();
  registry.register(new GoogleProvider());
  registry.register(new BaiduProvider());
  return registry;
}