import { PrismaClient } from "@prisma/client";
import { Index, MeiliSearch } from "meilisearch";

export type ExternalMediaSearchResult = {
  externalId: string;
  title: string;
  type: string;
  source: string;
};

export type MediaSearchFilters = {
  type?: string | null;
  isAdult?: boolean | null;
};

export class SearchService {
  private readonly index: Index;

  constructor(
    private readonly client: MeiliSearch,
    private readonly prisma: PrismaClient
  ) {
    this.index = client.index("media");
  }

  async configure() {
    await this.index.updateFilterableAttributes([
      "type",
      "format",
      "status",
      "season",
      "seasonYear",
      "genres",
      "tags",
      "isAdult"
    ]);
    await this.index.updateSortableAttributes([
      "id",
      "titleRomaji",
      "titleEnglish",
      "startDateYear",
      "endDateYear",
      "averageScore",
      "popularity",
      "trending",
      "favourites",
      "updatedAt"
    ]);
  }

  async searchMedia(query: string, filters: MediaSearchFilters = {}) {
    try {
      const filterParts = [];
      if (filters.type) filterParts.push(`type = ${filters.type}`);
      if (filters.isAdult !== undefined && filters.isAdult !== null) {
        filterParts.push(`isAdult = ${filters.isAdult}`);
      }
      const result = await this.index.search(query, {
        filter: filterParts.length ? filterParts : undefined,
        limit: 50
      });
      return result.hits.map((hit: any) => Number(hit.id)).filter(Boolean);
    } catch {
      const rows = await this.prisma.media.findMany({
        where: {
          AND: [
            filters.type ? { type: filters.type as any } : {},
            filters.isAdult === undefined || filters.isAdult === null ? {} : { isAdult: filters.isAdult },
            {
              OR: [
                { titleRomaji: { contains: query, mode: "insensitive" } },
                { titleEnglish: { contains: query, mode: "insensitive" } },
                { titleNative: { contains: query, mode: "insensitive" } },
                { description: { contains: query, mode: "insensitive" } },
                { synonyms: { some: { text: { contains: query, mode: "insensitive" } } } },
                { genres: { some: { genre: { name: { contains: query, mode: "insensitive" } } } } },
                { tags: { some: { tag: { name: { contains: query, mode: "insensitive" } } } } }
              ]
            }
          ]
        },
        select: { id: true },
        take: 50
      });
      return rows.map((row) => row.id);
    }
  }

  async indexMedia(mediaId: number) {
    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
      include: {
        synonyms: true,
        genres: { include: { genre: true } },
        tags: { include: { tag: true } }
      }
    });
    if (!media) return;
    await this.index.addDocuments([
      {
        id: media.id,
        type: media.type,
        format: media.format,
        status: media.status,
        titleRomaji: media.titleRomaji,
        titleEnglish: media.titleEnglish,
        titleNative: media.titleNative,
        description: media.description,
        synonyms: media.synonyms.map((item) => item.text),
        genres: media.genres.map((item) => item.genre.name),
        tags: media.tags.map((item) => item.tag.name),
        season: media.season,
        seasonYear: media.seasonYear,
        averageScore: media.averageScore,
        popularity: media.popularity,
        trending: media.trending,
        favourites: media.favourites,
        isAdult: media.isAdult,
        updatedAt: media.updatedAt.getTime(),
        startDateYear: media.startDateYear,
        endDateYear: media.endDateYear
      }
    ]);
  }

  async deleteMedia(mediaId: number) {
    await this.index.deleteDocument(mediaId).catch(() => undefined);
  }

  async reindexAll() {
    await this.configure();
    const rows = await this.prisma.media.findMany({ select: { id: true } });
    for (const row of rows) await this.indexMedia(row.id);
    return rows.length;
  }
}
