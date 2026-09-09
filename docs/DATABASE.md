# Database

PostgreSQL via Prisma.

## Core tables

Identity: `organizations`, `users`, `sessions`, `organization_members`

Agents: `agents`, `agent_versions`

Contacts: `contacts`, `contact_imports`, `contact_import_rows`

Campaigns: `campaigns`, `campaign_contacts`, `phone_numbers`

Calls: `calls`, `call_events`, `call_sessions`, `conversations`, `conversation_messages`, `call_transcripts`, `call_recordings`, `call_outcome_records`

CRM: `leads`, `appointments`, `tool_executions`

Platform: `usage_records`, `audit_logs`, `webhook_events`, `idempotency_keys`, `outbox_events`, `notifications`, `dead_letter_jobs`

## Rules

- UUID primary keys
- `organizationId` on tenant data
- soft delete where appropriate (`deletedAt`)
- timestamps in UTC (`createdAt` / `updatedAt`)
- money as integer minor units in JSON config / decimal usage quantities
- phones stored as `rawPhone` + `normalizedPhone` (E.164) + `countryCode`

## Important indexes

- `(organizationId, status)` on agents, campaigns, calls
- `(organizationId, normalizedPhone)` unique on contacts
- `(organizationId, createdAt)` for list queries
- `(provider, eventKey)` unique on webhook events
- `(organizationId, key)` unique on idempotency keys

## Commands

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:migrate:deploy
pnpm db:seed
pnpm db:studio
```

Schema: `packages/database/prisma/schema.prisma`
