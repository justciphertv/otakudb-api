import { ExternalMediaSearchResult, ImportedMediaPayload, MetadataImporter } from "./importer.js";

export class LocalJsonImporter implements MetadataImporter {
  name = "local-json";

  constructor(private readonly records: ImportedMediaPayload[] = []) {}

  async searchMedia(query: string): Promise<ExternalMediaSearchResult[]> {
    const normalized = query.toLowerCase();
    return this.records
      .filter((record) => record.titleRomaji.toLowerCase().includes(normalized))
      .map((record) => ({
        externalId: record.externalId,
        title: record.titleRomaji,
        type: record.type,
        source: this.name
      }));
  }

  async importMedia(externalId: string): Promise<ImportedMediaPayload> {
    const record = this.records.find((item) => item.externalId === externalId);
    if (!record) throw new Error("Local JSON media record not found");
    return record;
  }
}
