FROM node:22-alpine AS deps

WORKDIR /app

RUN apk add --no-cache \
  libc6-compat \
  openssl \
  python3 \
  make \
  g++

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile=false

FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache \
  libc6-compat \
  openssl

RUN corepack enable

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=deps /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

COPY prisma ./prisma
RUN pnpm prisma generate

COPY . .
RUN pnpm build
RUN pnpm prune --prod

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache \
  libc6-compat \
  openssl

RUN corepack enable

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["node", "dist/server.js"]
