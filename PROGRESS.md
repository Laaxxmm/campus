# PROGRESS — LearnCrew Campus
Current phase: 1
Last updated: 2026-11-04T14:45:00+05:30 · Loop count this phase: 0/5

| # | Phase | Status | Commit |
|---|-------|--------|--------|
| 0 | Design system + schema | done | (this commit) |
| 1 | Scaffold | todo | |
| 2 | Auth + roles | todo | |
| 3 | Question bank + seed | todo | |
| 4 | Student drill + streak | todo | |
| 5 | Adaptive engine + mocks | todo | |
| 6 | TPO dashboard | todo | |
| 7 | Admin CSV + content review | todo | |
| 8 | Railway deploy config | todo | |
| 9 | Smoke tests + pilot hardening | todo | |

## Current phase tasks
- [ ] create-next-app (Next 15) + deps
- [ ] docker-compose (pgvector/pg16), drizzle config, schema, migration 0000 with vector extension
- [ ] scripts, .env.example, /api/health
- [ ] tokens + AppShell + TpoShell skeletons
- [ ] acceptance: migrate, typecheck, lint, build, health curl, 1 vitest

## Decisions (ADR-lite)
- D1 2026-11-04: `learncrew-campus-product-pack.md` was NOT provided to the build session. Taxonomy, the "12 samples", and pack prompts (system/variant/qa/seed) are authored by the orchestrator from the summaries in ORCHESTRATOR.md. Replace with pack versions when available.
- D2 2026-11-04: Next.js pinned to 15.x (npm `latest` is 16.x) to honour the locked stack.
- D3 2026-11-04: Build env has no Docker-hosted Postgres by default; local dev/test uses native Postgres 16 + pgvector on :5432 (same as docker-compose port), so commands in README are unchanged.
- D4 2026-11-04: Model IDs in `.env.example` set to current Claude family IDs (verified in Phase 3), not the 4.5 IDs written in the prompt — prompt itself says "verify current IDs".

## Blocked / needs human
- [ ] Product pack file (optional — orchestrator-authored substitutes in use, see D1)

## Log
- 2026-11-04T14:45+05:30 phase 0 done: ORCHESTRATOR.md, PROGRESS.md, docs/{PRODUCT,schema,design,adaptive,decisions}.md written.
