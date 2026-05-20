import { MeiliSearch } from "meilisearch";
import { env } from "../config/env.js";

export const meili = new MeiliSearch({
  host: env.MEILISEARCH_HOST,
  apiKey: env.MEILISEARCH_API_KEY
});

export const mediaIndex = meili.index("media");
