# Troubleshooting

## API won't start

- Check `DATABASE_URL` and Postgres connectivity
- Ensure `AUTH_SECRET` length >= 32
- Run `pnpm db:generate`

## Login fails after seed

- Confirm seed ran: `pnpm db:seed`
- Email: `demo@sonrat.ai`
- Password: `Password123!`

## Campaigns don't dial

- Ensure worker is running
- Check Redis
- In mock mode, calls should still appear and transition
- In Exotel mode, verify credentials and webhook public URL

## Voice runtime disconnects

- Confirm `VOICE_RUNTIME_URL` reachable from Exotel
- Check audio format conversion logs
- Verify Gemini key when not in mock AI mode

## Import stuck

- Worker must process `process_contact_import` / validate / commit jobs
- Check dead-letter table/queue for parser errors
- Download error report from import status API

## Cross-tenant / 403 errors

- Switch organization via `/auth/switch-organization`
- Confirm membership role permissions

## Typecheck failures after pull

```bash
pnpm install
pnpm db:generate
pnpm build
```
