# Sonrat

Production-ready multi-tenant SaaS platform for AI-powered voice sales and customer support.

Control plane: dashboard + API  
Runtime plane: Exotel telephony streaming + Gemini Live voice AI

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

```
Organization → Agent Config → Agent Version → Campaign → Contacts
    → Call Queue → Exotel → Voice Gateway → Gemini Live
    → Tools / Transcript / Lead / Callback / Analytics
```

## Monorepo

| Path | Package | Role |
|------|---------|------|
| `apps/web` | `@sonrat/web` | Next.js control-plane dashboard |
| `apps/api` | `@sonrat/api` | REST API, webhooks, auth, domain services |
| `apps/worker` | `@sonrat/worker` | BullMQ async jobs |
| `apps/voice-runtime` | `@sonrat/voice-runtime` | Realtime voice gateway |
| `packages/database` | `@sonrat/database` | Prisma schema + client |
| `packages/shared` | `@sonrat/shared` | Schemas, RBAC, call state, prompts |
| `packages/config` | `@sonrat/config` | Typed environment validation |

## Quick start

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 16
- Redis 7
- Docker optional (compose provided)

### Setup

```bash
cp .env.example .env
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Services:

- Web: http://localhost:3000
- API: http://localhost:4000
- Voice runtime: http://localhost:4100

Demo login (after seed):

- Email: `demo@sonrat.ai`
- Password: `Password123!`

### Mock vs production providers

Local defaults:

```
AI_PROVIDER=mock
TELEPHONY_PROVIDER=mock
MOCK_AI=true
MOCK_TELEPHONY=true
DEMO_MODE=true
```

Production requires real credentials and mock/demo flags disabled. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Database](docs/DATABASE.md)
- [API](docs/API.md)
- [Voice runtime](docs/VOICE_RUNTIME.md)
- [Local development](docs/LOCAL_DEVELOPMENT.md)
- [Security](docs/SECURITY.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## Scripts

```bash
pnpm dev           # all apps
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm db:migrate
pnpm db:seed
```

## License

Proprietary.
