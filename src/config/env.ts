import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().default("postgresql://otakudb:otakudb@localhost:5432/otakudb"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  MEILISEARCH_HOST: z.string().default("http://localhost:7700"),
  MEILISEARCH_API_KEY: z.string().default("dev_meili_key"),
  JWT_ACCESS_SECRET: z.string().min(8).default("change_me"),
  JWT_REFRESH_SECRET: z.string().min(8).default("change_me"),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL: z.string().default("30d"),
  ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),
  ENABLE_GRAPHQL_INTROSPECTION: z
    .string()
    .transform((value) => value === "true")
    .default("true"),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(90),
  ANILIST_GRAPHQL_ENDPOINT: z.string().url().default("https://graphql.anilist.co"),
  ANILIST_ACCESS_TOKEN: z.string().optional().default(""),
  ANILIST_REQUESTS_PER_MINUTE: z.coerce.number().int().positive().default(60)
});

export const env = schema.parse(process.env);

export const allowedOrigins = env.ALLOWED_ORIGINS.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
