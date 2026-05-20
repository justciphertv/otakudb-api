import { ExternalMediaSearchResult, ImportedMediaPayload, MetadataImporter } from "./importer.js";

export class ManualAdminImporter implements MetadataImporter {
  name = "manual-admin";

  async searchMedia(): Promise<ExternalMediaSearchResult[]> {
    return [];
  }

  async importMedia(externalId: string): Promise<ImportedMediaPayload> {
    throw new Error(`Manual admin importer cannot import ${externalId} without an admin payload`);
  }
}
