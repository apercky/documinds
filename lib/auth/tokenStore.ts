import { createClient } from "redis";

const redis = createClient({ url: process.env.REDIS_URL });

redis.on("error", (err) => console.error("Redis Client Error", err));

await redis.connect();

export async function storeUserTokens(
  sub: string,
  tokens: {
    accessToken: string;
    refreshToken: string;
    idToken?: string;
    expiresAt: number;
    brand?: string;
    roles?: string[];
  }
) {
  const key = `user:${sub}:tokens`;
  await redis.hSet(key, {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    idToken: tokens.idToken ?? "",
    expiresAt: tokens.expiresAt.toString(),
    brand: tokens.brand ?? "",
    roles: JSON.stringify(tokens.roles ?? []),
  });

  const ttl = tokens.expiresAt - Math.floor(Date.now() / 1000) + 7200;
  await redis.expire(key, Math.max(ttl, 0));
}

export async function getUserTokens(sub: string) {
  const key = `user:${sub}:tokens`;
  const data = await redis.hGetAll(key);
  if (!data || Object.keys(data).length === 0) return null;

  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    idToken: data.idToken,
    expiresAt: parseInt(data.expiresAt as string, 10),
    brand: data.brand,
    roles: JSON.parse((data.roles || "[]") as string),
  };
}

export async function deleteUserTokens(sub: string) {
  const key = `user:${sub}:tokens`;
  await redis.del(key);
}
