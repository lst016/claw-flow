import Redis from "ioredis";
import { MemoryStore } from "@/lib/store/memory-store";
import { RedisStore } from "@/lib/store/redis-store";
import type { Store } from "@/lib/store/types";
import { getRetentionSeconds } from "@/lib/utils/time";

declare global {
  var __clawMemoryStore: Store | undefined;
}

function createStore(): Store {
  const retentionSeconds = getRetentionSeconds();
  const redisUrl = process.env.REDIS_URL?.trim();

  if (!redisUrl) {
    return new MemoryStore(retentionSeconds);
  }

  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
  });

  redis.connect().catch(() => {
    // Remove REDIS_URL to fall back to memory mode during local development.
  });

  return new RedisStore(redis, retentionSeconds);
}

export const store = globalThis.__clawMemoryStore ?? createStore();

if (!globalThis.__clawMemoryStore) {
  globalThis.__clawMemoryStore = store;
}
