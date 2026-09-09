# Security

## Authentication

- Password hashes via bcrypt
- Opaque session tokens stored hashed server-side
- HTTP-only secure cookies in production
- Session TTL configurable
- Rate limits on login/register

## Authorization

- RBAC enforced on the API (UI hiding is not security)
- Permissions listed in `@sonrat/shared` RBAC module

## Tenant isolation

- `organizationId` from session context
- All queries scoped by organization
- Cross-tenant access is an authorization failure

## Webhooks

- Validate provider authenticity where supported
- Idempotent event keys
- Fast ack + async processing

## Uploads

- Size limits
- Extension + MIME checks
- Row limits for imports
- CSV injection awareness in parsers
- Object storage / local disk, not Postgres BLOBs

## Secrets

- Never committed
- Never sent to the browser
- Never logged
- Validated at startup via `@sonrat/config`

## Audio / transcripts

- Raw audio not logged by default
- Transcripts stored in controlled tables
- Recordings via signed URLs only

## Prompt injection

- Customer speech treated as untrusted
- Platform policy layer is immutable
- Tools require schema + tenant + permission checks
