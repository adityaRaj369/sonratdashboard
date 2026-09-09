FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json tsconfig.base.json ./
COPY packages/config/package.json packages/config/
COPY packages/shared/package.json packages/shared/
COPY apps/voice-runtime/package.json apps/voice-runtime/
RUN pnpm install --filter @sonrat/voice-runtime... --frozen-lockfile || pnpm install --filter @sonrat/voice-runtime...

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps/voice-runtime ./apps/voice-runtime
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages/config packages/config
COPY packages/shared packages/shared
COPY apps/voice-runtime apps/voice-runtime
RUN pnpm --filter @sonrat/shared build && \
    pnpm --filter @sonrat/config build && \
    pnpm --filter @sonrat/voice-runtime build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/packages/config/dist ./packages/config/dist
COPY --from=build /app/packages/config/package.json ./packages/config/
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/
COPY --from=build /app/apps/voice-runtime/dist ./apps/voice-runtime/dist
COPY --from=build /app/apps/voice-runtime/package.json ./apps/voice-runtime/
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
EXPOSE 4100
CMD ["node", "apps/voice-runtime/dist/index.js"]
