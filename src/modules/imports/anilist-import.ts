import { CharacterRole, MediaFormat, MediaSource, MediaStatus, MediaType, PrismaClient } from "@prisma/client";
import { env } from "../../config/env.js";
import { slugify } from "../../common/sanitize.js";
import { meili } from "../../db/search.js";
import { SearchService } from "../search/search.service.js";

const prisma = new PrismaClient();

type AniListMedia = {
  id: number;
  idMal?: number | null;
  type: "ANIME" | "MANGA";
  format?: string | null;
  status?: string | null;
  title: { romaji?: string | null; english?: string | null; native?: string | null };
  description?: string | null;
  startDate?: { year?: number | null; month?: number | null; day?: number | null };
  endDate?: { year?: number | null; month?: number | null; day?: number | null };
  season?: string | null;
  seasonYear?: number | null;
  episodes?: number | null;
  duration?: number | null;
  chapters?: number | null;
  volumes?: number | null;
  countryOfOrigin?: string | null;
  source?: string | null;
  hashtag?: string | null;
  trailer?: { id?: string | null; site?: string | null } | null;
  coverImage?: { large?: string | null; medium?: string | null } | null;
  bannerImage?: string | null;
  averageScore?: number | null;
  meanScore?: number | null;
  popularity?: number | null;
  favourites?: number | null;
  trending?: number | null;
  isAdult?: boolean | null;
  siteUrl?: string | null;
  synonyms?: string[] | null;
  genres?: string[] | null;
  tags?: Array<{
    name: string;
    description?: string | null;
    category?: string | null;
    rank?: number | null;
    isAdult?: boolean | null;
    isGeneralSpoiler?: boolean | null;
    isMediaSpoiler?: boolean | null;
  }> | null;
  studios?: {
    edges?: Array<{
      isMain?: boolean | null;
      node?: { name: string; isAnimationStudio?: boolean | null; siteUrl?: string | null } | null;
    }> | null;
  } | null;
  characters?: {
    edges?: Array<{
      role?: string | null;
      node?: AniListCharacter | null;
      voiceActors?: AniListStaff[] | null;
    }> | null;
  } | null;
  staff?: {
    edges?: Array<{
      role?: string | null;
      node?: AniListStaff | null;
    }> | null;
  } | null;
  airingSchedule?: {
    nodes?: Array<{ airingAt: number; timeUntilAiring: number; episode: number }> | null;
  } | null;
};

type AniListCharacter = {
  name?: {
    first?: string | null;
    middle?: string | null;
    last?: string | null;
    full?: string | null;
    native?: string | null;
  } | null;
  description?: string | null;
  image?: { large?: string | null; medium?: string | null } | null;
  gender?: string | null;
  dateOfBirth?: { year?: number | null; month?: number | null; day?: number | null } | null;
  age?: string | null;
  bloodType?: string | null;
  favourites?: number | null;
};

type AniListStaff = {
  name?: {
    first?: string | null;
    middle?: string | null;
    last?: string | null;
    full?: string | null;
    native?: string | null;
  } | null;
  description?: string | null;
  image?: { large?: string | null; medium?: string | null } | null;
  languageV2?: string | null;
  homeTown?: string | null;
  dateOfBirth?: { year?: number | null; month?: number | null; day?: number | null } | null;
  dateOfDeath?: { year?: number | null; month?: number | null; day?: number | null } | null;
  age?: number | null;
  yearsActive?: number[] | null;
  favourites?: number | null;
};

const QUERY = `
  query ImportPopular($type: MediaType!, $page: Int!, $perPage: Int!) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        total
        currentPage
        hasNextPage
      }
      media(type: $type, sort: [POPULARITY_DESC]) {
        id
        idMal
        type
        format
        status
        title { romaji english native }
        description(asHtml: false)
        startDate { year month day }
        endDate { year month day }
        season
        seasonYear
        episodes
        duration
        chapters
        volumes
        countryOfOrigin
        source
        hashtag
        trailer { id site }
        coverImage { large medium }
        bannerImage
        averageScore
        meanScore
        popularity
        favourites
        trending
        isAdult
        siteUrl
        synonyms
        genres
        tags { name description category rank isAdult isGeneralSpoiler isMediaSpoiler }
        studios { edges { isMain node { name isAnimationStudio siteUrl } } }
        characters(sort: [ROLE, RELEVANCE], perPage: 8) {
          edges {
            role
            node {
              name { first middle last full native }
              description(asHtml: false)
              image { large medium }
              gender
              dateOfBirth { year month day }
              age
              bloodType
              favourites
            }
            voiceActors(language: JAPANESE, sort: [RELEVANCE]) {
              name { first middle last full native }
              description(asHtml: false)
              image { large medium }
              languageV2
              homeTown
              dateOfBirth { year month day }
              dateOfDeath { year month day }
              age
              yearsActive
              favourites
            }
          }
        }
        staff(sort: [RELEVANCE], perPage: 6) {
          edges {
            role
            node {
              name { first middle last full native }
              description(asHtml: false)
              image { large medium }
              languageV2
              homeTown
              dateOfBirth { year month day }
              dateOfDeath { year month day }
              age
              yearsActive
              favourites
            }
          }
        }
        airingSchedule(notYetAired: true, perPage: 3) {
          nodes { airingAt timeUntilAiring episode }
        }
      }
    }
  }
`;

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    limit: process.env.ANILIST_IMPORT_PER_TYPE ?? "25",
    clear: false,
    delay: null as number | null,
    chunkSize: 50,
    types: "all"
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--clear" || arg === "--reset") {
      config.clear = true;
    } else if (arg === "--limit") {
      config.limit = args[++i];
    } else if (arg === "--delay") {
      config.delay = Number(args[++i]);
    } else if (arg === "--chunk-size") {
      config.chunkSize = Number(args[++i]);
    } else if (arg === "--types") {
      config.types = args[++i];
    }
  }

  return config;
}

let nextRequestAt = 0;
const requestsPerMin = env.ANILIST_REQUESTS_PER_MINUTE || 60;
const defaultSpacingMs = Math.ceil(60_000 / requestsPerMin);

async function throttle(customDelay?: number | null) {
  const spacing = customDelay !== undefined && customDelay !== null ? customDelay : defaultSpacingMs;
  const now = Date.now();
  const waitMs = Math.max(0, nextRequestAt - now);
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  nextRequestAt = Date.now() + spacing;
}

async function main() {
  const config = parseArgs();

  let limitPerType: number | null = null;
  if (config.limit !== "all" && config.limit !== "-1") {
    limitPerType = Number(config.limit);
  }

  if (config.clear) {
    console.log("Wiping existing database metadata as requested...");
    await clearDemoMetadata();
  } else {
    console.log("Running in safe upsert mode. Unrelated tables will not be cleared.");
  }

  const typesToImport: MediaType[] = [];
  if (config.types === "anime" || config.types === "all") {
    typesToImport.push(MediaType.ANIME);
  }
  if (config.types === "manga" || config.types === "all") {
    typesToImport.push(MediaType.MANGA);
  }

  const imported = [];

  for (const type of typesToImport) {
    console.log(`Starting import for ${type}...`);
    let page = 1;
    let totalImportedForType = 0;
    let hasNextPage = true;

    while (hasNextPage) {
      let perPage = Math.min(config.chunkSize, 50);
      if (limitPerType !== null) {
        const remaining = limitPerType - totalImportedForType;
        if (remaining <= 0) break;
        perPage = Math.min(perPage, remaining);
      }

      console.log(`Fetching page ${page} of popular ${type} (chunk size: ${perPage})...`);

      let pageData: { pageInfo?: { hasNextPage: boolean } | null; media: AniListMedia[] };
      try {
        const data = await request<{ Page: { pageInfo?: { hasNextPage: boolean } | null; media: AniListMedia[] } }>(
          QUERY,
          { type, page, perPage },
          config.delay
        );
        pageData = data.Page;
      } catch (err: any) {
        console.error(`Failed to fetch page ${page} of ${type}: ${err.message}`);
        break;
      }

      const mediaItems = pageData.media || [];
      if (mediaItems.length === 0) {
        console.log(`No more popular ${type} returned.`);
        break;
      }

      for (const item of mediaItems) {
        try {
          const upserted = await upsertMedia(item);
          imported.push(upserted);
          totalImportedForType++;
          console.log(`[${totalImportedForType}] Upserted: ${upserted.titleRomaji} (Slug: ${upserted.slug})`);
        } catch (err: any) {
          console.error(`Failed to upsert item ${item.id}: ${err.message}`);
        }
      }

      hasNextPage = pageData.pageInfo?.hasNextPage ?? false;
      if (limitPerType !== null && totalImportedForType >= limitPerType) {
        hasNextPage = false;
      }

      if (hasNextPage) {
        page++;
      }
    }

    console.log(`Finished import for ${type}. Total imported: ${totalImportedForType}`);
  }

  console.log("Reindexing search index...");
  const search = new SearchService(meili, prisma);
  await search.reindexAll();
  console.log(`Imported/Updated ${imported.length} public AniList media records and rebuilt search index`);
}

async function request<T>(query: string, variables: Record<string, unknown>, delayOverride?: number | null): Promise<T> {
  await throttle(delayOverride);

  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json"
  };
  if (env.ANILIST_ACCESS_TOKEN) headers.authorization = `Bearer ${env.ANILIST_ACCESS_TOKEN}`;

  const response = await fetch(env.ANILIST_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables })
  });
  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("retry-after") ?? "60");
    console.log(`[Rate Limit] AniList API 429 received. Sleeping for ${retryAfter}s...`);
    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
    return request<T>(query, variables, delayOverride);
  }
  const payload = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (!response.ok || payload.errors?.length || !payload.data) {
    throw new Error(payload.errors?.map((error) => error.message).join("; ") || response.statusText);
  }
  return payload.data;
}

async function clearDemoMetadata() {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.report.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.like.deleteMany(),
    prisma.activityReply.deleteMany(),
    prisma.activity.deleteMany(),
    prisma.reviewRating.deleteMany(),
    prisma.review.deleteMany(),
    prisma.favourite.deleteMany(),
    prisma.mediaListEntryCustomList.deleteMany(),
    prisma.mediaListCustomList.deleteMany(),
    prisma.mediaListEntry.deleteMany(),
    prisma.airingSchedule.deleteMany(),
    prisma.mediaRelation.deleteMany(),
    prisma.mediaStaff.deleteMany(),
    prisma.mediaCharacter.deleteMany(),
    prisma.mediaStudio.deleteMany(),
    prisma.mediaTagOnMedia.deleteMany(),
    prisma.mediaTag.deleteMany(),
    prisma.mediaGenre.deleteMany(),
    prisma.genre.deleteMany(),
    prisma.mediaSynonym.deleteMany(),
    prisma.media.deleteMany(),
    prisma.character.deleteMany(),
    prisma.staff.deleteMany(),
    prisma.studio.deleteMany()
  ]);
}

async function upsertMedia(item: AniListMedia) {
  const title = item.title.romaji ?? item.title.english ?? item.title.native ?? `AniList ${item.id}`;
  const slug = uniqueSlug(title, item.id);

  let existingMedia = null;
  if (item.idMal) {
    existingMedia = await prisma.media.findFirst({
      where: {
        OR: [
          { slug },
          { idMal: item.idMal }
        ]
      }
    });
  } else {
    existingMedia = await prisma.media.findUnique({ where: { slug } });
  }

  const mediaData = {
    idMal: item.idMal ?? null,
    type: item.type,
    format: mapFormat(item.format, item.type),
    status: mapStatus(item.status),
    titleRomaji: title,
    titleEnglish: item.title.english ?? null,
    titleNative: item.title.native ?? null,
    slug,
    description: stripHtml(item.description) || "Public metadata imported from AniList API.",
    startDateYear: item.startDate?.year ?? null,
    startDateMonth: item.startDate?.month ?? null,
    startDateDay: item.startDate?.day ?? null,
    endDateYear: item.endDate?.year ?? null,
    endDateMonth: item.endDate?.month ?? null,
    endDateDay: item.endDate?.day ?? null,
    season: item.season as any,
    seasonYear: item.seasonYear ?? null,
    episodes: item.episodes ?? null,
    duration: item.duration ?? null,
    chapters: item.chapters ?? null,
    volumes: item.volumes ?? null,
    countryOfOrigin: item.countryOfOrigin ?? null,
    source: mapSource(item.source),
    hashtag: item.hashtag ?? null,
    trailerId: item.trailer?.id ?? null,
    trailerSite: item.trailer?.site ?? null,
    coverImageLarge: item.coverImage?.large ?? null,
    coverImageMedium: item.coverImage?.medium ?? null,
    bannerImage: item.bannerImage ?? null,
    averageScore: item.averageScore ?? 0,
    meanScore: item.meanScore ?? 0,
    popularity: item.popularity ?? 0,
    favourites: item.favourites ?? 0,
    trending: item.trending ?? 0,
    isAdult: item.isAdult ?? false,
    isLicensed: false,
    siteUrl: item.siteUrl ?? null
  };

  let media;
  if (existingMedia) {
    media = await prisma.media.update({
      where: { id: existingMedia.id },
      data: mediaData
    });
    // Delete non-unique relationships to prevent duplicates
    await prisma.$transaction([
      prisma.mediaSynonym.deleteMany({ where: { mediaId: media.id } }),
      prisma.mediaCharacter.deleteMany({ where: { mediaId: media.id } }),
      prisma.mediaStaff.deleteMany({ where: { mediaId: media.id } }),
      prisma.airingSchedule.deleteMany({ where: { mediaId: media.id } })
    ]);
  } else {
    media = await prisma.media.create({
      data: mediaData
    });
  }

  for (const synonym of item.synonyms ?? []) {
    if (synonym) await prisma.mediaSynonym.create({ data: { mediaId: media.id, text: synonym } });
  }
  for (const name of item.genres ?? []) {
    const genre = await prisma.genre.upsert({ where: { name }, create: { name }, update: {} });
    await prisma.mediaGenre.upsert({
      where: { mediaId_genreId: { mediaId: media.id, genreId: genre.id } },
      create: { mediaId: media.id, genreId: genre.id },
      update: {}
    });
  }

  for (const tagItem of item.tags ?? []) {
    const tag = await prisma.mediaTag.upsert({
      where: { name: tagItem.name },
      create: {
        name: tagItem.name,
        description: tagItem.description ?? "",
        category: tagItem.category ?? "General",
        rank: tagItem.rank ?? 0,
        isAdult: tagItem.isAdult ?? false,
        isGeneralSpoiler: tagItem.isGeneralSpoiler ?? false,
        isMediaSpoiler: tagItem.isMediaSpoiler ?? false
      },
      update: {}
    });
    await prisma.mediaTagOnMedia.upsert({
      where: { mediaId_tagId: { mediaId: media.id, tagId: tag.id } },
      create: { mediaId: media.id, tagId: tag.id, rank: tagItem.rank ?? 0, isSpoiler: tagItem.isMediaSpoiler ?? false },
      update: {}
    });
  }

  for (const edge of item.studios?.edges ?? []) {
    if (!edge.node?.name) continue;
    const studio = await prisma.studio.upsert({
      where: { name: edge.node.name },
      create: {
        name: edge.node.name,
        isAnimationStudio: edge.node.isAnimationStudio ?? true,
        siteUrl: edge.node.siteUrl ?? null
      },
      update: {}
    });
    await prisma.mediaStudio.upsert({
      where: { mediaId_studioId: { mediaId: media.id, studioId: studio.id } },
      create: { mediaId: media.id, studioId: studio.id, isMain: edge.isMain ?? false },
      update: { isMain: edge.isMain ?? false }
    });
  }

  for (const edge of item.characters?.edges ?? []) {
    if (!edge.node?.name?.full) continue;
    const character = await upsertCharacter(edge.node);
    const voiceActor = edge.voiceActors?.[0] ? await upsertStaff(edge.voiceActors[0]) : null;
    await prisma.mediaCharacter.create({
      data: {
        mediaId: media.id,
        characterId: character.id,
        role: mapCharacterRole(edge.role),
        voiceActorId: voiceActor?.id ?? null,
        language: voiceActor?.language ?? null
      }
    });
  }

  for (const edge of item.staff?.edges ?? []) {
    if (!edge.node?.name?.full) continue;
    const staff = await upsertStaff(edge.node);
    await prisma.mediaStaff.create({ data: { mediaId: media.id, staffId: staff.id, role: edge.role ?? "Staff" } });
  }

  for (const node of item.airingSchedule?.nodes ?? []) {
    await prisma.airingSchedule.create({
      data: {
        mediaId: media.id,
        airingAt: node.airingAt,
        timeUntilAiring: node.timeUntilAiring,
        episode: node.episode
      }
    });
  }

  return media;
}

async function upsertCharacter(character: AniListCharacter) {
  const full = character.name?.full ?? "Unknown Character";
  const existing = await prisma.character.findFirst({ where: { nameFull: full } });
  if (existing) return existing;
  return prisma.character.create({
    data: {
      nameFirst: character.name?.first ?? null,
      nameMiddle: character.name?.middle ?? null,
      nameLast: character.name?.last ?? null,
      nameFull: full,
      nameNative: character.name?.native ?? null,
      description: stripHtml(character.description),
      imageLarge: character.image?.large ?? null,
      imageMedium: character.image?.medium ?? null,
      gender: character.gender ?? null,
      dateOfBirthYear: character.dateOfBirth?.year ?? null,
      dateOfBirthMonth: character.dateOfBirth?.month ?? null,
      dateOfBirthDay: character.dateOfBirth?.day ?? null,
      age: character.age ?? null,
      bloodType: character.bloodType ?? null,
      favourites: character.favourites ?? 0
    }
  });
}

async function upsertStaff(staff: AniListStaff) {
  const full = staff.name?.full ?? "Unknown Staff";
  const existing = await prisma.staff.findFirst({ where: { nameFull: full } });
  if (existing) return existing;
  return prisma.staff.create({
    data: {
      nameFirst: staff.name?.first ?? null,
      nameMiddle: staff.name?.middle ?? null,
      nameLast: staff.name?.last ?? null,
      nameFull: full,
      nameNative: staff.name?.native ?? null,
      description: stripHtml(staff.description),
      imageLarge: staff.image?.large ?? null,
      imageMedium: staff.image?.medium ?? null,
      language: staff.languageV2 ?? null,
      homeTown: staff.homeTown ?? null,
      dateOfBirthYear: staff.dateOfBirth?.year ?? null,
      dateOfBirthMonth: staff.dateOfBirth?.month ?? null,
      dateOfBirthDay: staff.dateOfBirth?.day ?? null,
      dateOfDeathYear: staff.dateOfDeath?.year ?? null,
      dateOfDeathMonth: staff.dateOfDeath?.month ?? null,
      dateOfDeathDay: staff.dateOfDeath?.day ?? null,
      age: staff.age ?? null,
      yearsActive: staff.yearsActive ?? [],
      favourites: staff.favourites ?? 0
    }
  });
}

function mapFormat(value: string | null | undefined, type: MediaType): MediaFormat {
  if (value && value in MediaFormat) return value as MediaFormat;
  return type === MediaType.ANIME ? MediaFormat.TV : MediaFormat.MANGA;
}

function mapStatus(value: string | null | undefined): MediaStatus {
  if (value && value in MediaStatus) return value as MediaStatus;
  return MediaStatus.FINISHED;
}

function mapSource(value: string | null | undefined): MediaSource {
  if (value && value in MediaSource) return value as MediaSource;
  return MediaSource.OTHER;
}

function mapCharacterRole(value: string | null | undefined): CharacterRole {
  if (value && value in CharacterRole) return value as CharacterRole;
  return CharacterRole.SUPPORTING;
}

function stripHtml(value: string | null | undefined) {
  return value
    ?.replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+\n/g, "\n")
    .trim();
}

function uniqueSlug(title: string, externalId: number) {
  return `${slugify(title)}-${externalId}`;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
