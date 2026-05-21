FROM node:22-alpine AS deps

WORKDIR /app

RUN apk add --no-cache \
  libc6-compat \
  openssl \
  python3 \
  make \
  g++

RUN corepack enable && corepack prepare pnpm@11.2.2 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile=false

FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache \
  libc6-compat \
  openssl \
  python3 \
  make \
  g++

RUN corepack enable && corepack prepare pnpm@11.2.2 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=deps /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

COPY . .

RUN pnpm prisma generate
RUN pnpm build

# Fail during build instead of crashing at runtime if TypeScript did not emit the expected entry file.
RUN test -f dist/server.js || \
  (echo "ERROR: pnpm build did not create dist/server.js. Check tsconfig.json outDir/rootDir/noEmit or update package.json start path." && \
   echo "Files produced:" && \
   find . -maxdepth 4 -type f | sort | sed -n '1,240p' && \
   exit 1)

RUN pnpm prune --prod

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache \
  libc6-compat \
  openssl \
  ca-certificates

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["node", "dist/server.js"]
