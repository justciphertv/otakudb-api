// @ts-nocheck
import SchemaBuilder from "@pothos/core";
import { GraphQLError } from "graphql";
import {
  ActivityType,
  FavouriteType,
  LikeTargetType,
  MediaFormat,
  MediaListStatus,
  MediaSeason,
  MediaSource,
  MediaStatus,
  MediaType,
  ReviewRatingValue,
  ScoreFormat,
  UserRole,
  UserTitleLanguage
} from "@prisma/client";
import { GraphQLContext } from "./context.js";
import { normalizePage, pageInfo } from "../common/pagination.js";
import { assertAuth, assertModerator } from "../auth/guards.js";

type Objects = {
  PageState: { page: number; perPage: number; args: any };
  Deleted: { deleted: boolean };
  MediaListCollection: { user: any; lists: any[] };
  MediaListGroup: { name: string; status: string; entries: any[] };
};

const builder = new SchemaBuilder<{
  Context: GraphQLContext;
  Objects: Objects;
}>({});

const enumValues = <T extends Record<string, string>>(value: T) => Object.values(value) as any;

const MediaTypeEnum = builder.enumType("MediaType", { values: enumValues(MediaType) });
const MediaFormatEnum = builder.enumType("MediaFormat", { values: enumValues(MediaFormat) });
const MediaStatusEnum = builder.enumType("MediaStatus", { values: enumValues(MediaStatus) });
const MediaSeasonEnum = builder.enumType("MediaSeason", { values: enumValues(MediaSeason) });
const MediaSourceEnum = builder.enumType("MediaSource", { values: enumValues(MediaSource) });
const ScoreFormatEnum = builder.enumType("ScoreFormat", { values: enumValues(ScoreFormat) });
const UserTitleLanguageEnum = builder.enumType("UserTitleLanguage", {
  values: enumValues(UserTitleLanguage)
});
const MediaListStatusEnum = builder.enumType("MediaListStatus", {
  values: enumValues(MediaListStatus)
});
const ActivityTypeEnum = builder.enumType("ActivityType", { values: enumValues(ActivityType) });
const LikeableTypeEnum = builder.enumType("LikeableType", { values: enumValues(LikeTargetType) });
const ReviewRatingEnum = builder.enumType("ReviewRating", { values: enumValues(ReviewRatingValue) });
const UserRoleEnum = builder.enumType("UserRole", { values: enumValues(UserRole) });

const MediaSortEnum = builder.enumType("MediaSort", {
  values: [
    "ID",
    "ID_DESC",
    "TITLE_ROMAJI",
    "TITLE_ROMAJI_DESC",
    "TITLE_ENGLISH",
    "TITLE_ENGLISH_DESC",
    "START_DATE",
    "START_DATE_DESC",
    "END_DATE",
    "END_DATE_DESC",
    "SCORE",
    "SCORE_DESC",
    "POPULARITY",
    "POPULARITY_DESC",
    "TRENDING",
    "TRENDING_DESC",
    "FAVOURITES",
    "FAVOURITES_DESC",
    "UPDATED_AT",
    "UPDATED_AT_DESC",
    "SEARCH_MATCH"
  ] as const
});
builder.enumType("CharacterSort", { values: ["ID", "ID_DESC", "FAVOURITES_DESC", "SEARCH_MATCH"] as const });
builder.enumType("StaffSort", { values: ["ID", "ID_DESC", "FAVOURITES_DESC", "SEARCH_MATCH"] as const });
builder.enumType("StudioSort", { values: ["ID", "ID_DESC", "SEARCH_MATCH"] as const });
builder.enumType("UserSort", { values: ["ID", "ID_DESC", "USERNAME", "USERNAME_DESC"] as const });
builder.enumType("MediaListSort", { values: ["MEDIA_ID", "MEDIA_ID_DESC", "UPDATED_TIME_DESC"] as const });
builder.enumType("ActivitySort", { values: ["ID", "ID_DESC", "PINNED"] as const });

const FuzzyDate = builder.objectRef<any>("FuzzyDate").implement({
  fields: (t) => ({
    year: t.exposeInt("year", { nullable: true }),
    month: t.exposeInt("month", { nullable: true }),
    day: t.exposeInt("day", { nullable: true })
  })
});

const MediaTitle = builder.objectRef<any>("MediaTitle").implement({
  fields: (t) => ({
    romaji: t.exposeString("romaji", { nullable: true }),
    english: t.exposeString("english", { nullable: true }),
    native: t.exposeString("native", { nullable: true })
  })
});

const MediaCoverImage = builder.objectRef<any>("MediaCoverImage").implement({
  fields: (t) => ({
    large: t.exposeString("large", { nullable: true }),
    medium: t.exposeString("medium", { nullable: true })
  })
});

const MediaTrailer = builder.objectRef<any>("MediaTrailer").implement({
  fields: (t) => ({
    id: t.exposeString("id", { nullable: true }),
    site: t.exposeString("site", { nullable: true })
  })
});

const UserAvatar = builder.objectRef<any>("UserAvatar").implement({
  fields: (t) => ({
    large: t.exposeString("large", { nullable: true }),
    medium: t.exposeString("medium", { nullable: true })
  })
});

const UserRef = builder.objectRef<any>("User").implement({
  fields: (t) => ({
    id: t.exposeInt("id"),
    name: t.exposeString("name"),
    email: t.string({
      nullable: true,
      resolve: (user, _args, ctx) =>
        ctx.viewer?.id === user.id || ctx.viewer?.role === "ADMIN" ? user.email : null
    }),
    avatar: t.field({
      type: UserAvatar,
      resolve: (user) => ({ large: user.avatarImage, medium: user.avatarImage })
    }),
    bannerImage: t.exposeString("bannerImage", { nullable: true }),
    about: t.exposeString("about", { nullable: true }),
    role: t.expose("role", { type: UserRoleEnum }),
    titleLanguage: t.expose("titleLanguage", { type: UserTitleLanguageEnum }),
    scoreFormat: t.expose("scoreFormat", { type: ScoreFormatEnum }),
    displayAdultContent: t.exposeBoolean("displayAdultContent"),
    timezone: t.exposeString("timezone")
  })
});

const MediaTagRef = builder.objectRef<any>("MediaTag").implement({
  fields: (t) => ({
    id: t.exposeInt("id"),
    name: t.exposeString("name"),
    description: t.exposeString("description"),
    category: t.exposeString("category"),
    rank: t.exposeInt("rank"),
    isAdult: t.exposeBoolean("isAdult"),
    isGeneralSpoiler: t.exposeBoolean("isGeneralSpoiler"),
    isMediaSpoiler: t.exposeBoolean("isMediaSpoiler")
  })
});

const StudioRef = builder.objectRef<any>("Studio").implement({
  fields: (t) => ({
    id: t.exposeInt("id"),
    name: t.exposeString("name"),
    isAnimationStudio: t.exposeBoolean("isAnimationStudio"),
    siteUrl: t.exposeString("siteUrl", { nullable: true })
  })
});

const CharacterName = builder.objectRef<any>("CharacterName").implement({
  fields: (t) => ({
    first: t.exposeString("first", { nullable: true }),
    middle: t.exposeString("middle", { nullable: true }),
    last: t.exposeString("last", { nullable: true }),
    full: t.exposeString("full"),
    native: t.exposeString("native", { nullable: true })
  })
});

const CharacterRef = builder.objectRef<any>("Character").implement({
  fields: (t) => ({
    id: t.exposeInt("id"),
    name: t.field({
      type: CharacterName,
      resolve: (c) => ({
        first: c.nameFirst,
        middle: c.nameMiddle,
        last: c.nameLast,
        full: c.nameFull,
        native: c.nameNative
      })
    }),
    description: t.exposeString("description", { nullable: true }),
    gender: t.exposeString("gender", { nullable: true }),
    age: t.exposeString("age", { nullable: true }),
    bloodType: t.exposeString("bloodType", { nullable: true }),
    favourites: t.exposeInt("favourites")
  })
});

const StaffName = builder.objectRef<any>("StaffName").implement({
  fields: (t) => ({
    first: t.exposeString("first", { nullable: true }),
    middle: t.exposeString("middle", { nullable: true }),
    last: t.exposeString("last", { nullable: true }),
    full: t.exposeString("full"),
    native: t.exposeString("native", { nullable: true })
  })
});

const StaffRef = builder.objectRef<any>("Staff").implement({
  fields: (t) => ({
    id: t.exposeInt("id"),
    name: t.field({
      type: StaffName,
      resolve: (s) => ({
        first: s.nameFirst,
        middle: s.nameMiddle,
        last: s.nameLast,
        full: s.nameFull,
        native: s.nameNative
      })
    }),
    description: t.exposeString("description", { nullable: true }),
    language: t.exposeString("language", { nullable: true }),
    homeTown: t.exposeString("homeTown", { nullable: true }),
    age: t.exposeInt("age", { nullable: true }),
    favourites: t.exposeInt("favourites")
  })
});

const MediaRef = builder.objectRef<any>("Media").implement({
  fields: (t) => ({
    id: t.exposeInt("id"),
    idMal: t.exposeInt("idMal", { nullable: true }),
    type: t.expose("type", { type: MediaTypeEnum }),
    format: t.expose("format", { type: MediaFormatEnum }),
    status: t.expose("status", { type: MediaStatusEnum }),
    title: t.field({
      type: MediaTitle,
      resolve: (media) => ({
        romaji: media.titleRomaji,
        english: media.titleEnglish,
        native: media.titleNative
      })
    }),
    description: t.exposeString("description"),
    startDate: t.field({
      type: FuzzyDate,
      resolve: (m) => ({ year: m.startDateYear, month: m.startDateMonth, day: m.startDateDay })
    }),
    endDate: t.field({
      type: FuzzyDate,
      resolve: (m) => ({ year: m.endDateYear, month: m.endDateMonth, day: m.endDateDay })
    }),
    season: t.expose("season", { type: MediaSeasonEnum, nullable: true }),
    seasonYear: t.exposeInt("seasonYear", { nullable: true }),
    episodes: t.exposeInt("episodes", { nullable: true }),
    duration: t.exposeInt("duration", { nullable: true }),
    chapters: t.exposeInt("chapters", { nullable: true }),
    volumes: t.exposeInt("volumes", { nullable: true }),
    source: t.expose("source", { type: MediaSourceEnum, nullable: true }),
    coverImage: t.field({
      type: MediaCoverImage,
      resolve: (m) => ({ large: m.coverImageLarge, medium: m.coverImageMedium })
    }),
    bannerImage: t.exposeString("bannerImage", { nullable: true }),
    trailer: t.field({
      type: MediaTrailer,
      nullable: true,
      resolve: (m) => (m.trailerId ? { id: m.trailerId, site: m.trailerSite } : null)
    }),
    averageScore: t.exposeInt("averageScore"),
    meanScore: t.exposeInt("meanScore"),
    popularity: t.exposeInt("popularity"),
    favourites: t.exposeInt("favourites"),
    trending: t.exposeInt("trending"),
    isAdult: t.exposeBoolean("isAdult"),
    siteUrl: t.exposeString("siteUrl", { nullable: true }),
    genres: t.stringList({
      resolve: async (media, _args, ctx) => {
        const rows = await ctx.prisma.mediaGenre.findMany({
          where: { mediaId: media.id },
          include: { genre: true }
        });
        return rows.map((row) => row.genre.name);
      }
    }),
    tags: t.field({
      type: [MediaTagRef],
      resolve: async (media, _args, ctx) => {
        const rows = await ctx.prisma.mediaTagOnMedia.findMany({
          where: { mediaId: media.id },
          include: { tag: true }
        });
        return rows.map((row) => row.tag);
      }
    })
  })
});

const MediaListRef = builder.objectRef<any>("MediaList").implement({
  fields: (t) => ({
    id: t.exposeInt("id"),
    status: t.expose("status", { type: MediaListStatusEnum }),
    score: t.exposeFloat("score"),
    scoreRaw: t.exposeInt("scoreRaw"),
    progress: t.exposeInt("progress"),
    progressVolumes: t.exposeInt("progressVolumes", { nullable: true }),
    repeat: t.exposeInt("repeat"),
    priority: t.exposeInt("priority"),
    private: t.exposeBoolean("private"),
    notes: t.exposeString("notes", { nullable: true }),
    media: t.field({
      type: MediaRef,
      resolve: async (entry, _args, ctx) => entry.media ?? ctx.loaders.mediaById.load(entry.mediaId)
    }),
    user: t.field({
      type: UserRef,
      resolve: async (entry, _args, ctx) => entry.user ?? ctx.loaders.userById.load(entry.userId)
    })
  })
});

const ReviewRef = builder.objectRef<any>("Review").implement({
  fields: (t) => ({
    id: t.exposeInt("id"),
    summary: t.exposeString("summary"),
    body: t.exposeString("body"),
    score: t.exposeInt("score"),
    rating: t.exposeInt("rating"),
    ratingAmount: t.exposeInt("ratingAmount"),
    private: t.exposeBoolean("private"),
    user: t.field({ type: UserRef, resolve: (r, _a, ctx) => ctx.loaders.userById.load(r.userId) }),
    media: t.field({ type: MediaRef, resolve: (r, _a, ctx) => ctx.loaders.mediaById.load(r.mediaId) })
  })
});

const ActivityReplyRef = builder.objectRef<any>("ActivityReply").implement({
  fields: (t) => ({
    id: t.exposeInt("id"),
    text: t.exposeString("text"),
    likeCount: t.exposeInt("likeCount"),
    user: t.field({ type: UserRef, resolve: (r, _a, ctx) => ctx.loaders.userById.load(r.userId) })
  })
});

const TextActivityRef = builder.objectRef<any>("TextActivity").implement({
  fields: (t) => ({
    id: t.exposeInt("id"),
    type: t.expose("type", { type: ActivityTypeEnum }),
    text: t.exposeString("text", { nullable: true }),
    replyCount: t.exposeInt("replyCount"),
    likeCount: t.exposeInt("likeCount"),
    isLocked: t.exposeBoolean("isLocked"),
    isPinned: t.exposeBoolean("isPinned"),
    user: t.field({ type: UserRef, resolve: (a, _r, ctx) => ctx.loaders.userById.load(a.userId) })
  })
});
const MessageActivityRef = builder.objectRef<any>("MessageActivity").implement({
  fields: (t) => ({
    id: t.exposeInt("id"),
    type: t.expose("type", { type: ActivityTypeEnum }),
    text: t.exposeString("text", { nullable: true }),
    recipientId: t.exposeInt("messageRecipientId", { nullable: true }),
    replyCount: t.exposeInt("replyCount"),
    likeCount: t.exposeInt("likeCount"),
    user: t.field({ type: UserRef, resolve: (a, _r, ctx) => ctx.loaders.userById.load(a.userId) })
  })
});
const ListActivityRef = builder.objectRef<any>("ListActivity").implement({
  fields: (t) => ({
    id: t.exposeInt("id"),
    type: t.expose("type", { type: ActivityTypeEnum }),
    replyCount: t.exposeInt("replyCount"),
    likeCount: t.exposeInt("likeCount"),
    user: t.field({ type: UserRef, resolve: (a, _r, ctx) => ctx.loaders.userById.load(a.userId) })
  })
});

const ActivityUnion = builder.unionType("ActivityUnion", {
  types: [TextActivityRef, MessageActivityRef, ListActivityRef],
  resolveType: (activity: any) =>
    activity.type === "MESSAGE" ? "MessageActivity" : activity.type === "MEDIA_LIST" ? "ListActivity" : "TextActivity"
});

const LikeableUnion = builder.unionType("LikeableUnion", {
  types: [TextActivityRef, ActivityReplyRef, ReviewRef],
  resolveType: (value: any) => {
    if ("summary" in value) return "Review";
    if ("activityId" in value) return "ActivityReply";
    return value.type === "MESSAGE" ? "MessageActivity" : "TextActivity";
  }
});

const NotificationRef = builder.objectRef<any>("Notification").implement({
  fields: (t) => ({
    id: t.exposeInt("id"),
    type: t.exposeString("type"),
    context: t.exposeString("context", { nullable: true }),
    isRead: t.exposeBoolean("isRead"),
    actor: t.field({
      type: UserRef,
      nullable: true,
      resolve: (n, _a, ctx) => (n.actorId ? ctx.loaders.userById.load(n.actorId) : null)
    }),
    media: t.field({
      type: MediaRef,
      nullable: true,
      resolve: (n, _a, ctx) => (n.mediaId ? ctx.loaders.mediaById.load(n.mediaId) : null)
    })
  })
});

const FavouritesRef = builder.objectRef<any>("Favourites").implement({
  fields: (t) => ({
    anime: t.field({ type: [MediaRef], resolve: (f) => f.anime.map((x: any) => x.media).filter(Boolean) }),
    manga: t.field({ type: [MediaRef], resolve: (f) => f.manga.map((x: any) => x.media).filter(Boolean) }),
    characters: t.field({
      type: [CharacterRef],
      resolve: (f) => f.characters.map((x: any) => x.character).filter(Boolean)
    }),
    staff: t.field({ type: [StaffRef], resolve: (f) => f.staff.map((x: any) => x.staff).filter(Boolean) }),
    studios: t.field({ type: [StudioRef], resolve: (f) => f.studios.map((x: any) => x.studio).filter(Boolean) })
  })
});

const PageInfoRef = builder.objectRef<any>("PageInfo").implement({
  fields: (t) => ({
    currentPage: t.exposeInt("currentPage"),
    perPage: t.exposeInt("perPage"),
    hasNextPage: t.exposeBoolean("hasNextPage"),
    total: t.exposeInt("total"),
    lastPage: t.exposeInt("lastPage")
  })
});

const PageRef = builder.objectRef<Objects["PageState"]>("Page").implement({
  fields: (t) => ({
    pageInfo: t.field({
      type: PageInfoRef,
      resolve: async (page, _args, ctx) => {
        const total = await ctx.service.mediaCount(page.args);
        return pageInfo(total, page.page, page.perPage);
      }
    }),
    media: t.field({
      type: [MediaRef],
      args: mediaArgs(t),
      resolve: (page, args, ctx) => ctx.service.mediaPage({ ...page.args, ...args })
    }),
    characters: t.field({
      type: [CharacterRef],
      args: pageSearchArgs(t),
      resolve: (page, args, ctx) => ctx.service.characters({ ...page, ...args })
    }),
    staff: t.field({
      type: [StaffRef],
      args: pageSearchArgs(t),
      resolve: (page, args, ctx) => ctx.service.staff({ ...page, ...args })
    }),
    studios: t.field({
      type: [StudioRef],
      args: pageSearchArgs(t),
      resolve: (page, args, ctx) => ctx.service.studios({ ...page, ...args })
    }),
    users: t.field({
      type: [UserRef],
      args: pageSearchArgs(t),
      resolve: (page, args, ctx) => ctx.service.users({ ...page, ...args })
    }),
    reviews: t.field({
      type: [ReviewRef],
      resolve: (page, _args, ctx) =>
        ctx.prisma.review.findMany({ skip: (page.page - 1) * page.perPage, take: page.perPage })
    }),
    activities: t.field({
      type: [ActivityUnion],
      resolve: (page, _args, ctx) =>
        ctx.prisma.activity.findMany({ skip: (page.page - 1) * page.perPage, take: page.perPage })
    })
  })
});

const DeletedRef = builder.objectRef<Objects["Deleted"]>("Deleted").implement({
  fields: (t) => ({ deleted: t.exposeBoolean("deleted") })
});

const MediaListGroupRef = builder.objectRef<Objects["MediaListGroup"]>("MediaListGroup").implement({
  fields: (t) => ({
    name: t.exposeString("name"),
    status: t.string({ resolve: (g) => g.status }),
    entries: t.field({ type: [MediaListRef], resolve: (g) => g.entries })
  })
});

const MediaListCollectionRef = builder.objectRef<Objects["MediaListCollection"]>("MediaListCollection").implement({
  fields: (t) => ({
    user: t.field({ type: UserRef, resolve: (c) => c.user }),
    lists: t.field({ type: [MediaListGroupRef], resolve: (c) => c.lists })
  })
});

const AuthPayloadRef = builder.objectRef<any>("AuthPayload").implement({
  fields: (t) => ({
    user: t.field({ type: UserRef, resolve: (p) => p.user }),
    accessToken: t.exposeString("accessToken"),
    refreshToken: t.exposeString("refreshToken")
  })
});

const SaveMediaListInput = builder.inputType("SaveMediaListEntryInput", {
  fields: (t) => ({
    mediaId: t.int({ required: true }),
    status: t.field({ type: MediaListStatusEnum, required: true }),
    score: t.float(),
    progress: t.int(),
    progressVolumes: t.int(),
    repeat: t.int(),
    priority: t.int(),
    private: t.boolean(),
    notes: t.string()
  })
});

const UpdateUserInput = builder.inputType("UpdateUserInput", {
  fields: (t) => ({
    name: t.string(),
    avatarImage: t.string(),
    bannerImage: t.string(),
    about: t.string(),
    titleLanguage: t.field({ type: UserTitleLanguageEnum }),
    scoreFormat: t.field({ type: ScoreFormatEnum }),
    displayAdultContent: t.boolean(),
    timezone: t.string()
  })
});

const AdminMediaInput = builder.inputType("AdminMediaInput", {
  fields: (t) => ({
    type: t.field({ type: MediaTypeEnum, required: true }),
    format: t.field({ type: MediaFormatEnum, required: true }),
    status: t.field({ type: MediaStatusEnum, required: true }),
    titleRomaji: t.string({ required: true }),
    titleEnglish: t.string(),
    titleNative: t.string(),
    description: t.string({ required: true }),
    season: t.field({ type: MediaSeasonEnum }),
    seasonYear: t.int(),
    episodes: t.int(),
    duration: t.int(),
    chapters: t.int(),
    volumes: t.int(),
    averageScore: t.int(),
    popularity: t.int(),
    isAdult: t.boolean()
  })
});

builder.queryType({
  fields: (t) => ({
    Page: t.field({
      type: PageRef,
      args: {
        page: t.arg.int({ defaultValue: 1 }),
        perPage: t.arg.int({ defaultValue: 20 })
      },
      resolve: (_root, args) => {
        const normalized = normalizePage(args);
        return { page: normalized.page, perPage: normalized.perPage, args };
      }
    }),
    Media: t.field({ type: MediaRef, nullable: true, args: mediaArgs(t), resolve: (_r, args, ctx) => ctx.service.media(args) }),
    Character: t.field({
      type: CharacterRef,
      nullable: true,
      args: { id: t.arg.int(), search: t.arg.string() },
      resolve: async (_r, args, ctx) => (await ctx.service.characters({ ...args, page: 1, perPage: 1 }))[0] ?? null
    }),
    Staff: t.field({
      type: StaffRef,
      nullable: true,
      args: { id: t.arg.int(), search: t.arg.string() },
      resolve: async (_r, args, ctx) => (await ctx.service.staff({ ...args, page: 1, perPage: 1 }))[0] ?? null
    }),
    Studio: t.field({
      type: StudioRef,
      nullable: true,
      args: { id: t.arg.int(), search: t.arg.string() },
      resolve: async (_r, args, ctx) => (await ctx.service.studios({ ...args, page: 1, perPage: 1 }))[0] ?? null
    }),
    User: t.field({
      type: UserRef,
      nullable: true,
      args: { id: t.arg.int(), name: t.arg.string(), search: t.arg.string() },
      resolve: async (_r, args, ctx) => (await ctx.service.users({ ...args, page: 1, perPage: 1 }))[0] ?? null
    }),
    Viewer: t.field({ type: UserRef, nullable: true, resolve: (_r, _a, ctx) => ctx.viewer }),
    MediaList: t.field({
      type: MediaListRef,
      nullable: true,
      args: {
        id: t.arg.int(),
        userId: t.arg.int(),
        userName: t.arg.string(),
        mediaId: t.arg.int(),
        type: t.arg({ type: MediaTypeEnum }),
        status: t.arg({ type: MediaListStatusEnum })
      },
      resolve: (_r, args, ctx) => ctx.service.mediaList(args, ctx.viewer)
    }),
    MediaListCollection: t.field({
      type: MediaListCollectionRef,
      args: {
        userId: t.arg.int(),
        userName: t.arg.string(),
        type: t.arg({ type: MediaTypeEnum }),
        status: t.arg({ type: MediaListStatusEnum })
      },
      resolve: (_r, args, ctx) => ctx.service.listCollection(args, ctx.viewer)
    }),
    GenreCollection: t.stringList({
      resolve: (_r, _a, ctx) =>
        ctx.service.getCached("genre:collection", async () => {
          const rows = await ctx.prisma.genre.findMany({ orderBy: { name: "asc" } });
          return rows.map((row) => row.name);
        })
    }),
    MediaTagCollection: t.field({
      type: [MediaTagRef],
      resolve: (_r, _a, ctx) =>
        ctx.service.getCached("tag:collection", () => ctx.prisma.mediaTag.findMany({ orderBy: { name: "asc" } }))
    }),
    Review: t.field({
      type: ReviewRef,
      nullable: true,
      args: { id: t.arg.int(), mediaId: t.arg.int(), userId: t.arg.int() },
      resolve: (_r, args, ctx) => ctx.prisma.review.findFirst({ where: args as any })
    }),
    Activity: t.field({
      type: ActivityUnion,
      nullable: true,
      args: { id: t.arg.int(), userId: t.arg.int(), type: t.arg({ type: ActivityTypeEnum }) },
      resolve: (_r, args, ctx) => ctx.prisma.activity.findFirst({ where: args as any })
    }),
    Notification: t.field({
      type: [NotificationRef],
      args: { type: t.arg.string(), resetNotificationCount: t.arg.boolean() },
      resolve: async (_r, args, ctx) => {
        const viewer = assertAuth(ctx.viewer);
        const rows = await ctx.prisma.notification.findMany({ where: { userId: viewer.id, type: args.type ?? undefined } });
        if (args.resetNotificationCount) {
          await ctx.prisma.notification.updateMany({ where: { userId: viewer.id }, data: { isRead: true } });
        }
        return rows;
      }
    })
  })
});

builder.mutationType({
  fields: (t) => ({
    RegisterUser: t.field({
      type: AuthPayloadRef,
      args: { email: t.arg.string({ required: true }), name: t.arg.string({ required: true }), password: t.arg.string({ required: true }) },
      resolve: (_r, args, ctx) => ctx.auth.register(args)
    }),
    Login: t.field({
      type: AuthPayloadRef,
      args: { email: t.arg.string({ required: true }), password: t.arg.string({ required: true }) },
      resolve: (_r, args, ctx) => ctx.auth.login(args)
    }),
    Logout: t.boolean({
      resolve: (_r, _a, ctx) => ctx.auth.logout(ctx.request.headers["x-refresh-token"] as string | undefined)
    }),
    UpdateUser: t.field({
      type: UserRef,
      args: { input: t.arg({ type: UpdateUserInput, required: true }) },
      resolve: (_r, args, ctx) => {
        const viewer = assertAuth(ctx.viewer);
        return ctx.prisma.user.update({ where: { id: viewer.id }, data: args.input as any });
      }
    }),
    SaveMediaListEntry: t.field({
      type: MediaListRef,
      args: { input: t.arg({ type: SaveMediaListInput, required: true }) },
      resolve: (_r, args, ctx) => ctx.service.saveMediaListEntry(assertAuth(ctx.viewer), args.input)
    }),
    UpdateMediaListEntries: t.field({
      type: [MediaListRef],
      args: { ids: t.arg.intList({ required: true }), input: t.arg({ type: SaveMediaListInput, required: true }) },
      resolve: async (_r, args, ctx) => {
        const viewer = assertAuth(ctx.viewer);
        return Promise.all(args.ids.map((id) => ctx.prisma.mediaListEntry.update({ where: { id, userId: viewer.id } as any, data: args.input as any })));
      }
    }),
    DeleteMediaListEntry: t.field({
      type: DeletedRef,
      args: { id: t.arg.int({ required: true }) },
      resolve: (_r, args, ctx) => ctx.service.deleteMediaListEntry(assertAuth(ctx.viewer), args.id)
    }),
    ToggleFavourite: t.field({
      type: FavouritesRef,
      args: { animeId: t.arg.int(), mangaId: t.arg.int(), characterId: t.arg.int(), staffId: t.arg.int(), studioId: t.arg.int() },
      resolve: (_r, args, ctx) => ctx.service.toggleFavourite(assertAuth(ctx.viewer), args)
    }),
    ToggleFollow: t.field({
      type: UserRef,
      args: { userId: t.arg.int({ required: true }) },
      resolve: (_r, args, ctx) => ctx.service.toggleFollow(assertAuth(ctx.viewer), args.userId)
    }),
    SaveTextActivity: t.field({
      type: TextActivityRef,
      args: { id: t.arg.int(), text: t.arg.string({ required: true }) },
      resolve: (_r, args, ctx) => ctx.service.saveActivity(assertAuth(ctx.viewer), args)
    }),
    SaveMessageActivity: t.field({
      type: MessageActivityRef,
      args: { id: t.arg.int(), recipientId: t.arg.int({ required: true }), text: t.arg.string({ required: true }) },
      resolve: (_r, args, ctx) => ctx.service.saveActivity(assertAuth(ctx.viewer), args)
    }),
    DeleteActivity: t.field({
      type: DeletedRef,
      args: { id: t.arg.int({ required: true }) },
      resolve: (_r, args, ctx) => ctx.service.deleteActivity(assertAuth(ctx.viewer), args.id)
    }),
    SaveActivityReply: t.field({
      type: ActivityReplyRef,
      args: { id: t.arg.int(), activityId: t.arg.int({ required: true }), text: t.arg.string({ required: true }) },
      resolve: (_r, args, ctx) => ctx.service.saveActivityReply(assertAuth(ctx.viewer), args)
    }),
    DeleteActivityReply: t.field({
      type: DeletedRef,
      args: { id: t.arg.int({ required: true }) },
      resolve: (_r, args, ctx) => ctx.service.deleteActivityReply(assertAuth(ctx.viewer), args.id)
    }),
    ToggleLike: t.field({
      type: LikeableUnion,
      args: { id: t.arg.int({ required: true }), type: t.arg({ type: LikeableTypeEnum, required: true }) },
      resolve: (_r, args, ctx) => ctx.service.toggleLike(assertAuth(ctx.viewer), args.id, args.type as any)
    }),
    SaveReview: t.field({
      type: ReviewRef,
      args: {
        id: t.arg.int(),
        mediaId: t.arg.int({ required: true }),
        summary: t.arg.string({ required: true }),
        body: t.arg.string({ required: true }),
        score: t.arg.int({ required: true }),
        private: t.arg.boolean()
      },
      resolve: (_r, args, ctx) => ctx.service.saveReview(assertAuth(ctx.viewer), args)
    }),
    DeleteReview: t.field({
      type: DeletedRef,
      args: { id: t.arg.int({ required: true }) },
      resolve: async (_r, args, ctx) => {
        const viewer = assertAuth(ctx.viewer);
        await ctx.prisma.review.delete({ where: { id: args.id, userId: viewer.id } as any });
        return { deleted: true };
      }
    }),
    RateReview: t.field({
      type: ReviewRef,
      args: { reviewId: t.arg.int({ required: true }), rating: t.arg({ type: ReviewRatingEnum, required: true }) },
      resolve: (_r, args, ctx) => ctx.service.rateReview(assertAuth(ctx.viewer), args.reviewId, args.rating as any)
    }),
    AdminCreateMedia: t.field({
      type: MediaRef,
      args: { input: t.arg({ type: AdminMediaInput, required: true }) },
      resolve: (_r, args, ctx) => ctx.service.adminCreateMedia(args.input, assertModerator(ctx.viewer).id)
    }),
    AdminUpdateMedia: t.field({
      type: MediaRef,
      args: { id: t.arg.int({ required: true }), input: t.arg({ type: AdminMediaInput, required: true }) },
      resolve: (_r, args, ctx) => ctx.service.adminUpdateMedia(args.id, args.input, assertModerator(ctx.viewer).id)
    }),
    AdminDeleteMedia: t.field({
      type: DeletedRef,
      args: { id: t.arg.int({ required: true }) },
      resolve: (_r, args, ctx) => ctx.service.adminDeleteMedia(args.id, assertModerator(ctx.viewer).id)
    }),
    AdminCreateCharacter: t.field({
      type: CharacterRef,
      args: { nameFull: t.arg.string({ required: true }) },
      resolve: (_r, args, ctx) => {
        assertModerator(ctx.viewer);
        return ctx.prisma.character.create({ data: { nameFull: args.nameFull } });
      }
    }),
    AdminUpdateCharacter: t.field({
      type: CharacterRef,
      args: { id: t.arg.int({ required: true }), nameFull: t.arg.string({ required: true }) },
      resolve: (_r, args, ctx) => {
        assertModerator(ctx.viewer);
        return ctx.prisma.character.update({ where: { id: args.id }, data: { nameFull: args.nameFull } });
      }
    }),
    AdminCreateStaff: t.field({
      type: StaffRef,
      args: { nameFull: t.arg.string({ required: true }) },
      resolve: (_r, args, ctx) => {
        assertModerator(ctx.viewer);
        return ctx.prisma.staff.create({ data: { nameFull: args.nameFull } });
      }
    }),
    AdminUpdateStaff: t.field({
      type: StaffRef,
      args: { id: t.arg.int({ required: true }), nameFull: t.arg.string({ required: true }) },
      resolve: (_r, args, ctx) => {
        assertModerator(ctx.viewer);
        return ctx.prisma.staff.update({ where: { id: args.id }, data: { nameFull: args.nameFull } });
      }
    }),
    AdminCreateStudio: t.field({
      type: StudioRef,
      args: { name: t.arg.string({ required: true }) },
      resolve: (_r, args, ctx) => {
        assertModerator(ctx.viewer);
        return ctx.prisma.studio.create({ data: { name: args.name } });
      }
    }),
    AdminResolveReport: t.field({
      type: builder.objectRef<any>("Report").implement({
        fields: (r) => ({
          id: r.exposeInt("id"),
          targetType: r.exposeString("targetType"),
          targetId: r.exposeInt("targetId"),
          reason: r.exposeString("reason"),
          status: r.exposeString("status")
        })
      }),
      args: { id: t.arg.int({ required: true }), status: t.arg.string({ required: true }) },
      resolve: (_r, args, ctx) => {
        assertModerator(ctx.viewer);
        return ctx.prisma.report.update({ where: { id: args.id }, data: { status: args.status as any } });
      }
    })
  })
});

function pageSearchArgs(t: any) {
  return {
    search: t.arg.string(),
    sort: t.arg.stringList()
  };
}

function mediaArgs(t: any) {
  return {
    id: t.arg.int(),
    idMal: t.arg.int(),
    id_in: t.arg.intList(),
    id_not_in: t.arg.intList(),
    search: t.arg.string(),
    type: t.arg({ type: MediaTypeEnum }),
    format: t.arg({ type: MediaFormatEnum }),
    format_in: t.arg({ type: [MediaFormatEnum] }),
    status: t.arg({ type: MediaStatusEnum }),
    status_in: t.arg({ type: [MediaStatusEnum] }),
    season: t.arg({ type: MediaSeasonEnum }),
    seasonYear: t.arg.int(),
    genre: t.arg.string(),
    genre_in: t.arg.stringList(),
    tag: t.arg.string(),
    tag_in: t.arg.stringList(),
    isAdult: t.arg.boolean(),
    episodes_greater: t.arg.int(),
    episodes_lesser: t.arg.int(),
    duration_greater: t.arg.int(),
    duration_lesser: t.arg.int(),
    averageScore_greater: t.arg.int(),
    averageScore_lesser: t.arg.int(),
    popularity_greater: t.arg.int(),
    popularity_lesser: t.arg.int(),
    sort: t.arg({ type: [MediaSortEnum] })
  };
}

export const schema = builder.toSchema({});

export function formatGraphQLError(error: unknown) {
  if (error instanceof GraphQLError) return error;
  return new GraphQLError(error instanceof Error ? error.message : "Unexpected error");
}
