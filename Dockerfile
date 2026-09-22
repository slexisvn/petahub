# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY web/package.json web/package.json

RUN npm ci

FROM deps AS build
WORKDIR /app

COPY server server

RUN npm run prisma:generate --workspace server
RUN npm run build --workspace server
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/prisma ./server/prisma
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh && mkdir -p /data/storage

WORKDIR /app/server
EXPOSE 8080

CMD ["../docker-entrypoint.sh"]
