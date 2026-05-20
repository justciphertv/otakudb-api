# otakudb-api

Production-oriented AniList-style anime and manga tracking API clone built with Fastify, GraphQL Yoga, Pothos, Prisma, PostgreSQL, Redis, and Meilisearch.

This project implements a compatible style of GraphQL API surface for lawful demo metadata. It does not use AniList branding, assets, private data, or scraping.

## Setup

Requirements:

- Node.js 22+
- pnpm
- Docker Desktop or compatible Docker Compose runtime

```bash
pnpm install
cp .env.example .env
docker compose up -d postgres redis meilisearch
pnpm prisma:generate
pnpm prisma:migrate -- --name init
pnpm prisma:seed
pnpm search:reindex
pnpm dev
```

GraphQL endpoint:

```txt
http://localhost:4000/graphql
```

Health endpoint:

```txt
http://localhost:4000/health
```

Demo users seeded with password `password123`:

- `admin@example.com`
- `demo@example.com`
- `reader@example.com`

## Environment

```txt
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://otakudb:otakudb@localhost:5432/otakudb
REDIS_URL=redis://localhost:6379
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=dev_meili_key
JWT_ACCESS_SECRET=change_me
JWT_REFRESH_SECRET=change_me
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=30d
ALLOWED_ORIGINS=http://localhost:3000
ENABLE_GRAPHQL_INTROSPECTION=true
RATE_LIMIT_PER_MINUTE=90
ANILIST_GRAPHQL_ENDPOINT=https://graphql.anilist.co
ANILIST_ACCESS_TOKEN=
ANILIST_REQUESTS_PER_MINUTE=60
```

## Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm test
pnpm prisma:migrate
pnpm prisma:generate
pnpm prisma:seed
pnpm import:anilist
pnpm search:reindex
```

## Schema Overview

Core domains:

- Metadata: `Media`, `Character`, `Staff`, `Studio`, genres, tags, relations, airing schedules
- Users: accounts, auth settings, title language, score format
- Lists: `MediaList`, `MediaListCollection`, custom lists, private entry visibility
- Social: favourites, follows, reviews, review ratings, activities, replies, likes, notifications
- Admin: metadata CRUD, reports, audit logs
- Importers: source-agnostic `MetadataImporter` interface with local/manual/future public adapters
- Optional AniList public API importer that calls the official GraphQL endpoint when lawful for your use case

The API uses Pothos to build the GraphQL schema. Relation-heavy fields use DataLoader for core user/media lookups, while public metadata reads are Redis-cacheable through the service layer.

## Auth

Register or login to receive an access token and refresh token:

```graphql
mutation Login {
  Login(email: "demo@example.com", password: "password123") {
    accessToken
    refreshToken
    user {
      id
      name
    }
  }
}
```

Send authenticated requests with:

```txt
Authorization: Bearer <accessToken>
```

Access tokens expire after 15 minutes. Refresh tokens expire after 30 days and are stored as hashes in the database.

## GraphQL Examples

### Media Search

```graphql
query SearchAnime($search: String) {
  Page(page: 1, perPage: 10) {
    pageInfo {
      currentPage
      hasNextPage
      perPage
    }
    media(search: $search, type: ANIME, sort: [POPULARITY_DESC]) {
      id
      title {
        romaji
        english
        native
      }
      format
      status
      episodes
      averageScore
      coverImage {
        large
        medium
      }
    }
  }
}
```

### Save List Entry

```graphql
mutation SaveEntry($mediaId: Int!) {
  SaveMediaListEntry(
    input: {
      mediaId: $mediaId
      status: CURRENT
      progress: 1
      score: 8.5
    }
  ) {
    id
    status
    progress
    score
    media {
      id
      title {
        romaji
      }
    }
  }
}
```

### User Collection

```graphql
query UserAnimeList($userName: String!) {
  MediaListCollection(userName: $userName, type: ANIME) {
    lists {
      name
      status
      entries {
        id
        progress
        score
        media {
          id
          title {
            romaji
            english
          }
          coverImage {
            medium
          }
        }
      }
    }
  }
}
```

## Search

`SearchService` indexes media documents into Meilisearch with title fields, synonyms, description, genres, tags, format, status, season, scores, popularity, favourites, trending, and adult flags.

Rebuild the index:

```bash
pnpm search:reindex
```

If Meilisearch is unavailable, media search falls back to PostgreSQL queries across titles, synonyms, description, genres, and tags.

## Optional AniList API Importer

`AniListPublicApiImporter` is an official GraphQL API client, not a scraper. Public metadata requests can run without credentials. If you have a valid user access token for permitted API operations, set:

```txt
ANILIST_ACCESS_TOKEN=...
```

Do not commit client secrets or access tokens. Rotate any secret that has been pasted into chat, logs, or source control.

Populate local metadata from AniList's official API:

```bash
pnpm import:anilist
```

By default this imports 25 anime and 25 manga. Override with `ANILIST_IMPORT_PER_TYPE=50`.

## Rate Limiting And Security

- Default rate limit: 90 requests per minute.
- Anonymous requests are keyed by IP.
- Authenticated requests are keyed by user id.
- GraphQL depth and complexity validation are enabled.
- Introspection is disabled in production unless `ENABLE_GRAPHQL_INTROSPECTION=true`.
- Inputs are validated with Zod in service methods.
- User-provided text is sanitized before persistence.
- Password hashes and token hashes are never exposed.

## Testing

```bash
pnpm test
pnpm lint
pnpm build
```

The current suite covers auth primitives, pagination limits, sanitization, and schema operation presence. Integration tests can be expanded against the Docker Compose database using the seeded dataset.

## Known Limitations

- OAuth application storage is present, but a full authorization-code flow is intentionally deferred.
- The first pass uses compact service modules instead of a large repository class per model.
- Page `pageInfo.total` is based on media filters by default; exact per-collection totals can be expanded with a selected-field-aware Page resolver.
- Some admin create/update mutations use minimal payloads for character, staff, and studio records.

## Suggested Next Features

- Full OAuth2 authorization-code and refresh-token rotation flow.
- Persisted GraphQL operations and per-client complexity budgets.
- Expanded integration tests with Testcontainers or a dedicated Docker test database.
- Background jobs for scheduled search indexing and notification fanout.
- More granular moderation actions and user privacy settings.
