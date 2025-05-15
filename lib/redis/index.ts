import { createClient } from "redis";

let redisClient: ReturnType<typeof createClient> | null = null;

export function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL,
    });

    redisClient.on("error", (err) => {
      console.error("Redis Client Error", err);
    });

    // Connect only when needed
    if (!redisClient.isOpen) {
      redisClient.connect().catch((err) => {
        console.error("Redis Connection Failed", err);
      });
    }
  }

  return redisClient;
}
