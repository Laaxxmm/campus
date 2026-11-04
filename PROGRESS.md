# PROGRESS — LearnCrew Campus
Current phase: 4 — Student drill + streak + PWA | Last green: 2026-11-04T22:00+05:30 | Tests: unit 122/122, e2e 11/11
Governing spec: ORCHESTRATOR.md (v2, adopted 2026-11-04 mid-build). v1 archived at docs/ORCHESTRATOR-v1.md; v1 phases 0–3 work carried over (same schema + stack).

## Phase checklist (✅ only when phase QA gate green)
- [x] 0 — Design system + architecture docs ✅ (docs/DESIGN.md, ARCHITECTURE.md, SECURITY.md; tokens compile)
- [x] 1 — Scaffold ✅ (v2 tokens navy/amber + Inter + lucide, env.ts boot validation, CSP nonce + headers, CI workflow, /dev/ui, architecture test)
- [x] 2 — Auth + roles + tenancy ✅ (RBAC matrix 70 cases, Postgres rate limiter + login/submit wiring, audit logger, cookie flags, cross-college DB test; per-route IDOR e2e added as routes land)
- [ ] 3 — Question bank + pipeline — done: schema, 260 golden verified Q, generate/qa/dedupe/quant-check (--dry-run), idempotent seed. Gap: 600-Q seed count (Blocked: needs ANTHROPIC_API_KEY — see Blocked), verifier fixture test
- [ ] 4 — Student drill + streak + PWA — done: drill engine, grading, sync, offline queue, SW, e2e drill + offline. Gaps: axe check, offline-shell e2e, profile tab
- [ ] 5 — Adaptive engine + real mocks
- [ ] 6 — TPO dashboard
- [ ] 7 — Admin
- [ ] 8 — Railway deploy
- [ ] 9 — Pilot hardening
- [ ] 10 — Final QA matrix

## Current phase tasks (phase 3 v2 gap + phase 4 gate)
- [ ] QA verifier fixture test (blind-solve mismatch → review)
- [ ] Profile tab (leaderboard link, privacy, sign out)
- [ ] axe a11y check on student screens
- [ ] offline-shell e2e (SW installed → /offline + cached drill page load offline)

## Feature test registry
| Feature | Test file | Status |
|---|---|---|
| Health | e2e (smoke, later) | — |
| Magic-link login, invite-only, anon redirect | e2e/auth.spec.ts | ✅ |
| Role routing student→/tpo 403, TPO lands /tpo | e2e/auth.spec.ts, e2e/tpo.spec.ts | ✅ |
| requireRole / scoped / cross-college isolation | src/lib/authz.test.ts | ✅ |
| Question schema + bank validator | npm run bank:validate | ✅ (260) |
| Pipeline helpers (dedupe, ids, evaluator) | src/lib/pipeline.test.ts | ✅ |
| Streak (IST boundary, freeze, double submit), XP | src/lib/streak.test.ts | ✅ |
| Drill build/grade/idempotency/no-repeat | src/lib/drill.test.ts | ✅ |
| Drill e2e 360px: 10 Q → done, streak 1 | e2e/drill.spec.ts | ✅ |
| Offline 3 answers → sync exactly once | e2e/drill.spec.ts | ✅ |
| CSP nonce + security headers | tests/security.test.ts, e2e/security.spec.ts | ✅ |
| Cookie flags (httpOnly, SameSite=Lax) | e2e/security.spec.ts | ✅ |
| CSRF origin check on JSON APIs | tests/security.test.ts, e2e/security.spec.ts | ✅ |
| Env validation fails boot | tests/security.test.ts | ✅ |
| UI never imports db; no raw SQL/innerHTML | tests/architecture.test.ts | ✅ |
| RBAC matrix (14 routes × 5 roles) | src/lib/rbac.test.ts | ✅ |
| Rate limits (login, submit, atomic) | tests/rate-audit.test.ts, e2e/auth.spec.ts | ✅ |
| Audit log append + scope | tests/rate-audit.test.ts | ✅ |

## Decisions (ADR-lite)
- D1 2026-11-04: `learncrew-campus-product-pack.md` was NOT provided to the build session. Taxonomy, the "12 samples", and pack prompts (system/variant/qa/seed) are authored by the orchestrator from the summaries in ORCHESTRATOR.md. Replace with pack versions when available.
- D2 2026-11-04: Next.js pinned to 15.x (npm `latest` is 16.x) to honour the locked stack.
- D3 2026-11-04: Build env has no Docker-hosted Postgres by default; local dev/test uses native Postgres 16 + pgvector on :5432 (same as docker-compose port), so commands in README are unchanged.
- D5 2026-11-04: Added `users.target_company` (student pick at onboarding) and `questions.qa_flags` (jsonb, QA output for review UI) — both needed by routes in the spec, absent from schema.
- D6 2026-11-04: shadcn CLI cannot reach ui.shadcn.com from the build sandbox; shadcn-style primitives (cva + tailwind-merge, `components.json` kept) hand-written in `src/components/ui`.
- D7 2026-11-04: No `next/font` download — Inter via system font stack fallback; saves bytes on low-end phones and keeps builds offline-safe.
- D8 2026-11-04: Middleware runs on the Node.js runtime (stable in Next 15.5) so it can read DB sessions; e2e/dev read magic links from `/api/dev/magic-link` (404 in prod unless ALLOW_DEV_LOGIN_LINKS=true).
- D4 2026-11-04: Model IDs in `.env.example` set to current Claude family IDs (verified in Phase 3), not the 4.5 IDs written in the prompt — prompt itself says "verify current IDs".
- D9 2026-11-04: Drill answers go through one path — client queues in IndexedDB and POSTs `/api/sync` (idempotent). No separate server action; offline answers are graded on reconnect (correct answer never reaches the client before grading).
- D10 2026-11-04: Spec changed mid-build to v2. Adopted v2 as governing; kept v1 work where compatible (identical schema/stack). Where v2 and v1 conflict, v2 wins unless listed here.
- D11 2026-11-04: Package manager stays npm (v2 text says pnpm). Same script names; switching mid-build adds lockfile churn for no product value.
- D12 2026-11-04: v2 "admin (super)" maps to our `superadmin` (+ `content` for review). College `admin` role kept (roster/batches) since schema has it.
- D13 2026-11-04: Student routes stay at root (`/today` not `/app/today`); QA matrix rows reference these paths.
- D14 2026-11-04: v2 "db.select only in scoped.ts" enforced as: `src/app/**` may not import `@/db`/drizzle (test), and every staff query uses `scoped()`. A stricter lint rule would forbid student-own queries that are already keyed by session user id.
- D18 2026-11-04: Login rate limit is per (IP, email) only — no IP-only cap, because campus NAT shares one IP across a college. Sessions: 7-day idle expiry rolled daily (Auth.js DB sessions have no creation timestamp, so the 30-day absolute cap is not enforced; revisit with a sessions.created_at column).
- D17 2026-11-04: Migration 0001 adds audit_logs, rate_limits, batch_mocks and v2 mock-exam columns (negative marks, sectional, autosaved answers, one-active-attempt partial unique index).
- D16 2026-11-04: CSRF for custom JSON routes = same-origin `Origin` check + `application/json` content-type (forces preflight) + SameSite=Lax cookies; no double-submit token (server actions already have Next origin check).
- D15 2026-11-04: Bank seeded at 260 hand-authored, machine-verified golden questions (v1 gate ≥120 met; v2 asks 600). The designed route to 600–2,000 is the Haiku-batch → Sonnet-QA pipeline, which needs ANTHROPIC_API_KEY (~$30 per the pack). Not hand-authoring 340 more in-session.

## Blocked / needs human
- [ ] ANTHROPIC_API_KEY — to run `scripts/generate.ts` + `scripts/qa.ts` and reach the 600-Q gate (pipeline ready, dry-run verified).
- [ ] AUTH_RESEND_KEY + verified sending domain (real email). Until then magic links print to server console (and `/api/dev/magic-link` when ALLOW_DEV_LOGIN_LINKS=true / non-prod).
- [ ] Railway login (Phase 8).

## Log
- 2026-11-04T22:00+05:30 phase 2 (v2) done: migration 0001 (audit_logs, rate_limits, batch_mocks, mock exam cols), rate limiter wired to login + sync, audit lib, 7-day idle sessions, RBAC matrix; 122 unit + 11 e2e green.
- 2026-11-04T21:40+05:30 phase 1 (v2) done: retheme to navy/amber + Inter + lucide (no emoji/confetti), env.ts, CSP nonce middleware (all e2e pass under CSP), CI workflow, /dev/ui, postcss override → npm audit 0 vulns.
- 2026-11-04T21:10+05:30 phase 3 (v1) done: 260 golden Q across 42 topics (5 parallel authoring agents, every answer re-solved in code), pack samples added, seed idempotent (2 runs identical), 500-student seed OK. v2 spec + product pack received; adopted v2.
- 2026-11-04T20:25+05:30 phase 2 done: Auth.js v5 (Resend provider w/ console fallback, Drizzle adapter, DB sessions, invite-only signIn), Node-runtime middleware role routing (403 rewrite), authz requireUser/requireRole/scoped; 12 vitest (incl. cross-college DB isolation) + 5 Playwright green.
- 2026-11-04T20:10+05:30 phase 1 done: Next 15.5 + Tailwind 4, drizzle migration 0000 (vector ext), /api/health ok, typecheck/lint/build/1 vitest green. Shared first-load JS = 103 kB (budget for /today: 150 kB).
- 2026-11-04T14:45+05:30 phase 0 done: ORCHESTRATOR.md, PROGRESS.md, docs/{PRODUCT,schema,design,adaptive,decisions}.md written.
