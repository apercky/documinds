import Redis, { RedisOptions } from "ioredis";

let redisClient: Redis | null = null;

export function getRedisClient() {
  if (!redisClient) {
    const hostUrl = process.env.REDIS_URL || "redis://localhost:6379";

    const usePassword =
      process.env.REDIS_PASSWORD && process.env.REDIS_PASSWORD.trim() !== "";

    const redisOptions: RedisOptions = {
      connectTimeout: parseInt(
        process.env.REDIS_CONNECT_TIMEOUT ?? "10000",
        10
      ),
      commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT ?? "5000", 10),
      maxRetriesPerRequest: parseInt(
        process.env.REDIS_RETRY_ATTEMPTS ?? "3",
        10
      ),
      retryStrategy: (times) => Math.min(times * 100, 2000),
    };

    if (usePassword) {
      redisOptions.password = process.env.REDIS_PASSWORD;
      console.log("Redis: Using password authentication");
    } else {
      console.log("Redis: No password authentication");
    }

    console.log("Redis: Attempting to connect to:", hostUrl);

    redisClient = new Redis(hostUrl, redisOptions);

    redisClient.on("error", (err) => {
      console.error("Redis Client Error:", err);
      console.error("Redis URL:", hostUrl);
    });

    redisClient.on("connect", () => {
      console.log("Redis: Connected successfully");
    });

    redisClient.on("ready", () => {
      console.log("Redis: Ready to accept commands");
    });

    redisClient.on("end", () => {
      console.log("Redis: Connection ended");
    });
  }

  return redisClient;
}
