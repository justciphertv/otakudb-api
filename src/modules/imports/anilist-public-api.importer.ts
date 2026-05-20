import { env } from "../../config/env.js";
import { ExternalMediaSearchResult, ImportedMediaPayload, MetadataImporter } from "./importer.js";

type AniListMedia = {
  id: number;
  idMal?: number | null;
  type: "ANIME" | "MANGA";
  format?: string | null;
  status?: string | null;
  title: {
    romaji?: string | null;
    english?: string | null;
    native?: string | null;
  };
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
    id: number;
    name: string;
    description?: string | null;
    category?: string | null;
    rank?: number | null;
    isAdult?: boolean | null;
    isGeneralSpoiler?: boolean | null;
    isMediaSpoiler?: boolean | null;
  }> | null;
};

const MEDIA_FIELDS = `
  id
  idMal
  type
  format
  status
  title {
    romaji
    english
    native
  }
  description(asHtml: false)
  startDate {
    year
    month
    day
  }
  endDate {
    year
    month
    day
  }
  season
  seasonYear
  episodes
  duration
  chapters
  volumes
  countryOfOrigin
  source
  hashtag
  trailer {
    id
    site
  }
  coverImage {
    large
    medium
  }
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
  tags {
    id
    name
    description
    category
    rank
    isAdult
    isGeneralSpoiler
    isMediaSpoiler
  }
`;

export class AniListPublicApiImporter implements MetadataImporter {
  name = "anilist-public-api";
  private nextRequestAt = 0;
  private readonly spacingMs = Math.ceil(60_000 / env.ANILIST_REQUESTS_PER_MINUTE);

  async searchMedia(query: string): Promise<ExternalMediaSearchResult[]> {
    const result = await this.request<{ Page: { media: AniListMedia[] } }>(
      `
        query SearchMedia($search: String!) {
          Page(page: 1, perPage: 10) {
            media(search: $search, sort: [POPULARITY_DESC]) {
              id
              type
              title {
                romaji
                english
              }
            }
          }
        }
      `,
      { search: query }
    );

    return result.Page.media.map((media) => ({
      externalId: String(media.id),
      title: media.title.romaji ?? media.title.english ?? `AniList media ${media.id}`,
      type: media.type,
      source: this.name
    }));
  }

  async importMedia(externalId: string): Promise<ImportedMediaPayload> {
    const result = await this.request<{ Media: AniListMedia }>(
      `
        query ImportMedia($id: Int!) {
          Media(id: $id) {
            ${MEDIA_FIELDS}
          }
        }
      `,
      { id: Number(externalId) }
    );

    const media = result.Media;
    return {
      externalId: String(media.id),
      titleRomaji: media.title.romaji ?? media.title.english ?? `Imported media ${media.id}`,
      titleEnglish: media.title.english,
      description: media.description ?? "Imported public metadata record.",
      type: media.type,
      sourceName: this.name,
      raw: media
    } as ImportedMediaPayload & { raw: AniListMedia };
  }

  private async request<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    await this.throttle();
    const headers: Record<string, string> = {
      "content-type": "application/json",
      accept: "application/json"
    };
    if (env.ANILIST_ACCESS_TOKEN) {
      headers.authorization = `Bearer ${env.ANILIST_ACCESS_TOKEN}`;
    }

    const response = await fetch(env.ANILIST_GRAPHQL_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables })
    });

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("retry-after") ?? "60");
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      return this.request<T>(query, variables);
    }

    const payload = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };
    if (!response.ok || payload.errors?.length || !payload.data) {
      const message = payload.errors?.map((error) => error.message).join("; ") || response.statusText;
      throw new Error(`AniList API request failed: ${message}`);
    }
    return payload.data;
  }

  private async throttle() {
    const now = Date.now();
    const waitMs = Math.max(0, this.nextRequestAt - now);
    if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
    this.nextRequestAt = Date.now() + this.spacingMs;
  }
}
