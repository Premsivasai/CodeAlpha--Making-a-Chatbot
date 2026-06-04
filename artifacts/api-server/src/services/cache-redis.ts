let redisClient: any = null;

// Dynamically check and resolve Redis imports to avoid build-time issues if the client package is missing
if (process.env.REDIS_URL) {
  // @ts-ignore
  import("redis")
    .then(({ createClient }) => {
      redisClient = createClient({ url: process.env.REDIS_URL });
      redisClient.connect().catch((err: any) => {
        console.warn("[WARNING] Redis connection failed, applying in-memory fallback:", err);
        redisClient = null;
      });
    })
    .catch(() => {
      console.log("[INFO] Redis package is not installed. Using in-memory fallback cache.");
    });
}

interface CacheItem {
  value: string;
  expiresAt: number;
}

const localCacheStore = new Map<string, CacheItem>();

export async function getCacheItem(key: string): Promise<string | null> {
  if (redisClient && typeof redisClient.get === "function") {
    try {
      return (await redisClient.get(key)) as string | null;
    } catch (err) {
      console.error("[ERROR] Redis get failed:", err);
    }
  }

  const cached = localCacheStore.get(key);
  if (!cached) return null;

  if (Date.now() > cached.expiresAt) {
    localCacheStore.delete(key);
    return null;
  }

  return cached.value;
}

export async function setCacheItem(
  key: string,
  value: string,
  ttlSeconds = 300
): Promise<void> {
  if (redisClient && typeof redisClient.set === "function") {
    try {
      await redisClient.set(key, value, { EX: ttlSeconds });
      return;
    } catch (err) {
      console.error("[ERROR] Redis set failed:", err);
    }
  }

  localCacheStore.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000
  });
}
