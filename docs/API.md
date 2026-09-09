# API

Base path: `/api/v1`

Auth: HTTP-only session cookie (`AUTH_COOKIE_NAME`).

Idempotency: send `Idempotency-Key` on side-effecting POSTs.

## Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create user + organization |
| POST | `/auth/login` | Login |
| POST | `/auth/logout` | Logout |
| GET | `/auth/me` | Current user + orgs |
| POST | `/auth/switch-organization` | Switch active org |

## Agents

| Method | Path | Description |
|--------|------|-------------|
| GET | `/agents` | List |
| POST | `/agents` | Create draft |
| GET | `/agents/:id` | Get |
| PATCH | `/agents/:id` | Update metadata |
| PATCH | `/agents/:id/sections/:section` | Update config section |
| POST | `/agents/:id/validate` | Validation report |
| POST | `/agents/:id/publish` | Publish immutable version |
| GET | `/agents/:id/versions` | Version history |
| POST | `/agents/:id/test` | Test agent (text/runtime) |

## Campaigns

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/campaigns` | List / create |
| GET/PATCH | `/campaigns/:id` | Get / update |
| POST | `/campaigns/:id/start` | Start |
| POST | `/campaigns/:id/pause` | Pause |
| POST | `/campaigns/:id/cancel` | Cancel |
| GET | `/campaigns/:id/contacts` | Campaign contacts |
| GET | `/campaigns/:id/calls` | Campaign calls |

## Contacts

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/contacts` | List / create |
| PATCH/DELETE | `/contacts/:id` | Update / archive |
| POST | `/contacts/import` | Upload CSV/XLSX |
| GET | `/contacts/import/:id` | Import status |
| POST | `/contacts/import/:id/preview` | Set mapping + preview |
| POST | `/contacts/import/:id/commit` | Commit valid rows |

## Calls & analytics

| Method | Path | Description |
|--------|------|-------------|
| GET | `/calls` | List |
| GET | `/calls/:id` | Detail + events |
| GET | `/calls/:id/transcript` | Transcript |
| GET | `/analytics/overview` | Org overview |
| GET | `/analytics/campaigns/:id` | Campaign metrics |
| GET | `/analytics/agents/:id` | Agent metrics |

## Webhooks

| Method | Path |
|--------|------|
| POST | `/webhooks/exotel/call-status` |
| POST | `/webhooks/exotel/incoming-call` |
| POST | `/webhooks/exotel/events` |

## Health

| Method | Path |
|--------|------|
| GET | `/health` |
| GET | `/ready` |

Pagination response shape:

```json
{ "items": [], "nextCursor": null, "hasMore": false }
```
