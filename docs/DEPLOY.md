# Deploy — LearnCrew Campus on Railway (Singapore)

Services: **web** (this repo, Dockerfile) · **postgres** (pgvector) · **cron** (same image, scheduled). Budget ≈ $10–12/month for a 500-student pilot.

## 0. One-time on your laptop
```bash
npm i -g @railway/cli
railway login
```

## 1. Project + database
```bash
railway init --name learncrew-campus        # choose your workspace
```
In the Railway dashboard: **+ New → Database → PostgreSQL** won't include pgvector; instead use **+ New → Template → "pgvector"** (Postgres 16 + pgvector). Settings → Region: **Southeast Asia (Singapore)**. Enable backups on the volume.

## 2. Web service
Dashboard: **+ New → GitHub Repo → learncrew-campus** (branch `main`). Railway reads `railway.json`: Dockerfile build, `node scripts/migrate.mjs` pre-deploy, healthcheck `/api/health`.

Variables (service → Variables → Raw editor):
```
DATABASE_URL=${{pgvector.DATABASE_URL}}
AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
AUTH_TRUST_HOST=true
AUTH_RESEND_KEY=<re_... from resend.com>        # empty = magic links only in logs
EMAIL_FROM=LearnCrew <no-reply@yourdomain.in>
APP_BASE_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
CRON_SECRET=<openssl rand -hex 24>
SUPERADMIN_EMAIL=<your email>
ANTHROPIC_API_KEY=                               # optional at runtime (Explain-more, weekly narrative)
ANTHROPIC_MODEL_FAST=claude-haiku-5-5
ANTHROPIC_MODEL_SMART=claude-sonnet-5-5
```
(Replace `pgvector` with your database service name.) Settings → Networking → **Generate Domain** (or add `app.yourdomain.in` as a custom domain and create the CNAME it shows). Settings → Region: Singapore.

Deploy: push to `main` (or `railway up`). The deploy goes live only after migrations succeed and `/api/health` returns `{"ok":true,"db":true}`.

## 3. Seed the pilot college
From your laptop in the repo (uses the Railway DB):
```bash
railway link            # pick learncrew-campus / web
railway run npm run db:seed
```
This creates the demo college, 40 students with 3 weeks of practice, TPO/admin/content accounts and your superadmin (SUPERADMIN_EMAIL). For a real pilot, create the college from `/super` instead and import its roster CSV.

## 4. Cron service
Dashboard: **+ New → GitHub Repo → same repo**, name it `cron-drills`:
- Settings → Deploy → **Custom Start Command**: `node scripts/cron.mjs build-drills`
- Settings → **Cron Schedule**: `30 23 * * *` (UTC = 05:00 IST)
- Variables: `APP_BASE_URL=https://<web domain>` and `CRON_SECRET=${{web.CRON_SECRET}}`
- Remove the healthcheck for this service (it exits after the job).

Duplicate it as `cron-weekly` with start command `node scripts/cron.mjs weekly` and schedule `0 1 * * 1` (Monday 06:30 IST): readiness snapshots, leaked-question retirement, TPO weekly report.

## 5. Guard rails
- Project → Settings → Usage → **alert at $15/month**.
- Create a `staging` environment (Project → Environments → New) with its own Postgres; deploy PR branches there.
- Resend: verify your sending domain (SPF/DKIM) before inviting a real college.

## 6. Verify
```bash
curl https://<domain>/api/health                 # {"ok":true,"db":true}
BASE_URL=https://<domain> npx playwright test e2e/smoke.spec.ts
```
The smoke test needs `ALLOW_DEV_LOGIN_LINKS=true` on a **staging** deployment to log in without a mailbox; never set it in production.

## Run on another machine (no Railway)
```bash
cp .env.example .env.prod   # fill AUTH_SECRET, CRON_SECRET, POSTGRES_PASSWORD, AUTH_URL/APP_BASE_URL
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```
Phones need HTTPS for install/offline: `cloudflared tunnel --url http://localhost:3000`.
Behind a TLS-intercepting proxy, build with `docker build --secret id=ca,src=/path/to/ca.pem -t learncrew .`.

## Migrating existing data (e.g. from Supabase)
```bash
pg_dump --no-owner --data-only "$OLD_DATABASE_URL" | psql "$DATABASE_URL"
```
