# Architecture — LearnCrew Campus

## Layers (v2 rule: UI never imports db)
```
src/app/**            routes, pages, route handlers (thin: auth → validate → call service → DTO)
src/server/actions    server actions (Zod-validated, requireRole, rate-limited, audited)
src/server/services   business logic (drill, grading, mocks, tpo, admin, content)
src/lib/**            pure logic: adaptive (Elo/bands/composition), streak, xp, time (IST), rng, question-schema, pipeline
src/db/**             Drizzle schema, client, scoped helpers, seed
```
- A unit test (`tests/architecture.test.ts`) fails if any file under `src/app` imports `@/db` or `drizzle-orm`.
- Tenancy: every staff (tpo/admin) query goes through `scoped(user)` (`src/lib/authz.ts`) which adds `college_id = user.collegeId`; superadmin is unscoped. Students only ever read rows keyed by their own `user_id`.
- Answer secrecy: DTOs for drills/mocks never include `answer_index`/`explanation` before the attempt is graded server-side.

## Runtime
- Next.js 15 App Router, standalone output, Node runtime middleware (role routing + security headers + CSP nonce).
- Postgres 16 + pgvector, Drizzle migrations forward-only (`scripts/migrate.mjs`, runs as Railway pre-deploy).
- Auth.js v5: Resend email magic link (console fallback in dev), Drizzle adapter, database sessions (30-day max, 7-day idle).
- Rate limits: Postgres fixed-window counters (`rate_limits` table) — no Redis until >1,000 actives.
- Audit: `audit_logs` append-only, written by every TPO/admin mutation.
- Cron: Railway cron service calls `/api/cron/build-drills` (05:00 IST) and `/api/cron/weekly` (Mon) with `CRON_SECRET`.
- LLM: offline pipeline only (generate → QA → dedupe → review) + optional cached "Explain more". Drill/mock grading and adaptivity are plain code.

## Data flow: daily drill
1. Cron (or first visit) → `getOrCreateDrill(user, istDate)` → adaptive composition 6/2/2 from the college's 60% subset, not seen in 14 days; per-student option shuffle stored in `drills.option_order`.
2. Client renders DTO (no answers), caches it, queues answers in IndexedDB.
3. `/api/sync` (idempotent by `client_id`) grades in code, updates Elo/band/review queue/XP; 10th answer completes drill + streak.
