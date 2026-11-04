# PROGRESS — LearnCrew Campus
Current phase: v3 complete locally — waiting on human for Railway deploy (10) + API key (3: 600-Q bank, 300-tech target) | Last green: 2026-11-05T05:40+05:30 | Tests: unit 264/264, e2e 41/41
Governing spec: ORCHESTRATOR.md (v3 "Placement Readiness Coach", adopted 2026-11-05). v2 → docs/ORCHESTRATOR-v2.md, v1 → docs/ORCHESTRATOR-v1.md.

## Phase checklist (✅ only when phase QA gate green)
- [x] 0 — Design system + architecture docs ✅ (DESIGN, ARCHITECTURE, SECURITY incl. prompt injection/PII, PRODUCT with 6 pillars + readiness formula; coach tables in schema, migration 0003)
- [x] 1 — Scaffold ✅
- [x] 2 — Auth + roles + tenancy ✅ (+ v3 consent records table)
- [ ] 3 — Content — BLOCKED on counts only: aptitude 260/600, tech MCQ 171/300, concept cards 60/100 (generation pipeline needs ANTHROPIC_API_KEY, D15/D25). Green: schema + verifier fixtures, 6 company profiles each with dated sources (validator), 40 HR cards
- [x] 4 — Drill + attempt events + streak + PWA ✅ (answer changes + marked stored per answer; e2e asserts events)
- [x] 5 — Real mocks + Insight engine v1 ✅ (rule fixtures, not-enough-data path, LLM-down + bad-output fallback, focus drills)
- [x] 6 — Company crack-path + missing-skills checklist ✅ (readiness v3 unit tests, e2e pick → gap → tech drill → checklist)
- [x] 7 — Resume + LinkedIn coach ✅ (injection fixture, Zod output, quota, temp-file deletion, TPO no-draft-leak)
- [x] 8 — TPO dashboard (coach view) ✅ (interview-ready funnel, weak topics → assign pack → student Today, drill-down with insights/checklists, cross-college blocked)
- [x] 9 — Admin ✅ (colleges, CSV import, question + company-profile review, LLM usage/quota view, audit log)
- [ ] 10 — Railway deploy — config ✅ + local Docker verified; BLOCKED on Railway login
- [x] 11 — Pilot hardening ✅ (Lighthouse 99–100/100, load 500 drills + 200 mocks, LLM cost ₹1.67/student/month, error pages; reports in docs/reports/)
- [ ] 12 — Final QA matrix — all rows green locally (docs/QA_MATRIX.md); deployed smoke pending phase 10

## Current phase tasks
- [ ] (human) Railway login + deploy per docs/DEPLOY.md → `BASE_URL=https://<staging> npx playwright test e2e/smoke.spec.ts --project=desktop`
- [ ] (human) verify company-profile sources (research agent could only read search-result summaries; prepinsta/tcsion blocked) → publish/keep in /content/companies
- [ ] (human, optional) ANTHROPIC_API_KEY → generate/QA/import drafts to reach 600 aptitude + 300 tech + 100 cards
- [ ] (human) AUTH_RESEND_KEY + verified sending domain

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
| Blind-QA verifier (fixtures) | src/lib/pipeline.test.ts | ✅ |
| Bank count/coverage/answer balance | tests/bank-count.test.ts | ✅ (260; 600 blocked) |
| Leaderboard/today/progress services | tests/student-services.test.ts | ✅ |
| axe (login, today, drill, progress, profile, leaderboard, mocks) | e2e/a11y.spec.ts | ✅ |
| PWA manifest + SW offline shell + cached drill | e2e/a11y.spec.ts | ✅ |
| Adaptive engine (Elo, bands, daily clamp, 6/2/2, review, determinism) | src/lib/adaptive.test.ts | ✅ |
| Mock scoring (negative marks, percentile, sectional deadlines) | src/lib/mock-scoring.test.ts | ✅ |
| Mock service (one active, leak-free DTO, IDOR, late save 409, auto-finalize, sectional lock) | tests/mocks.test.ts | ✅ |
| Mock e2e: full flow + refresh resume + review filters + leak | e2e/mock.spec.ts | ✅ |
| Mock auto-submit at 0 (fake clock) | e2e/mock.spec.ts | ✅ |
| Mock attempt IDOR by URL → 404 | e2e/mock.spec.ts | ✅ |
| Cron: 401 w/o secret, build drills idempotent, weekly snapshots, retire leaked | tests/cron.test.ts | ✅ |
| TPO services: scoping, no scope widening, KPIs, heatmap, nudge, CSV, mock create/schedule audited, report no-PII + cache | tests/tpo.test.ts | ✅ |
| CSV escaping (formula injection, BOM, CRLF) | src/lib/csv.test.ts | ✅ |
| TPO e2e: KPIs/heatmap/filter, table filter + drill-down, CSV headers, cross-college 404 + export, at-risk, report, schedule → student sees it | e2e/tpo.spec.ts | ✅ |
| Roster import: 200 rows, re-import 0 dupes, malformed rows, seat limit, cross-college email, create batches, audit | tests/roster.test.ts | ✅ |
| Content review (filters, approve → access → next drill, edit/version, retire, role), batches scoped, superadmin re-auth/create/export/delete + audit | tests/admin.test.ts | ✅ |
| Admin e2e: import UI (seat block, row errors, idempotent), settings/batches, review approve, superadmin create college + audit, TPO blocked from /super & /content | e2e/admin.spec.ts | ✅ |
| Explain-more: off without key, requires prior wrong attempt, cache hit = 0 model calls | tests/explain.test.ts | ✅ |
| Load: /api/sync p95 < 500 ms @ 500 students; 200 concurrent mocks | docs/reports/load-test.md | ✅ |
| Lighthouse mobile ≥ 90 perf / ≥ 95 a11y | docs/reports/lighthouse.md | ✅ |
| Smoke (health, landing, drill e2e, TPO + CSV + 404) — local or BASE_URL | e2e/smoke.spec.ts | ✅ local; deployed: pending Railway |
| QA matrix: anon redirects (21 routes), 401/403 CSRF on 4 JSON routes + cron, drill IDOR, axe on TPO/admin/content/super/mock screens | e2e/qa-matrix.spec.ts | ✅ |
| Health route | tests/health.test.ts | ✅ |
| Explanation sheet shows the correct option on a wrong answer | e2e/drill.spec.ts | ✅ |
| Tech concept bank + concept cards + company profiles + HR cards (schema, sources) | npm run content:validate, tests/bank-count.test.ts | ✅ |
| Answer events (answer_changes, marked) | e2e/coach.spec.ts, tests/mocks.test.ts | ✅ |
| Insight rules: gap, time leak, guessing, second-guessing, quadrant, trend, focus, not-enough-data | src/lib/insights/rules.test.ts | ✅ |
| Insight service: cache, weekly focus, LLM-down + number/topic-changing output rejected, focus drill | tests/insights.test.ts | ✅ |
| Readiness v3 formula + interview-ready gates | src/lib/readiness-v3.test.ts | ✅ |
| Crack-path e2e: targets → breakdown → round gaps → tech drill → skills checklist; concept cards | e2e/coach.spec.ts | ✅ |
| Resume/LinkedIn checklists, keyword gap, templates, injection + PII guards | src/lib/coach/checklists.test.ts | ✅ |
| Profile coach: PDF parse + temp deletion, consent, storage revoke, injection never reaches model, Zod output, quota, TPO draft privacy | tests/profile-coach.test.ts, e2e/profile-coach.spec.ts | ✅ |
| TPO coach: weak topics scoping, funnel, assign pack (foreign ids dropped, audited) → completion | tests/tpo-coach.test.ts, e2e/tpo.spec.ts | ✅ |
| v3 routes: anon redirects, role 403s, axe on coach + TPO coach + admin screens | e2e/qa-matrix.spec.ts | ✅ |
| LLM cost report | docs/reports/llm-cost.md | ✅ |

## Decisions (ADR-lite)
- D25 2026-11-05: v3 adopted mid-build (after v2 phases 0–10 were done). Kept schema/routes; added coach tables (migration 0003). Content counts: tech bank seeded at 171 MCQ + 60 cards (v3 asks 300 + 100) for the same reason as D15 — the Sonnet-batch → Haiku-verify pipeline is the designed route and needs the API key.
- D26 2026-11-05: Student bottom nav = 5 tabs: Today · Mocks · Insights · Companies · Me (v2 capped at 4, v3 lists 6). "Practice" lives in Today (daily + assigned packs) and crack-path tech drills; Progress/Leaderboard/Profile coach sit under Me.
- D27 2026-11-05: Daily drills stay aptitude-only; the `tech` section is practised via crack-path/focus drills so a Mech student never gets DBMS in the daily 10. Readiness shown on Today, crack-path and TPO funnel is the v3 formula; weekly snapshots store the v3 score + breakdown when the company is profiled (v2 blueprint readiness remains for un-profiled companies).
- D28 2026-11-05: Company cutoffs are rarely published. Profiles carry `cutoffs.approx: true`, a null `aptitude_percent` when no source gives a figure, and the UI then says "assumed bar of 65". Sources were gathered via web search summaries; pages could not be opened from the sandbox for two sites → human verification task, review/publish toggle at /content/companies.
- D29 2026-11-05: Insight LLM phrasing is accepted only if it keeps the same number of bullets, the same focus topics and the exact same set of numbers; otherwise the deterministic template is used. Insights claim nothing about a topic with < 5 attempts.
- D30 2026-11-05: Resume upload is parsed from a 0600 temp file in a private mkdtemp dir that is removed in `finally`; extracted text is stored only with `resume_storage` consent, and revoking it wipes stored text. Drafts: `ai_drafts` consent, 3/month + 3/hour, PII and instruction-like lines stripped, output Zod-stripped to known keys. No LinkedIn API, no scraping — students paste fields.
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
- D19 2026-11-04: Spec said "Phase 4 random-by-band, Phase 5 adaptive"; drills used the adaptive composer from the start (same code path, tested in phase 5). Mocks record `attempts` rows for analytics but do not move Elo (drills train, mocks measure). Client `auto` flag on submit only labels the attempt; scoring always uses answers the server accepted before `ends_at` (+5 s grace).
- D20 2026-11-05: TPO heatmap defaults to 30-day accuracy per topic (toggle: Elo mastery). With K=24 Elo moves ~±50 in 3 weeks, so mastery clusters near 50 and hides weak topics; accuracy shows them now. Readiness still uses mastery. Seed adds deterministic batch×topic strengths so the demo heatmap is meaningful. Readiness ring uses coral (not red) below 40 per v2 voice.
- D21 2026-11-05: v2 "admin re-auth within 15 min" implemented for superadmin mutations (create college, export/delete student) via an Auth.js `signIn` event → `events.sign_in`; stale sessions get a "Confirm it's me" magic link. College-admin/TPO routine actions (import, batches) rely on session + rate limit + audit instead (re-auth there would add a magic-link round trip to every import).
- D22 2026-11-05: Runtime image uses Node 22 LTS (v1 Dockerfile said Node 20; vitest 5 / toolchain need ≥22.12 and npm 10.8 on Node 20 crashed in `npm ci`). Optional BuildKit `--secret id=ca` for TLS-intercepting proxies (no-op on Railway). `preDeployCommand` runs `node scripts/migrate.mjs` (no tsx/drizzle-kit in the runtime image).
- D23 2026-11-05: Structured logs are a 20-line JSON logger (`src/lib/log.ts`) rather than pino — pino's worker-thread transport needs extra bundling config in Next standalone; JSON lines are what Railway ingests either way.
- D24 2026-11-05: Phase 10 a11y fixes: green text uses new `success-700` (#15803D; #16A34A text was 3.3:1), heatmap cells always dark text, landing eyebrow ink-700, streak number ink-900 with amber flame. gitleaks: test-fixture allowlist + one allowlisted historical commit (a throwaway local-DB session cookie embedded in a Lighthouse HTML report; scrubbed next commit, sessions deleted) instead of rewriting pushed history.
- D16 2026-11-04: CSRF for custom JSON routes = same-origin `Origin` check + `application/json` content-type (forces preflight) + SameSite=Lax cookies; no double-submit token (server actions already have Next origin check).
- D15 2026-11-04: Bank seeded at 260 hand-authored, machine-verified golden questions (v1 gate ≥120 met; v2 asks 600). The designed route to 600–2,000 is the Haiku-batch → Sonnet-QA pipeline, which needs ANTHROPIC_API_KEY (~$30 per the pack). Not hand-authoring 340 more in-session.

## Blocked / needs human
- [ ] Railway login + first deploy (Phase 10) — docs/DEPLOY.md §0–§4 (~15 min).
- [ ] ANTHROPIC_API_KEY — to grow the banks (600 aptitude / 300 tech / 100 cards) and enable optional Haiku phrasing / Sonnet drafts / explain-more.
- [ ] Verify company-profile sources before a real pilot (see D28).
- [ ] AUTH_RESEND_KEY + verified sending domain (real email).

## Log
- 2026-11-05T06:10+05:30 v3 verified: clean clone (npm ci → typecheck → lint → bank+content validate → 264 unit → 41 e2e → build) green; Docker image rebuilt — health ok, profile-coach PDF upload e2e + smoke suite pass against the container; TPO funnel 1.4 s → 110 ms at 505 students.
- 2026-11-05T05:40+05:30 v3 done locally: tech bank, company profiles, HR cards, insight engine, readiness v3, crack-path, skills checklist, profile coach, TPO coach, admin additions, LLM cost report; 264 unit + 41 e2e green.
- 2026-11-05T02:40+05:30 phase 10 done locally: QA matrix green, clean clone (npm ci → typecheck → lint → 195 unit → 32 e2e → build) green. Remaining: Railway deploy (human login), 600-Q bank (API key).
- 2026-11-05T01:50+05:30 phase 9 done: load + Lighthouse reports committed, explain-more, error pages, landing, smoke, DEMO.md.
- 2026-11-05T01:20+05:30 phase 8 config done + verified with local Docker; deploy waits for Railway login.
- 2026-11-05T00:50+05:30 phase 7 done: admin + content + superadmin; 192 unit + 24 e2e green.
- 2026-11-05T00:10+05:30 phase 6 done: TPO dashboard end to end; visual pass fixed mock scroll offset, DI pipe tables → real tables, flat heatmap (metric + seed), demo names.
- 2026-11-04T23:20+05:30 phase 5 done: mock exam (service + runner + result/review), cron build-drills/weekly + scripts/cron.mjs, 166 unit + 16 e2e green.
- 2026-11-04T22:30+05:30 phase 4 done: profile tab (target company, deletion request, sign out), privacy page, axe clean (fixed 2 contrast issues), static offline shell + drill doc cache warm (fixed offline reload after client nav), leaderboard Date-param bug fixed + tested.
- 2026-11-04T22:00+05:30 phase 2 (v2) done: migration 0001 (audit_logs, rate_limits, batch_mocks, mock exam cols), rate limiter wired to login + sync, audit lib, 7-day idle sessions, RBAC matrix; 122 unit + 11 e2e green.
- 2026-11-04T21:40+05:30 phase 1 (v2) done: retheme to navy/amber + Inter + lucide (no emoji/confetti), env.ts, CSP nonce middleware (all e2e pass under CSP), CI workflow, /dev/ui, postcss override → npm audit 0 vulns.
- 2026-11-04T21:10+05:30 phase 3 (v1) done: 260 golden Q across 42 topics (5 parallel authoring agents, every answer re-solved in code), pack samples added, seed idempotent (2 runs identical), 500-student seed OK. v2 spec + product pack received; adopted v2.
- 2026-11-04T20:25+05:30 phase 2 done: Auth.js v5 (Resend provider w/ console fallback, Drizzle adapter, DB sessions, invite-only signIn), Node-runtime middleware role routing (403 rewrite), authz requireUser/requireRole/scoped; 12 vitest (incl. cross-college DB isolation) + 5 Playwright green.
- 2026-11-04T20:10+05:30 phase 1 done: Next 15.5 + Tailwind 4, drizzle migration 0000 (vector ext), /api/health ok, typecheck/lint/build/1 vitest green. Shared first-load JS = 103 kB (budget for /today: 150 kB).
- 2026-11-04T14:45+05:30 phase 0 done: ORCHESTRATOR.md, PROGRESS.md, docs/{PRODUCT,schema,design,adaptive,decisions}.md written.
