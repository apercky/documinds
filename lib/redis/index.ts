import { createClient } from "redis";

let redisClient: ReturnType<typeof createClient> | null = null;

export function getRedisClient() {
  if (!redisClient) {
    const redisConfig: any = {
      url: process.env.REDIS_URL,
    };

    // Only add password if it's actually set and not empty
    if (
      process.env.REDIS_PASSWORD &&
      process.env.REDIS_PASSWORD.trim() !== ""
    ) {
      redisConfig.password = process.env.REDIS_PASSWORD;
      console.log("Redis: Using password authentication");
    } else {
      console.log("Redis: No password authentication");
    }

    console.log("Redis: Attempting to connect to:", process.env.REDIS_URL);

    redisClient = createClient(redisConfig);

    redisClient.on("error", (err) => {
      console.error("Redis Client Error:", err);
      console.error("Redis URL:", process.env.REDIS_URL);
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

    // Connect only when needed
    if (!redisClient.isOpen) {
      redisClient.connect().catch((err) => {
        console.error("Redis Connection Failed:", err);
        console.error("Redis URL:", process.env.REDIS_URL);
      });
    }
  }

  return redisClient;
}
