# Architecture

## Planes

### Control plane

Dashboard (`apps/web`) and API (`apps/api`) manage organizations, agents, campaigns, contacts, analytics, and settings.

The dashboard never holds provider secrets and never maintains realtime call media.

### Runtime plane

`apps/voice-runtime` owns Exotel media websockets, audio pipeline, Gemini Live sessions, interruptions, tool dispatch, and call session lifecycle.

`apps/worker` owns asynchronous work: imports, campaign scheduling, outbound dialing, summaries, metrics, outbox processing.

## Module boundaries

Frontend modules register into a central registry consumed by the reusable sidebar/workspace shell.

Backend domains follow controller → service → repository patterns with tenant scoping enforced in services.

## Provider abstractions

| Concern | Interface | Adapters |
|---------|-----------|----------|
| Telephony | `TelephonyProvider` | Exotel, Mock |
| AI | `AIProvider` | Gemini Live, Mock |
| Storage | `StorageProvider` | Local, S3, Mock |

Domain logic never imports Exotel/Gemini-specific types outside adapters.

## Multi-tenancy

Every tenant-owned row includes `organizationId`.

Organization is resolved from the authenticated session, never from client-supplied IDs.

RBAC roles: OWNER, ADMIN, MANAGER, AGENT_MANAGER, ANALYST, MEMBER.

## Agent versioning

Publishing an agent creates an immutable `AgentVersion`. Active calls snapshot `agentVersionId` and continue on that version even if the draft changes.

## Call lifecycle

Explicit state machine in `@sonrat/shared` / `CallStateService`:

```
QUEUED → INITIATING → RINGING → CONNECTED → AI_ACTIVE → COMPLETED
                                         ↘ HUMAN_HANDOFF → COMPLETED
```

Invalid transitions are rejected.

## Reliability

- Outbox pattern for campaign start and similar domain events
- BullMQ with retries, backoff + jitter, dead-letter
- Webhook and tool idempotency keys
- Admission control for org/campaign/provider concurrency
- Controlled batch production for large campaigns

## Observability

Structured JSON logs with `trace_id`, `request_id`, `organization_id`, `call_id`, etc.

Health: `/health`, readiness: `/ready`.

## Engineering decisions

1. **TypeScript everywhere** — one language across web, API, worker, voice runtime for shared types and faster iteration.
2. **Hono for API** — lightweight, typed, fast enough for control-plane workloads.
3. **Prisma** — explicit migrations, strong typing, PostgreSQL-first.
4. **BullMQ + Redis** — battle-tested job queue with concurrency controls.
5. **Mock providers by default in development** — full local UX without Exotel/Gemini credentials; production refuses mock flags.
6. **Gemini Live native audio** — no intermediate STT hop in the default path.
7. **npm/pnpm workspace + Turborepo** — modular monorepo with cached builds.
