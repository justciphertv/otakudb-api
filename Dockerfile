FROM node:22-alpine AS deps

WORKDIR /app

RUN apk add --no-cache \
  libc6-compat \
  libstdc++ \
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
  libstdc++ \
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

# Your current tsconfig emits src/server.ts to dist/src/server.js.
# Fail during build if that entry file is missing, instead of crashing at runtime.
RUN test -f dist/src/server.js || \
  (echo "ERROR: pnpm build did not create dist/src/server.js. Check tsconfig.json outDir/rootDir/noEmit or update the Docker CMD/start script." && \
   echo "Files produced:" && \
   find dist -maxdepth 4 -type f | sort && \
   exit 1)

RUN pnpm prune --prod

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache \
  libc6-compat \
  libstdc++ \
  openssl \
  ca-certificates

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["node", "dist/src/server.js"]
