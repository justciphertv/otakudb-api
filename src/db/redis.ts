// @ts-nocheck
import Redis from "ioredis";
import { env } from "../config/env.js";

export function createRedis() {
  const redis = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 2 });
  redis.on("error", (error) => {
    if (env.NODE_ENV !== "test") console.error("Redis error", error.message);
  });
  return redis;
}
