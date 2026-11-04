# LearnCrew Campus

B2B placement-aptitude practice for Indian colleges. Students do a 10-question daily drill (streaks, XP, offline PWA) and company-pattern mock tests; TPOs see readiness per company, topic heatmaps, at-risk lists and weekly reports.

**Stack:** Next.js 15 (App Router, TypeScript strict) · Tailwind 4 · Auth.js v5 (email magic link) · Drizzle + Postgres 16/pgvector · Zod · Vitest · Playwright · Docker → Railway.

## Run locally in 5 commands
```bash
docker compose up -d                 # Postgres 16 + pgvector on :5432 (also creates learncrew_test)
npm ci
cp .env.example .env.local && cp .env.example .env   # then set AUTH_SECRET (openssl rand -base64 32)
npm run db:migrate && npm run db:seed
npm run dev                          # http://localhost:3000
```
No email provider needed: with `AUTH_RESEND_KEY` empty, the login link is printed in the `npm run dev` console.

### Demo logins (seeded)
| Role | Email |
|---|---|
| Student (consented, 3 weeks of history) | `student001@demo.learncrew.in` … `student040@…` |
| Student (first login → consent screen) | `newstudent@demo.learncrew.in` |
| TPO — Demo Engineering College, Chennai | `tpo@demo.learncrew.in` |
| College admin | `admin@demo.learncrew.in` |
| Content reviewer | `content@learncrew.in` |
| Superadmin | value of `SUPERADMIN_EMAIL` (default `founder@learncrew.in`) |
| TPO of a second college (isolation demo) | `tpo@sample.learncrew.in` |

## Scripts
| Command | What |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` / `typecheck` | ESLint / tsc |
| `npm test` | Vitest (unit + DB integration against `learncrew_test`) |
| `npm run e2e` | Playwright (builds, seeds `learncrew_e2e`, runs 360 px mobile + desktop) |
| `npm run db:generate` / `db:migrate` / `db:seed` / `db:studio` | Drizzle |
| `npm run bank:validate` | Validate `content/bank/*.json` (schema, coverage, duplicates) |
| `npx tsx scripts/generate.ts --dry-run` | Haiku batch variant generation (real run needs `ANTHROPIC_API_KEY`) |
| `npx tsx scripts/qa.ts content/drafts/x.json` | Blind Sonnet QA → review flags |
| `npx tsx scripts/quant-check.ts` · `scripts/dedupe.ts` · `scripts/import-drafts.ts` | Code re-solve, near-duplicate drop, load drafts for `/content/review` |
| `node scripts/cron.mjs build-drills` / `weekly` | Cron jobs (call the web service with `CRON_SECRET`) |

## Environment
See `.env.example`. Required in production: `DATABASE_URL`, `AUTH_SECRET` (≥32 chars), `CRON_SECRET` (≥16). The server refuses to start without them (`src/env.ts`). Optional: `AUTH_RESEND_KEY`, `EMAIL_FROM`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL_FAST/SMART`, `APP_BASE_URL`, `SUPERADMIN_EMAIL`.
The app fully works without an Anthropic key: drills, grading, adaptivity and mocks never call an LLM.

## Docs
`docs/ARCHITECTURE.md` · `docs/SECURITY.md` · `docs/DESIGN.md` · `docs/schema.md` · `docs/adaptive.md` · `docs/DEPLOY.md` · `docs/DEMO.md` · `docs/QA_MATRIX.md` · `PROGRESS.md`.
