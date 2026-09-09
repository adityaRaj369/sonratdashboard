# Local Development

## 1. Infrastructure

With Docker:

```bash
docker compose up -d postgres redis minio
```

Or use local PostgreSQL/Redis and update `.env`.

## 2. Environment

```bash
cp .env.example .env
```

Ensure `AUTH_SECRET` is at least 32 characters.

## 3. Install & migrate

```bash
pnpm install
pnpm db:generate
pnpm --filter @sonrat/database exec prisma migrate dev --name init
pnpm db:seed
```

## 4. Run

```bash
pnpm dev
```

Or individually:

```bash
pnpm dev:api
pnpm dev:worker
pnpm dev:voice
pnpm dev:web
```

## 5. Demo credentials

- `demo@sonrat.ai` / `Password123!`

## Mock mode

Default local mode uses mock telephony and mock AI so the full control-plane UX works without provider credentials.

Campaign start still creates calls and advances the call state machine through the mock provider.

## Provider credentials

See `.env.example` for Gemini and Exotel variables. When ready:

```
AI_PROVIDER=gemini
MOCK_AI=false
GEMINI_API_KEY=...

TELEPHONY_PROVIDER=exotel
MOCK_TELEPHONY=false
EXOTEL_API_KEY=...
EXOTEL_API_TOKEN=...
EXOTEL_ACCOUNT_SID=...
EXOTEL_PHONE_NUMBER=...
EXOTEL_WEBHOOK_BASE_URL=https://your-public-api
```

## Tests

```bash
pnpm test
pnpm typecheck
pnpm lint
```
