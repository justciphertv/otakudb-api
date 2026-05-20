import {
  FavouriteType,
  LikeTargetType,
  MediaListStatus,
  MediaType,
  Prisma,
  PrismaClient,
  ReviewRatingValue,
  User
} from "@prisma/client";
import { Redis } from "ioredis";
import { z } from "zod";
import { AppError, notFoundError } from "../common/errors.js";
import { normalizePage } from "../common/pagination.js";
import { canViewPrivate } from "../common/permissions.js";
import { sanitizeText, slugify } from "../common/sanitize.js";
import { SearchService } from "./search/search.service.js";

const mediaInputSchema = z.object({
  type: z.nativeEnum(MediaType),
  format: z.string(),
  status: z.string(),
  titleRomaji: z.string().min(1),
  titleEnglish: z.string().nullable().optional(),
  titleNative: z.string().nullable().optional(),
  description: z.string().min(1),
  season: z.string().nullable().optional(),
  seasonYear: z.number().int().nullable().optional(),
  episodes: z.number().int().nullable().optional(),
  chapters: z.number().int().nullable().optional(),
  volumes: z.number().int().nullable().optional(),
  duration: z.number().int().nullable().optional(),
  averageScore: z.number().int().min(0).max(100).optional(),
  popularity: z.number().int().optional(),
  isAdult: z.boolean().optional()
});

export class OtakuService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis | null,
    private readonly search: SearchService
  ) {}

  async getCached<T>(key: string, loader: () => Promise<T>, ttlSeconds = 300) {
    if (!this.redis) return loader();
    const cached = await this.redis.get(key).catch(() => null);
    if (cached) return JSON.parse(cached) as T;
    const value = await loader();
    await this.redis.set(key, JSON.stringify(value), "EX", ttlSeconds).catch(() => undefined);
    return value;
  }

  async clearMetadataCache(kind: string, id?: number) {
    if (!this.redis) return;
    const keys = [`${kind}:collection`];
    if (id) keys.push(`${kind}:${id}`);
    await this.redis.del(...keys).catch(() => undefined);
  }

  mediaWhere(args: any): Prisma.MediaWhereInput {
    const where: Prisma.MediaWhereInput = {};
    if (args.id) where.id = args.id;
    if (args.idMal) where.idMal = args.idMal;
    if (args.id_in?.length) where.id = { in: args.id_in };
    if (args.id_not_in?.length) where.id = { notIn: args.id_not_in };
    if (args.type) where.type = args.type;
    if (args.format) where.format = args.format;
    if (args.format_in?.length) where.format = { in: args.format_in };
    if (args.status) where.status = args.status;
    if (args.status_in?.length) where.status = { in: args.status_in };
    if (args.season) where.season = args.season;
    if (args.seasonYear) where.seasonYear = args.seasonYear;
    if (args.isAdult !== undefined && args.isAdult !== null) where.isAdult = args.isAdult;
    if (args.genre) where.genres = { some: { genre: { name: args.genre } } };
    if (args.genre_in?.length) where.genres = { some: { genre: { name: { in: args.genre_in } } } };
    if (args.tag) where.tags = { some: { tag: { name: args.tag } } };
    if (args.tag_in?.length) where.tags = { some: { tag: { name: { in: args.tag_in } } } };
    if (args.episodes_greater) where.episodes = { gt: args.episodes_greater };
    if (args.episodes_lesser) where.episodes = { lt: args.episodes_lesser };
    if (args.duration_greater) where.duration = { gt: args.duration_greater };
    if (args.duration_lesser) where.duration = { lt: args.duration_lesser };
    if (args.averageScore_greater) where.averageScore = { gt: args.averageScore_greater };
    if (args.averageScore_lesser) where.averageScore = { lt: args.averageScore_lesser };
    if (args.popularity_greater) where.popularity = { gt: args.popularity_greater };
    if (args.popularity_lesser) where.popularity = { lt: args.popularity_lesser };
    if (args.search) {
      where.OR = [
        { titleRomaji: { contains: args.search, mode: "insensitive" } },
        { titleEnglish: { contains: args.search, mode: "insensitive" } },
        { titleNative: { contains: args.search, mode: "insensitive" } },
        { description: { contains: args.search, mode: "insensitive" } },
        { synonyms: { some: { text: { contains: args.search, mode: "insensitive" } } } },
        { genres: { some: { genre: { name: { contains: args.search, mode: "insensitive" } } } } },
        { tags: { some: { tag: { name: { contains: args.search, mode: "insensitive" } } } } }
      ];
    }
    return where;
  }

  mediaOrder(sort?: string[] | null): Prisma.MediaOrderByWithRelationInput[] {
    const sorts = sort?.length ? sort : ["POPULARITY_DESC"];
    return sorts
      .filter((item) => item !== "SEARCH_MATCH")
      .map((item) => {
        const desc = item.endsWith("_DESC");
        const clean = item.replace(/_DESC$/, "");
        const direction = desc ? "desc" : "asc";
        const map: Record<string, keyof Prisma.MediaOrderByWithRelationInput> = {
          ID: "id",
          TITLE_ROMAJI: "titleRomaji",
          TITLE_ENGLISH: "titleEnglish",
          START_DATE: "startDateYear",
          END_DATE: "endDateYear",
          SCORE: "averageScore",
          POPULARITY: "popularity",
          TRENDING: "trending",
          FAVOURITES: "favourites",
          UPDATED_AT: "updatedAt"
        };
        return { [map[clean] ?? "id"]: direction };
      });
  }

  async media(args: any) {
    const where = this.mediaWhere(args);
    if (args.id && Object.keys(args).length <= 1) {
      return this.getCached(`media:${args.id}`, () => this.prisma.media.findUnique({ where: { id: args.id } }));
    }
    return this.prisma.media.findFirst({ where, orderBy: this.mediaOrder(args.sort) });
  }

  async mediaPage(args: any) {
    const page = normalizePage(args);
    let where = this.mediaWhere(args);
    if (args.search && args.sort?.includes("SEARCH_MATCH")) {
      const ids = await this.search.searchMedia(args.search, { type: args.type, isAdult: args.isAdult });
      where = { AND: [where, { id: { in: ids.length ? ids : [-1] } }] };
    }
    return this.prisma.media.findMany({
      where,
      orderBy: this.mediaOrder(args.sort),
      skip: page.skip,
      take: page.take
    });
  }

  async mediaCount(args: any) {
    return this.prisma.media.count({ where: this.mediaWhere(args) });
  }

  async characters(args: any) {
    const page = normalizePage(args);
    return this.prisma.character.findMany({
      where: args.search ? { nameFull: { contains: args.search, mode: "insensitive" } } : {},
      orderBy: args.sort?.[0] === "FAVOURITES_DESC" ? { favourites: "desc" } : { id: "asc" },
      skip: page.skip,
      take: page.take
    });
  }

  async staff(args: any) {
    const page = normalizePage(args);
    return this.prisma.staff.findMany({
      where: args.search ? { nameFull: { contains: args.search, mode: "insensitive" } } : {},
      orderBy: args.sort?.[0] === "FAVOURITES_DESC" ? { favourites: "desc" } : { id: "asc" },
      skip: page.skip,
      take: page.take
    });
  }

  async studios(args: any) {
    const page = normalizePage(args);
    return this.prisma.studio.findMany({
      where: args.search ? { name: { contains: args.search, mode: "insensitive" } } : {},
      orderBy: { id: "asc" },
      skip: page.skip,
      take: page.take
    });
  }

  async users(args: any) {
    const page = normalizePage(args);
    return this.prisma.user.findMany({
      where: args.search
        ? { OR: [{ name: { contains: args.search, mode: "insensitive" } }] }
        : args.name
          ? { name: args.name }
          : args.id
            ? { id: args.id }
            : {},
      skip: page.skip,
      take: page.take
    });
  }

  async mediaList(args: any, viewer?: User | null) {
    const where: Prisma.MediaListEntryWhereInput = {};
    if (args.id) where.id = args.id;
    if (args.userId) where.userId = args.userId;
    if (args.userName) where.user = { name: args.userName };
    if (args.mediaId) where.mediaId = args.mediaId;
    if (args.status) where.status = args.status;
    if (args.type) where.media = { type: args.type };
    const row = await this.prisma.mediaListEntry.findFirst({ where, include: { media: true, user: true } });
    if (!row) return null;
    if (row.private && !canViewPrivate(row.userId, viewer)) return null;
    return row;
  }

  async listCollection(args: any, viewer?: User | null) {
    const user = args.userId
      ? await this.prisma.user.findUnique({ where: { id: args.userId } })
      : await this.prisma.user.findUnique({ where: { name: args.userName } });
    if (!user) throw notFoundError("User");
    const canPrivate = canViewPrivate(user.id, viewer);
    const entries = await this.prisma.mediaListEntry.findMany({
      where: {
        userId: user.id,
        ...(args.status ? { status: args.status } : {}),
        ...(args.type ? { media: { type: args.type } } : {}),
        ...(canPrivate ? {} : { private: false })
      },
      include: { media: true },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }]
    });
    const groups = new Map<string, any[]>();
    for (const entry of entries) {
      const key = entry.status;
      groups.set(key, [...(groups.get(key) ?? []), entry]);
    }
    return {
      user,
      lists: [...groups.entries()].map(([status, groupEntries]) => ({
        name: status,
        status,
        entries: groupEntries
      }))
    };
  }

  async saveMediaListEntry(user: User, input: any) {
    const data = z
      .object({
        mediaId: z.number().int(),
        status: z.nativeEnum(MediaListStatus),
        score: z.number().optional(),
        progress: z.number().int().optional(),
        progressVolumes: z.number().int().nullable().optional(),
        repeat: z.number().int().optional(),
        priority: z.number().int().optional(),
        private: z.boolean().optional(),
        notes: z.string().nullable().optional()
      })
      .parse(input);
    return this.prisma.mediaListEntry.upsert({
      where: { userId_mediaId: { userId: user.id, mediaId: data.mediaId } },
      create: { ...data, notes: sanitizeText(data.notes), userId: user.id, scoreRaw: Math.round((data.score ?? 0) * 10) },
      update: { ...data, notes: sanitizeText(data.notes), scoreRaw: Math.round((data.score ?? 0) * 10) }
    });
  }

  async deleteMediaListEntry(user: User, id: number) {
    const entry = await this.prisma.mediaListEntry.findUnique({ where: { id } });
    if (!entry || !canViewPrivate(entry.userId, user)) throw notFoundError("Media list entry");
    await this.prisma.mediaListEntry.delete({ where: { id } });
    return { deleted: true };
  }

  async toggleFavourite(user: User, input: any) {
    const pairs = [
      ["mediaId", input.animeId ?? input.mangaId, input.animeId ? FavouriteType.ANIME : FavouriteType.MANGA],
      ["characterId", input.characterId, FavouriteType.CHARACTER],
      ["staffId", input.staffId, FavouriteType.STAFF],
      ["studioId", input.studioId, FavouriteType.STUDIO]
    ] as const;
    const target = pairs.find(([, id]) => Boolean(id));
    if (!target) throw new AppError("Favourite target is required");
    const [field, id, type] = target;
    const existing = await this.prisma.favourite.findFirst({
      where: { userId: user.id, type, [field]: id } as any
    });
    if (existing) await this.prisma.favourite.delete({ where: { id: existing.id } });
    else await this.prisma.favourite.create({ data: { userId: user.id, type, [field]: id } as any });
    return this.favourites(user.id);
  }

  async favourites(userId: number) {
    return {
      anime: await this.prisma.favourite.findMany({ where: { userId, type: FavouriteType.ANIME }, include: { media: true } }),
      manga: await this.prisma.favourite.findMany({ where: { userId, type: FavouriteType.MANGA }, include: { media: true } }),
      characters: await this.prisma.favourite.findMany({ where: { userId, type: FavouriteType.CHARACTER }, include: { character: true } }),
      staff: await this.prisma.favourite.findMany({ where: { userId, type: FavouriteType.STAFF }, include: { staff: true } }),
      studios: await this.prisma.favourite.findMany({ where: { userId, type: FavouriteType.STUDIO }, include: { studio: true } })
    };
  }

  async toggleFollow(user: User, userId: number) {
    if (user.id === userId) throw new AppError("Cannot follow yourself");
    const existing = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: user.id, followingId: userId } }
    });
    if (existing) await this.prisma.follow.delete({ where: { id: existing.id } });
    else await this.prisma.follow.create({ data: { followerId: user.id, followingId: userId } });
    return this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
  }

  async saveReview(user: User, input: any) {
    const data = z
      .object({
        id: z.number().int().optional().nullable(),
        mediaId: z.number().int(),
        summary: z.string().min(1).max(160),
        body: z.string().min(1),
        score: z.number().int().min(0).max(100),
        private: z.boolean().optional()
      })
      .parse(input);
    const payload = {
      mediaId: data.mediaId,
      summary: sanitizeText(data.summary) ?? data.summary,
      body: sanitizeText(data.body) ?? data.body,
      score: data.score,
      private: data.private ?? false
    };
    if (data.id) return this.prisma.review.update({ where: { id: data.id }, data: payload });
    return this.prisma.review.create({ data: { ...payload, userId: user.id } });
  }

  async rateReview(user: User, reviewId: number, rating: ReviewRatingValue) {
    await this.prisma.reviewRating.upsert({
      where: { reviewId_userId: { reviewId, userId: user.id } },
      create: { reviewId, userId: user.id, rating },
      update: { rating }
    });
    const ratings = await this.prisma.reviewRating.findMany({ where: { reviewId } });
    const score = ratings.reduce((sum, item) => sum + (item.rating === ReviewRatingValue.UPVOTE ? 1 : -1), 0);
    return this.prisma.review.update({
      where: { id: reviewId },
      data: { rating: score, ratingAmount: ratings.length }
    });
  }

  async saveActivity(user: User, input: any) {
    const isMessage = Boolean(input.recipientId);
    return this.prisma.activity.upsert({
      where: { id: input.id ?? 0 },
      create: {
        userId: user.id,
        type: isMessage ? "MESSAGE" : "TEXT",
        messageRecipientId: input.recipientId ?? null,
        text: sanitizeText(input.text)
      },
      update: { text: sanitizeText(input.text), messageRecipientId: input.recipientId ?? null }
    });
  }

  async saveActivityReply(user: User, input: any) {
    const reply = await this.prisma.activityReply.upsert({
      where: { id: input.id ?? 0 },
      create: { activityId: input.activityId, userId: user.id, text: sanitizeText(input.text) ?? "" },
      update: { text: sanitizeText(input.text) ?? "" }
    });
    await this.prisma.activity.update({
      where: { id: input.activityId },
      data: { replyCount: await this.prisma.activityReply.count({ where: { activityId: input.activityId } }) }
    });
    return reply;
  }

  async deleteActivity(user: User, id: number) {
    await this.prisma.activity.delete({ where: { id, userId: user.id } as any });
    return { deleted: true };
  }

  async deleteActivityReply(user: User, id: number) {
    await this.prisma.activityReply.delete({ where: { id, userId: user.id } as any });
    return { deleted: true };
  }

  async toggleLike(user: User, id: number, type: LikeTargetType) {
    const existing = await this.prisma.like.findUnique({
      where: { userId_targetType_targetId: { userId: user.id, targetType: type, targetId: id } }
    });
    if (existing) await this.prisma.like.delete({ where: { id: existing.id } });
    else await this.prisma.like.create({ data: { userId: user.id, targetType: type, targetId: id } });
    const count = await this.prisma.like.count({ where: { targetType: type, targetId: id } });
    if (type === LikeTargetType.ACTIVITY) {
      return this.prisma.activity.update({ where: { id }, data: { likeCount: count } });
    }
    if (type === LikeTargetType.ACTIVITY_REPLY) {
      return this.prisma.activityReply.update({ where: { id }, data: { likeCount: count } });
    }
    return this.prisma.review.findUniqueOrThrow({ where: { id } });
  }

  async adminCreateMedia(input: any, actorId: number) {
    const data = mediaInputSchema.parse(input);
    const media = await this.prisma.media.create({
      data: {
        ...data,
        format: data.format as any,
        status: data.status as any,
        season: data.season as any,
        slug: slugify(data.titleRomaji),
        description: sanitizeText(data.description) ?? data.description
      } as any
    });
    await this.prisma.auditLog.create({
      data: { actorId, action: "MEDIA_CREATE", targetType: "MEDIA", targetId: media.id, metadata: input }
    });
    await this.search.indexMedia(media.id);
    await this.clearMetadataCache("media", media.id);
    return media;
  }

  async adminUpdateMedia(id: number, input: any, actorId: number) {
    const media = await this.prisma.media.update({
      where: { id },
      data: { ...input, description: input.description ? sanitizeText(input.description) : undefined } as any
    });
    await this.prisma.auditLog.create({
      data: { actorId, action: "MEDIA_UPDATE", targetType: "MEDIA", targetId: media.id, metadata: input }
    });
    await this.search.indexMedia(media.id);
    await this.clearMetadataCache("media", media.id);
    return media;
  }

  async adminDeleteMedia(id: number, actorId: number) {
    await this.prisma.media.delete({ where: { id } });
    await this.prisma.auditLog.create({
      data: { actorId, action: "MEDIA_DELETE", targetType: "MEDIA", targetId: id, metadata: {} }
    });
    await this.search.deleteMedia(id);
    await this.clearMetadataCache("media", id);
    return { deleted: true };
  }
}
