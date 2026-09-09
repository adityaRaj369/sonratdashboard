# Deployment

## Services

Deploy separately:

1. `web` — Next.js
2. `api` — Node HTTP
3. `worker` — BullMQ consumers
4. `voice-runtime` — WebSocket voice gateway

Plus managed PostgreSQL, Redis, and object storage.

## Containers

```bash
docker compose build
docker compose up -d
```

Dockerfiles live under each app directory.

## Production checklist

- [ ] Secrets configured (no mock/demo flags)
- [ ] Migrations applied (`pnpm db:migrate:deploy`)
- [ ] Redis available
- [ ] Object storage configured
- [ ] Exotel account + webhooks + streaming URL
- [ ] Gemini API key + model
- [ ] TLS terminated
- [ ] AUTH_SECRET rotated and strong
- [ ] CORS locked to app origin
- [ ] Rate limiting enabled
- [ ] Structured logging shipped
- [ ] `/health` and `/ready` monitored
- [ ] Backups + retention policies

## Environment

Production must set:

```
NODE_ENV=production
DEMO_MODE=false
MOCK_AI=false
MOCK_TELEPHONY=false
AI_PROVIDER=gemini
TELEPHONY_PROVIDER=exotel
STORAGE_PROVIDER=s3
```

`@sonrat/config` refuses to boot production with mock/demo enabled.

## Scaling

- Scale API horizontally behind a load balancer
- Scale workers by queue concurrency
- Voice runtime should be sticky/session-aware for websocket connections
- Use admission control limits per org and campaign
