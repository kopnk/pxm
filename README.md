# PXM

Nuxt 4 fullstack app for project, progress, financial, document, user, RLS, and audit management.

## Setup

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run dev
```

Fill `.env` with production secrets. Never commit `.env`.

## Production Deploy

```bash
git pull origin main
npm install
npm run db:migrate
npm run build
pm2 delete pxm || true
pm2 start ecosystem.config.cjs
pm2 save
```

Health checks:

```bash
curl -fsS http://127.0.0.1:3000/api/health
curl -fsS http://127.0.0.1:3000/api/ready
```

## Migration Safety

- `npm run db:migrate` is the normal migration command.
- `npm run db:baseline:local` and `npm run db:repair:local` are local recovery helpers only. Do not run them on production without checking `drizzle.__drizzle_migrations` against `server/db/migrations/meta/_journal.json`.
- Before deploying to an existing database, verify applied migrations:

```sql
SELECT hash, created_at
FROM drizzle.__drizzle_migrations
ORDER BY created_at;
```

## Backup And Restore

Minimum pre-deploy backup:

```bash
pg_dump "$DATABASE_URL" > "backup-$(date +%Y%m%d-%H%M%S).sql"
```

Restore drill on staging:

```bash
psql "$DATABASE_URL" < backup-file.sql
npm run db:migrate
npm run build
```

Also back up Supabase Storage buckets that hold uploaded project documents before schema or storage-policy changes.

## Operational Notes

- Use HTTPS in production and set `SESSION_COOKIE_SECURE=true`.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
- Use `/api/ready` for readiness because it checks database connectivity.
- Use `scripts/set-superadmin.mjs` only for supervised admin recovery.
