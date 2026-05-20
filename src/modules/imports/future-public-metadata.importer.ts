import { ExternalMediaSearchResult, ImportedMediaPayload, MetadataImporter } from "./importer.js";

export class FuturePublicMetadataImporter implements MetadataImporter {
  name = "future-public-metadata";

  async searchMedia(): Promise<ExternalMediaSearchResult[]> {
    return [];
  }

  async importMedia(): Promise<ImportedMediaPayload> {
    throw new Error("No licensed public metadata source is configured");
  }
}
