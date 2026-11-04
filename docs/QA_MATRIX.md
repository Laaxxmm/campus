# QA matrix — LearnCrew Campus (Phase 10)

Legend: ✓ allowed · ✗ denied (403 page, or 404 for foreign ids) · redirect = anonymous → `/login?next=…`. “admin” in v2 = our `superadmin` (+ `content` for the review queue); the college `admin` role has TPO-level access to its own college.

| Area | Route / API | student | tpo | college admin | superadmin | anon | Tests |
|---|---|---|---|---|---|---|---|
| Landing / login / privacy | `/`, `/login`, `/privacy` | ✓ | ✓ | ✓ | ✓ | ✓ | `e2e/auth.spec.ts`, `e2e/qa-matrix.spec.ts` (public 200), `e2e/smoke.spec.ts` |
| Magic link, invite-only, rate limit | `/login` action | ✓ | ✓ | ✓ | ✓ | ✓ (unknown email rejected) | `e2e/auth.spec.ts` (rejects stranger, 5/15 min per ip+email), `tests/rate-audit.test.ts` |
| Onboarding + DPDP consent | `/onboarding` | ✓ own | ✗ | ✗ | ✗ | redirect | `e2e/auth.spec.ts`, `src/lib/rbac.test.ts` |
| Today / drill / done | `/today`, `/drill/[id]`, `/drill/[id]/done`, `POST /api/sync` | ✓ own | ✗ | ✗ | ✗ | redirect / 401 | `e2e/drill.spec.ts` (10 Q → streak 1, offline sync once), `src/lib/drill.test.ts` (idempotent, shuffle, no answer in DTO), `e2e/qa-matrix.spec.ts` (IDOR → 404, CSRF 403), `tests/rate-audit.test.ts` (submit 120/min) |
| Explain more | `POST /api/explain` | ✓ own, after a wrong answer | ✗ | ✗ | ✗ | 401 | `tests/explain.test.ts` (off without key, cache), `e2e/qa-matrix.spec.ts` (CSRF) |
| Mocks list / take / result / review | `/mocks`, `/mocks/[id]`, `/mocks/attempt/[id]`, `/result`, `POST …/save`, `POST …/submit` | ✓ own | ✗ | ✗ | ✗ | redirect / 401 | `e2e/mock.spec.ts` (full flow, refresh resume, review filters, **answer-leak**, fake-clock **auto-submit**, IDOR 404), `tests/mocks.test.ts` (one active attempt, late save 409, sectional lock, negative marks, percentile), `e2e/qa-matrix.spec.ts` (CSRF) |
| Progress / streak / leaderboard / profile | `/progress`, `/leaderboard`, `/profile` | ✓ own | ✗ | ✗ | ✗ | redirect | `src/lib/streak.test.ts`, `tests/student-services.test.ts` (first name + initial only), `e2e/a11y.spec.ts` |
| TPO overview / heatmap | `/tpo`, `/tpo/heatmap` | ✗ | ✓ own college | ✓ own college | ✓ any (`?college=`) | redirect | `e2e/tpo.spec.ts`, `tests/tpo.test.ts` (scoping, no scope widening via params) |
| TPO students / drill-down / export | `/tpo/students`, `/tpo/students/[id]`, `/tpo/students/export` | ✗ | ✓ own | ✓ own | ✓ | redirect | `e2e/tpo.spec.ts` (**cross-college 404**, CSV headers, export never includes other college), `tests/tpo.test.ts`, `src/lib/csv.test.ts`, `src/lib/authz.test.ts` |
| At-risk + nudges / weekly report | `/tpo/at-risk`, `/tpo/reports` | ✗ | ✓ own | ✓ own | ✓ | redirect | `e2e/tpo.spec.ts`, `tests/tpo.test.ts` (report has no PII, cached) |
| TPO create / schedule mock | `/tpo/mocks` actions `createMock`, `scheduleMock` | ✗ | ✓ own | ✓ own | ✓ | redirect | `tests/tpo.test.ts` (**audit asserted**, foreign batch/mock rejected), `e2e/tpo.spec.ts` (student sees scheduled mock, audit row) |
| Roster import / batches / settings | `/admin/import`, `/admin/batches`, `/admin/college` | ✗ | ✓ own | ✓ own | ✓ | redirect | `tests/roster.test.ts` (200 rows, re-import 0 dupes, row errors, seat limit, **audit**), `e2e/admin.spec.ts`, `tests/admin.test.ts` (batch scoping) |
| Content review queue | `/content/review` | ✗ | ✗ | ✗ | ✓ (+ `content` role) | redirect | `tests/admin.test.ts` (approve → golden → next drill, edit/version, **audit**), `e2e/admin.spec.ts` |
| Superadmin colleges / audit / DPDP | `/super`, `/super/audit`, `/super/privacy`, `/super/privacy/export` | ✗ | ✗ | ✗ | ✓ (re-auth ≤ 15 min) | redirect | `tests/admin.test.ts` (re-auth required, create college + TPO invite, export/delete + **audit**), `e2e/admin.spec.ts` (create college, audit log, TPO → 403) |
| Cron | `POST /api/cron/build-drills`, `/api/cron/weekly` | — | — | — | — | 401 without Bearer `CRON_SECRET` | `tests/cron.test.ts`, `e2e/qa-matrix.spec.ts` |
| Health | `/api/health` | ✓ | ✓ | ✓ | ✓ | ✓ | `tests/health.test.ts`, `e2e/smoke.spec.ts` |

## Cross-cutting checks
| Check | Evidence | Status |
|---|---|---|
| RBAC deny-by-default (14 routes × 5 roles) | `src/lib/rbac.test.ts` | ✅ |
| Every protected route redirects anonymous users | `e2e/qa-matrix.spec.ts` | ✅ |
| CSRF rejection on every custom JSON POST route | `e2e/qa-matrix.spec.ts`, `e2e/security.spec.ts`, `tests/security.test.ts` | ✅ |
| Security headers (CSP nonce + strict-dynamic, XFO DENY, nosniff, Referrer-Policy, Permissions-Policy, HSTS on https) | `e2e/security.spec.ts`, `tests/security.test.ts` | ✅ |
| Cookie flags (httpOnly, SameSite=Lax; Secure + `__Secure-` on https via Auth.js) | `e2e/security.spec.ts` | ✅ |
| App refuses to boot with invalid env | `tests/security.test.ts`, Docker run (exit 1) — PROGRESS log | ✅ |
| UI layer never imports the DB; no raw SQL / `dangerouslySetInnerHTML` | `tests/architecture.test.ts` | ✅ |
| Secrets: gitleaks (git history) clean with documented test-fixture allowlist | `.gitleaks.toml`, CI job | ✅ |
| `npm audit --omit=dev --audit-level=high` | 0 vulnerabilities | ✅ |
| axe: zero serious/critical on student, mock, TPO, admin, content, superadmin screens | `e2e/a11y.spec.ts`, `e2e/qa-matrix.spec.ts` | ✅ |
| Lighthouse mobile ≥ 90 perf / ≥ 95 a11y | `docs/reports/lighthouse.md` (99–100 / 100) | ✅ |
| Load: 500 students drill (sync p95 < 500 ms), 200 concurrent mock-takers | `docs/reports/load-test.md` (p95 35 ms; 200/200) | ✅ |
| 360 px screenshots of every main screen | `docs/screens/` (28) | ✅ |
| Deployed smoke (`BASE_URL=… e2e/smoke.spec.ts`) | needs Railway deploy | ⏳ blocked on human (Railway login) |
