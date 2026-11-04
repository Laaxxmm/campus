# PROGRESS — LearnCrew Campus
Current phase: 3
Last updated: 2026-11-04T14:45:00+05:30 · Loop count this phase: 0/5

| # | Phase | Status | Commit |
|---|-------|--------|--------|
| 0 | Design system + schema | done | (this commit) |
| 1 | Scaffold | done | (see log) |
| 2 | Auth + roles | done | (see log) |
| 3 | Question bank + seed | todo | |
| 4 | Student drill + streak | todo | |
| 5 | Adaptive engine + mocks | todo | |
| 6 | TPO dashboard | todo | |
| 7 | Admin CSV + content review | todo | |
| 8 | Railway deploy config | todo | |
| 9 | Smoke tests + pilot hardening | todo | |

## Current phase tasks
- [ ] question-schema.ts (Zod + validators)
- [ ] content/taxonomy.json, content/blueprints.json
- [ ] content/bank/*.json ≥120 golden original questions
- [ ] prompts/{system,variant,qa,seed}.md
- [ ] scripts: validate-bank, seed (questions, access 60%, mocks, 3 wks activity), generate (--dry-run), qa, quant-check, dedupe
- [ ] acceptance: bank:validate 0 errors; db:seed idempotent; generate --dry-run prints batch JSON

## Decisions (ADR-lite)
- D1 2026-11-04: `learncrew-campus-product-pack.md` was NOT provided to the build session. Taxonomy, the "12 samples", and pack prompts (system/variant/qa/seed) are authored by the orchestrator from the summaries in ORCHESTRATOR.md. Replace with pack versions when available.
- D2 2026-11-04: Next.js pinned to 15.x (npm `latest` is 16.x) to honour the locked stack.
- D3 2026-11-04: Build env has no Docker-hosted Postgres by default; local dev/test uses native Postgres 16 + pgvector on :5432 (same as docker-compose port), so commands in README are unchanged.
- D5 2026-11-04: Added `users.target_company` (student pick at onboarding) and `questions.qa_flags` (jsonb, QA output for review UI) — both needed by routes in the spec, absent from schema.
- D6 2026-11-04: shadcn CLI cannot reach ui.shadcn.com from the build sandbox; shadcn-style primitives (cva + tailwind-merge, `components.json` kept) hand-written in `src/components/ui`.
- D7 2026-11-04: No `next/font` download — Inter via system font stack fallback; saves bytes on low-end phones and keeps builds offline-safe.
- D8 2026-11-04: Middleware runs on the Node.js runtime (stable in Next 15.5) so it can read DB sessions; e2e/dev read magic links from `/api/dev/magic-link` (404 in prod unless ALLOW_DEV_LOGIN_LINKS=true).
- D4 2026-11-04: Model IDs in `.env.example` set to current Claude family IDs (verified in Phase 3), not the 4.5 IDs written in the prompt — prompt itself says "verify current IDs".

## Blocked / needs human
- [ ] AUTH_RESEND_KEY + verified sending domain (real email). Until then magic links print to server console (and `/api/dev/magic-link` when ALLOW_DEV_LOGIN_LINKS=true / non-prod).
- [ ] Product pack file (optional — orchestrator-authored substitutes in use, see D1)

## Log
- 2026-11-04T20:25+05:30 phase 2 done: Auth.js v5 (Resend provider w/ console fallback, Drizzle adapter, DB sessions, invite-only signIn), Node-runtime middleware role routing (403 rewrite), authz requireUser/requireRole/scoped; 12 vitest (incl. cross-college DB isolation) + 5 Playwright green.
- 2026-11-04T20:10+05:30 phase 1 done: Next 15.5 + Tailwind 4, drizzle migration 0000 (vector ext), /api/health ok, typecheck/lint/build/1 vitest green. Shared first-load JS = 103 kB (budget for /today: 150 kB).
- 2026-11-04T14:45+05:30 phase 0 done: ORCHESTRATOR.md, PROGRESS.md, docs/{PRODUCT,schema,design,adaptive,decisions}.md written.
