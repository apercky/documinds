import { getRedisClient } from "@/lib/redis";

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
  process.stderr.write(`[Redis Debug] Storing tokens for user: ${sub}\n`);
  const redis = getRedisClient();
  const key = `user:${sub}:tokens`;

  // ioredis usa lo stesso metodo hset ma con argomenti come key, field1, value1, field2, value2...
  await redis.hset(
    key,
    "accessToken",
    tokens.accessToken,
    "refreshToken",
    tokens.refreshToken,
    "idToken",
    tokens.idToken ?? "",
    "expiresAt",
    tokens.expiresAt.toString(),
    "brand",
    tokens.brand ?? "",
    "roles",
    JSON.stringify(tokens.roles ?? [])
  );

  // TTL: tempo in secondi
  const ttl = tokens.expiresAt - Math.floor(Date.now() / 1000) + 7200;
  await redis.expire(key, Math.max(ttl, 0));

  process.stderr.write(
    `[Redis Debug] Tokens stored successfully for user: ${sub}\n`
  );
}

export async function getUserTokens(sub: string) {
  const redis = getRedisClient();
  const key = `user:${sub}:tokens`;

  const data = await redis.hgetall(key);
  if (!data || Object.keys(data).length === 0) return null;

  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    idToken: data.idToken,
    expiresAt: parseInt(data.expiresAt ?? "0", 10),
    brand: data.brand,
    roles: JSON.parse(data.roles ?? "[]"),
  };
}

export async function deleteUserTokens(sub: string) {
  const redis = getRedisClient();
  const key = `user:${sub}:tokens`;
  await redis.del(key);
}
