// §27.2 — Provider-side cache flushing primitives.
// When a designed plan or held-token snapshot changes, caches must be flushed
// to all providers so stale last-known state is not honored offline.
import Redis from "ioredis";
import { providerCacheKey } from "./signed-token";

export interface ProviderCacheFlusher {
  flushProvider(providerRef: string): Promise<void>;
  flushAllProviders(): Promise<void>;
}

/**
 * §27.2 — Redis-backed provider cache flusher.
 * Marks a per-provider cache dirty so providers re-pull the last-known state.
 */
export class RedisProviderCacheFlusher implements ProviderCacheFlusher {
  constructor(private readonly redis: Redis) {}

  async flushProvider(providerRef: string): Promise<void> {
    await this.redis.del(providerCacheKey(providerRef));
  }

  async flushAllProviders(): Promise<void> {
    const keys = await this.redis.keys("ep:providertoken:*");
    if (keys.length) await this.redis.del(...keys);
  }
}
