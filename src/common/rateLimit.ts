import { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { env } from "../config/env.js";

export async function registerRateLimit(app: FastifyInstance) {
  await app.register(rateLimit, {
    max: env.RATE_LIMIT_PER_MINUTE,
    timeWindow: "1 minute",
    keyGenerator: (request) => {
      const userId = (request as any).user?.id;
      return userId ? `user:${userId}` : request.ip;
    },
    addHeaders: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "retry-after": true
    }
  });
}
