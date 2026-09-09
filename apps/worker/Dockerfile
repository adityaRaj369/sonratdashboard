FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json tsconfig.base.json ./
COPY packages/config/package.json packages/config/
COPY packages/shared/package.json packages/shared/
COPY packages/database/package.json packages/database/
COPY apps/worker/package.json apps/worker/
RUN pnpm install --filter @sonrat/worker... --frozen-lockfile || pnpm install --filter @sonrat/worker...

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages/config packages/config
COPY packages/shared packages/shared
COPY packages/database packages/database
COPY apps/worker apps/worker
RUN pnpm --filter @sonrat/shared build && \
    pnpm --filter @sonrat/config build && \
    pnpm --filter @sonrat/database build && \
    pnpm --filter @sonrat/worker build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/worker/dist ./apps/worker/dist
COPY --from=build /app/apps/worker/package.json ./apps/worker/
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
CMD ["node", "apps/worker/dist/index.js"]
