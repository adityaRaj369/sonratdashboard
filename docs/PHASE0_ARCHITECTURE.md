# PHASE 0 — Production Architecture (Master Spec Alignment)

Status: COMPLETE — awaiting `START PHASE 1`  
Date: 2026-09-07  
Target: 20 orgs → scalable; ~40k+ calls/day initial; Gemini Live + Exotel V1

This document is the binding Phase 0 output. Implementation proceeds only when instructed phase-by-phase.

---

## 1. Current repository assessment

### What exists today

| Deployable | Path | Role |
|------------|------|------|
| Dashboard | `apps/web` (Next.js 15) | Control-plane UI (SEAM shell, modules under `views/`) |
| API | `apps/api` (Hono) | Auth, orgs, agents, campaigns, contacts, calls, webhooks |
| Worker | `apps/worker` (BullMQ) | Campaign dial, imports, recordings, summaries, outbox |
| Voice runtime | `apps/voice-runtime` | Exotel WS + Gemini Live + tools (combined edge+runtime) |

| Package | Path | Role |
|---------|------|------|
| `@sonrat/shared` | `packages/shared` | RBAC, call state, schemas, prompts |
| `@sonrat/database` | `packages/database` | Prisma + PostgreSQL |
| `@sonrat/config` | `packages/config` | Env validation |
| `@sonrat/ui` | `packages/ui` | Shared UI primitives |

### What already aligns with the master prompt

- Multi-tenant `organizationId` on core models; session-derived org context
- RBAC roles (OWNER…MEMBER)
- Agent + immutable `AgentVersion` publish model
- `TelephonyProvider` / Exotel + Mock adapters (API + worker)
- `AIProvider` / Gemini Live + Mock (voice-runtime)
- Call state machine (subset of required states)
- Campaign + contact import + admission control (Redis/BullMQ)
- Outbox pattern → BullMQ jobs
- Recording job stub / metadata path
- Structured logging hooks
- Mock vs production flags

### Critical gaps vs master architecture

| Required | Current | Gap |
|----------|---------|-----|
| Voice Edge ≠ Call Runtime | Single `voice-runtime` app | Must split logically/deployably |
| Flow Engine + Flow versions | Absent | New domain + package |
| Tool Gateway (registered tools only) | Runtime tools; incomplete Live wiring | Harden + gateway package |
| Capacity Manager (global/inbound/outbound/AI) | Partial admission | First-class service |
| Kafka event backbone | BullMQ + outbox only | Introduce Kafka (or staged: outbox→Kafka) |
| ClickHouse analytics | Postgres metrics JSON | New analytics plane |
| Knowledge RAG pipeline | Inline FAQ text | Async ingest + vector store |
| WhatsApp | Absent | Phase 12 |
| TelephonyAccount → capacity pool | Global env Exotel creds | Per-account/pool model |
| Admin org provisioning | Demo localStorage admin | Real platform admin |
| Dashboard modules (flows, support, WA, usage) | agents/campaigns/contacts/calls | Restructure modules |
| Dashboard ≠ provider calls | Generally OK | Enforce strictly |
| Session router + pin to runtime | Weak | Explicit routing |
| Language detector (non-LLM) | Partial multilingual state | Dedicated language system |
| No fake production paths | Mocks default locally | Keep mocks for tests only |

### Decision: evolve, do not blind rewrite

The monorepo is a usable foundation. Phase 1+ will **reshape toward** the target tree (`dashboard/` + `server/apps/*` + shared packages) by moving/renaming and extracting packages, without discarding working tenant/auth/agent/campaign code unless it conflicts with the master boundaries.

---

## 2. Proposed final architecture

```text
                         INTERNET
                            |
              +-------------+-------------+
              |                           |
              v                           v
         Dashboard                     Exotel
              |                           |
           HTTPS                         WSS
              v                           v
       Cloudflare/WAF              Voice Load Balancer
              |                           |
              v                           v
           API Service               Voice Edge
              |                           |
              |                           v
              |                     Session Router
              |                           |
              |                           v
              |                     Call Runtime
              |                           |
              |              +------------+------------+
              |              |            |            |
              |              v            v            v
              |          AI Gateway   Flow Engine   Tool Gateway
              |              |                         |
              |              v                         v
              |        GeminiProvider            Customer APIs
              |        (Sarvam/Local later)
              |
              +-------------------+------------------+
              |                   |                  |
              v                   v                  v
         PostgreSQL             Redis              Kafka
                                                     |
                              +----------------------+------------------+
                              |                      |                  |
                              v                      v                  v
                       Campaign Worker        Background Worker   Analytics Worker
                              |                      |                  |
                              v                      v                  v
                       Capacity Manager      Recording/Knowledge    ClickHouse
                              |                   → S3
                              v
                           Exotel
```

**Planes**

1. **Dashboard** — product UX only; talks to API (+ SSE/WS via API)
2. **Control plane** — API: auth, tenancy, agents, flows, campaigns, tools metadata, usage, billing, audit
3. **Realtime plane** — Voice Edge → Session Router → Call Runtime → AI Gateway / Flow Engine / Tool Gateway
4. **Async plane** — Kafka consumers: campaign dialer, webhooks, recordings, knowledge, usage
5. **Data/analytics plane** — PostgreSQL (SoT), Redis (hot), S3 (blobs), ClickHouse (analytics)

**Hard boundaries (non-negotiable)**

- Dashboard ≠ API ≠ realtime audio
- Audio never through Kafka / PostgreSQL / API
- LLM ≠ business logic (Flow Engine owns deterministic rules)
- Campaign ≠ Dialer; Dialer asks Capacity Manager before Exotel
- Gemini/Exotel only behind providers

---

## 3. Final repository structure

Target (evolve current tree toward this):

```text
sonrat/
  dashboard/                          # from apps/web
    src/
      app/
      modules/
        organizations/
        agents/
        agent-flows/
        campaigns/                    # Sales UI
        customer-support/
        whatsapp/
        calls/
        recordings/
        analytics/
        knowledge/
        usage/
        billing/
        settings/
        admin/
      components/
      hooks/
      services/
      stores/
      types/
      lib/

  server/
    apps/
      api/
      voice-edge/
      call-runtime/                   # split from apps/voice-runtime
      campaign-worker/                # from apps/worker (dial path)
      background-worker/              # recordings, knowledge, usage, webhooks
      analytics-worker/
    packages/
      auth/
      tenancy/
      database/
      redis/
      events/                         # Kafka schemas + producers
      ai/                             # AIProvider + GeminiProvider
      telephony/                      # TelephonyProvider + ExotelProvider
      flow-engine/
      tool-runtime/
      capacity/
      storage/
      observability/
      shared-types/
    migrations/
    tests/

  infrastructure/
    docker/
    terraform/
    deployment/

  docs/
```

**V1 migration path from current**

| Now | Target |
|-----|--------|
| `apps/web` | `dashboard/` (rename/move when Phase 1 scaffolding runs) |
| `apps/api` | `server/apps/api` |
| `apps/voice-runtime` | split → `voice-edge` + `call-runtime` (Phases 4–5) |
| `apps/worker` | split → `campaign-worker` + `background-worker` |
| `packages/shared` | split into `shared-types`, `auth`, `tenancy`, `events` gradually |
| `packages/database` | `server/packages/database` |
| New | `ai`, `telephony`, `flow-engine`, `tool-runtime`, `capacity`, `events` |

No custom `api-gateway-service`. Cloudflare/WAF + LB → API.

---

## 4. Technology choices

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Language | TypeScript (Node 20+) | Shared types across planes |
| Dashboard | Next.js (App Router) | Existing; modular modules/ |
| API | Hono | Existing; control plane only |
| ORM | Prisma + PostgreSQL | Existing SoT |
| Cache/locks/capacity | Redis | Required in prod |
| Async events | **Kafka** (target); BullMQ bridge in early phases | Master requires Kafka; migrate via outbox→Kafka |
| Jobs | Campaign/background/analytics workers | Separate deployables |
| Voice Edge | Fastify/WS (extract from voice-runtime) | Provider protocol termination |
| Call Runtime | Dedicated process | Session pin, flow, AI coord |
| AI V1 | Gemini Live via `AIProvider` | No self-hosted LLM V1 |
| Telephony V1 | Exotel via `TelephonyProvider` | India; AgentStream |
| Object storage | S3-compatible | Recordings, docs |
| Analytics OLAP | ClickHouse | Not Postgres for heavy analytics |
| Vector store | TBD in Phase 8 (pgvector or managed) | Knowledge |
| Observability | OpenTelemetry + structured logs | Traces per call |
| IaC | Terraform + Docker | `infrastructure/` |
| Monorepo | pnpm + Turborepo | Keep |

**Explicit non-choices for V1:** self-hosted LLM/GPU, custom API gateway microservice, sharding Postgres, audio-on-Kafka.

---

## 5. Data model overview

Every tenant row: `organization_id`. Prefer RLS later; always enforce in services.

### Core control-plane entities

```text
organizations
users
memberships (role)
sessions

agents
agent_versions          # immutable publish snapshots

flows
flow_versions           # immutable graph JSON + node schemas

tools
tool_versions
tool_credentials        # secret refs only

knowledge_sources
knowledge_documents
knowledge_chunks        # + vector refs

telephony_accounts      # provider account + capacity config
phone_numbers           # → org, inbound agent/flow, account

campaigns
campaign_contacts       # explicit contact states
call_attempts

calls
call_events
call_sessions           # runtime pin / recovery pointers

recordings              # S3 object key + metadata

whatsapp_channels
whatsapp_templates
whatsapp_conversations  # Phase 12

usage_records
billing_records
audit_logs
idempotency_keys
```

### Capacity configuration (DB + Redis counters)

```text
platform_limits
provider_pool_limits    # concurrency, CPS (commercial values, not hardcoded myths)
organization_limits
campaign_limits
inbound_reserved_slots
ai_session_limits
```

### Call / campaign contact states (explicit machines)

**Call (runtime-aligned):**  
CREATED → DIALING → RINGING → CONNECTED → INITIALIZING_AI → ACTIVE ⇄ TOOL_EXECUTION → COMPLETING → COMPLETED  
Failures: PROVIDER_FAILED | AI_FAILED | AUDIO_FAILED | TOOL_FAILED | TIMEOUT | DISCONNECTED

**Campaign contact:**  
IMPORTED → VALIDATED → QUEUED → DIALING → RINGING → ANSWERED → COMPLETED | FAILED | RETRY_PENDING | RETRY_EXHAUSTED | SKIPPED

Version pinning on call create: `agent_version_id`, `flow_version_id` never mutate mid-call.

---

## 6. Event model overview

Kafka topics (durable metadata/work — never audio frames):

| Event | Purpose |
|-------|---------|
| `call.created` / `started` / `connected` / `language.detected` / `completed` / `failed` | Lifecycle |
| `campaign.created` / `started` / `contact.queued` / `call.started` / `call.completed` / `completed` | Outbound |
| `webhook.received` | Provider callbacks after ACK |
| `recording.available` / `processed` | Media pipeline |
| `knowledge.ingestion.requested` / `completed` | RAG |
| `usage.recorded` | Billing |
| `tool.executed` | Audit/analytics |

Early phases may emit via **outbox → BullMQ** with identical event names; Phase 9–11 cut over producers to Kafka without changing event contracts.

---

## 7. Realtime call sequence

```text
1. Inbound: Exotel → Voice Edge WSS
   Outbound: Campaign Worker → Capacity Manager reserve → ExotelProvider.startCall
             → Exotel connects stream → Voice Edge

2. Voice Edge: auth, framing, heartbeat, metrics
   → Session Router resolves:
        call_id, org_id, agent_version_id, flow_version_id,
        phone_number, telephony_account, runtime_region
   → pin call to Call Runtime instance (Redis membership)

3. Call Runtime:
   INITIALIZING_AI → AI Gateway.startSession(GeminiProvider)
   load Flow version into Flow Engine
   language state = EN|HI (+ detect over time)

4. Audio loop (short path only):
   Exotel ↔ Voice Edge ↔ Call Runtime ↔ AI Gateway ↔ Gemini
   Barge-in: VAD → interrupt AI → clear TTS → listen

5. Turns:
   deterministic nodes → Flow Engine (no LLM)
   language understanding → AI
   tools → Tool Gateway → registered customer API only
   knowledge → precomputed retrieval (not parse-on-call)

6. Completion:
   hangup → release capacity → emit call.completed
   recording async via Kafka → S3 → metadata
```

---

## 8. Campaign sequence

```text
Create campaign + Excel/manual contacts
  → validate/dedupe (async)
  → start campaign
  → Scheduler selects callable contacts in calling window
  → emit campaign.contact.queued (Kafka)
  → Dialer workers claim work
  → Capacity Manager.reserve(org, campaign, provider, AI, inbound-safe)
       fail → requeue / delay
  → TelephonyProvider.startCall (Exotel)
  → contact state DIALING → …
  → on terminal: retry rules or RETRY_EXHAUSTED
  → release capacity (with lease expiry for crash safety)
  → campaign metrics via analytics worker
```

Inbound never shares the same admission pool as outbound without **reserved inbound capacity**.

---

## 9. Dashboard / control-plane sequence

```text
Browser
  → HTTPS API only (never Gemini/Exotel/customer APIs/DB/Redis/Kafka)
  → session auth + org from membership
  → RBAC permission check
  → service layer scoped by organization_id
  → PostgreSQL write / read
  → outbox/Kafka for side effects

Live dashboard (active calls, campaign progress):
  Runtime/workers → events → Redis/ClickHouse projections
  → API SSE/WebSocket → Dashboard
```

Modules: Organizations, Agents, Agent Flows, Sales/Campaigns, Customer Support, WhatsApp, Calls, Recordings, Analytics, Knowledge, Usage, Billing, Settings, Admin.

---

## 10. Failure / recovery strategy

| Failure | Response |
|---------|----------|
| Exotel timeout/outage | Circuit breaker; mark PROVIDER_FAILED; retry policy on contacts |
| Gemini rate limit/outage | AI Gateway backoff; AI_FAILED; do not burn capacity forever |
| Runtime crash | Session checkpoint in Redis + durable PG; recover/resume or safe hangup |
| Worker crash | Capacity leases expire; Kafka/BullMQ retry; idempotent dial |
| Duplicate webhook | provider_event_id + idempotency key |
| Tool timeout | Tool Gateway timeout/circuit; TOOL_FAILED node handling in flow |
| Redis loss | Degrade: reject new dials; active calls may continue on local memory; rebuild counters |
| Graceful shutdown | drain: stop new sessions; finish active; campaign workers stop claiming |

Classify errors: retryable / non-retryable / unknown. Never double-dial / double-charge.

---

## 11. Scaling strategy

**Initial production target:** 20 orgs, ~20k outbound + ~20k inbound / day, bursty concurrency.

Scale drivers: concurrent calls, CPS, AI sessions, tool RPS — **not** org count alone.

| Component | Scale signal |
|-----------|--------------|
| Voice Edge | WS count, CPU, network |
| Call Runtime | active sessions, realtime latency |
| Campaign workers | queue depth + available capacity |
| Analytics workers | Kafka lag |
| API | RPS / latency (stateless) |

**Capacity Manager** is the safety valve: platform / provider / org / campaign / AI / inbound-reserved.

**AI:** single platform Gemini project; per-org usage metering; raise quotas commercially; later multi-pool / Sarvam / Local behind `AIProvider`.

**Telephony:** configurable provider pools; commercial Exotel arrangement for reseller/SaaS must be documented and contracted — do not assume retail ToS allows unlimited multi-tenant resale.

**Data:** PG HA → read replicas → partition hot tables before sharding. ClickHouse for analytics. No day-one shard.

Load test ladder: 10 → 50 → 100 → 250 → 500 → 1000 concurrent (within provisioned provider/AI caps).

---

## 12. Security strategy

- Session/JWT auth; CSRF/CORS/secure headers as applicable
- RBAC central permissions; org derived from auth context only
- Tenant isolation on every query; RLS where appropriate
- Secrets in secret manager; tool credentials never to browser
- Webhook signature verification + idempotency
- Rate limits at edge + API
- Audit log for admin/config/tool mutations
- Encryption in transit; encryption at rest for S3/PG
- Provider credentials platform-managed V1 (BYOK later if required)

---

## 13. Phase-by-phase implementation plan

| Phase | Scope | Exit criteria |
|-------|--------|---------------|
| **0** | This architecture pack | Accepted; wait for START PHASE 1 |
| **1** | Monorepo foundation, auth, org, RBAC, tenant isolation, logging, tests | Login/org/membership/RBAC tests green |
| **2** | Agents CRUD, config, versions, publish, languages, voice/AI config | Publish pins version for new calls |
| **3** | Flow engine (START/SAY/ASK/COLLECT/IF/SET/VALIDATE/END → then richer nodes) | Engine unit tests without telephony |
| **4** | ExotelProvider + Voice Edge + streaming + callbacks | Real Exotel integration verified |
| **5** | AIProvider + GeminiProvider + AI Gateway + barge-in + tools hook | Interrupt + duplex audio verified |
| **6** | First E2E phone call (Agent+Flow+Language+State+Recording path) | Real call reliable |
| **7** | Tool Gateway | Real test API tool round-trip |
| **8** | Knowledge ingest + retrieval | Doc → answer on call |
| **9** | Campaigns + Capacity Manager + dialer | 10→100→1000 contacts tests |
| **10** | Webhooks + recordings → S3 + dashboard playback | Duplicate webhook safe |
| **11** | Analytics → ClickHouse + API + dashboard | Analytics without crushing PG |
| **12** | WhatsApp (reuse Agent/Flow/Tool/Knowledge) | After voice stable |
| **13** | Hardening + failure drills + load tests | Measured; no “ready” without evidence |

**Rule:** one phase at a time; report format per §81; stop on failing tests.

---

## 14. Risks and assumptions

### Assumptions

1. Exotel commercial account will be provisioned with concurrency/CPS matching launch traffic; values are **config**, not code constants.
2. Gemini Live quotas will be raised for paid production; platform uses one Gemini account with per-org metering.
3. Kafka + ClickHouse + S3 available in staging/prod (local may use Redpanda/MinIO/docker).
4. Initial languages EN + HI; code-mix and dynamic detection in runtime language system.
5. Existing code is evolved into target structure rather than deleted wholesale.
6. Reseller/multi-tenant use of Exotel is contractually allowed for Sonrat’s model.

### Risks

| Risk | Mitigation |
|------|------------|
| Gemini Live concurrency/TPM caps | Capacity Manager + AI Gateway limits; quota requests early; queue outbound |
| Exotel ToS / capacity for SaaS | Legal/commercial review; telephony_accounts + pools |
| Combined voice-runtime hard to split | Split packages first, processes second (Phases 4–5) |
| Kafka migration cost from BullMQ | Keep event contracts; dual-publish then cut over |
| Flow builder complexity | Ship engine + simple UI first; expand nodes |
| Indian language / Hinglish quality | Measure; later Sarvam behind AIProvider |
| Premature microservice sprawl | Few deployables; shared packages; no network hops for fashion |
| Claiming production-ready too early | Phase exit tests + load evidence required |

### Unknowns (to resolve in later phases, documented when found)

- Exact current Gemini Live SDK contract for interrupt + tool calling (verify before Phase 5)
- Exotel AgentStream audio format details per account (verify Phase 4)
- Vector store choice (Phase 8)
- Whether PG RLS ships in Phase 1 or Phase 13

---

## Awaiting instruction

**Phase 0 complete.**

Do not implement further until:

```text
START PHASE 1
```
