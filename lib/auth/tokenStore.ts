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
  console.log(`[Redis Debug] Getting tokens for user: ${sub}`);
  const redis = getRedisClient();
  const key = `user:${sub}:tokens`;
  console.log(`[Redis Debug] Using key: ${key}`);

  // Check if key exists and its TTL
  const keyExists = await redis.exists(key);
  const ttl = await redis.ttl(key);
  console.log(`[Redis Debug] Key exists: ${keyExists}, TTL: ${ttl} seconds`);

  const data = await redis.hgetall(key);
  console.log(`[Redis Debug] Raw data from Redis:`, data);
  console.log(`[Redis Debug] Data keys:`, Object.keys(data));
  console.log(
    `[Redis Debug] Data is empty:`,
    !data || Object.keys(data).length === 0
  );

  if (!data || Object.keys(data).length === 0) {
    console.log(`[Redis Debug] No data found, returning null`);
    return null;
  }

  const result = {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    idToken: data.idToken,
    expiresAt: parseInt(data.expiresAt ?? "0", 10),
    brand: data.brand,
    roles: JSON.parse(data.roles ?? "[]"),
  };

  console.log(`[Redis Debug] Parsed result:`, {
    hasAccessToken: !!result.accessToken,
    hasRefreshToken: !!result.refreshToken,
    hasIdToken: !!result.idToken,
    expiresAt: result.expiresAt,
    brand: result.brand,
    roles: result.roles,
    accessTokenLength: result.accessToken?.length || 0,
  });

  return result;
}

export async function deleteUserTokens(sub: string) {
  const redis = getRedisClient();
  const key = `user:${sub}:tokens`;
  await redis.del(key);
}
