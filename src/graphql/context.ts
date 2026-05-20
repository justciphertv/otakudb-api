import DataLoader from "dataloader";
import { FastifyRequest } from "fastify";
import { PrismaClient, User } from "@prisma/client";
import { Redis } from "ioredis";
import { prisma } from "../db/prisma.js";
import { createRedis } from "../db/redis.js";
import { meili } from "../db/search.js";
import { verifyAccessToken } from "../auth/jwt.js";
import { AuthService } from "../auth/auth.service.js";
import { OtakuService } from "../modules/otaku.service.js";
import { SearchService } from "../modules/search/search.service.js";

const redis = createRedis();
const search = new SearchService(meili, prisma);

export type Loaders = {
  mediaById: DataLoader<number, any | null>;
  userById: DataLoader<number, any | null>;
};

export type GraphQLContext = {
  prisma: PrismaClient;
  redis: Redis;
  viewer: User | null;
  auth: AuthService;
  service: OtakuService;
  search: SearchService;
  loaders: Loaders;
  request: FastifyRequest;
};

export async function buildContext(request: FastifyRequest): Promise<GraphQLContext> {
  if (redis.status === "wait") {
    await redis.connect().catch(() => undefined);
  }
  const viewer = await resolveViewer(request);
  (request as any).user = viewer;
  const loaders = createLoaders(prisma);
  return {
    prisma,
    redis,
    viewer,
    auth: new AuthService(prisma),
    service: new OtakuService(prisma, redis, search),
    search,
    loaders,
    request
  };
}

async function resolveViewer(request: FastifyRequest) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const payload = verifyAccessToken(header.slice("Bearer ".length));
    return prisma.user.findUnique({ where: { id: Number(payload.sub) } });
  } catch {
    return null;
  }
}

function createLoaders(client: PrismaClient): Loaders {
  return {
    mediaById: new DataLoader(async (ids: readonly number[]) => {
      const rows = await client.media.findMany({ where: { id: { in: [...ids] } } });
      return ids.map((id) => rows.find((row) => row.id === id) ?? null);
    }),
    userById: new DataLoader(async (ids: readonly number[]) => {
      const rows = await client.user.findMany({ where: { id: { in: [...ids] } } });
      return ids.map((id) => rows.find((row) => row.id === id) ?? null);
    })
  };
}
