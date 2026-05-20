export type ExternalMediaSearchResult = {
  externalId: string;
  title: string;
  type: "ANIME" | "MANGA";
  source: string;
};

export type ImportedMediaPayload = {
  externalId: string;
  titleRomaji: string;
  titleEnglish?: string | null;
  description: string;
  type: "ANIME" | "MANGA";
  sourceName: string;
  raw?: unknown;
};

export interface MetadataImporter {
  name: string;
  searchMedia(query: string): Promise<ExternalMediaSearchResult[]>;
  importMedia(externalId: string): Promise<ImportedMediaPayload>;
}
