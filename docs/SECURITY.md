# Security & threat model — LearnCrew Campus

| Threat | Where | Control | Test |
|---|---|---|---|
| IDOR across colleges | `/tpo/students/[id]`, CSV export, mocks, drills | `scoped(user)` college filter; students only own `user_id` rows; 404 not 403 for foreign ids | `src/lib/authz.test.ts`, `e2e/tpo.spec.ts` (cross-college 404) |
| Privilege escalation | role-gated routes | middleware ROUTE_ROLES deny-by-default for protected prefixes + `requireRole()` in every page/action/route | RBAC matrix unit test, e2e student→/tpo 403 |
| CSRF | server actions, custom POST routes | Server Actions origin check (Next), Auth.js CSRF token; custom routes verify `Origin`/`Host` (`src/lib/http.ts`) | `tests/security.test.ts` |
| Brute force / abuse | login, answer submit, explain, CSV import | Postgres rate limiter: login 5/15 min per IP+email, submit 120/min/user, explain 5/min/user, import 5/hr | rate-limit unit test |
| Answer leakage | drill/mock payloads | DTOs omit answer_index/explanation until graded; grading only server-side | drill unit test, mock leak e2e |
| Cheating in mocks | mock attempts | server `started_at`/`ends_at`, late submissions rejected, one active attempt per mock, tab-switch count | mock tests |
| Question leakage across colleges | bank | 60% per-college subset, per-student option shuffle, retire on >85% weekly correct-rate jump | adaptive/cron tests |
| Session theft | cookies | httpOnly, SameSite=Lax, Secure + `__Secure-`/`__Host-` prefixes when AUTH_URL is https; DB sessions revocable | cookie flag test |
| XSS / clickjacking | all pages | React escaping, no `dangerouslySetInnerHTML`; CSP with per-request nonce, X-Frame-Options DENY, HSTS, Referrer-Policy, Permissions-Policy | header test |
| Secrets | repo | `.env*` gitignored, `.env.example` placeholders only, env validated by `src/env.ts`; gitleaks in CI | CI |
| PII in logs / LLM | logs, weekly narrative | logs carry ids not emails; LLM gets aggregated numbers only | review |
| DPDP | consent, deletion | consent captured at onboarding (`consent_at`), privacy page, deletion request route, admin export/delete | e2e |
