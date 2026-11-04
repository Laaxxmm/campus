# Lighthouse — v4 (Lighthouse 13.6, mobile emulation 360×740) — 2026-11-04

Production build (`next start`, dev DB with 505 seeded students). Logged in per role through `/dev/login`; every page’s final URL was checked so a login redirect can’t pass as a score.

## Performance (4× CPU throttle, slow 4G)
| Page | Perf | A11y | FCP ms | LCP ms | TBT ms | CLS |
|---|---|---|---|---|---|---|
| landing | 100 | 100 | 755 | 755 | 35 | 0.000 |
| login | 100 | 100 | 642 | 642 | 8 | 0.000 |
| today | 100 | 100 | 677 | 677 | 9 | 0.000 |
| drill | 100 | 100 | 666 | 666 | 10 | 0.000 |

## Accessibility — every route (gate: ≥ 95)
| Screen | Route | A11y |
|---|---|---|
| landing | `/` | 100 |
| login | `/login` | 100 |
| privacy | `/privacy` | 100 |
| today | `/today` | 100 |
| mocks | `/mocks` | 100 |
| mock-pretest | `/mocks/<id>` | 100 |
| progress | `/progress` | 100 |
| profile | `/profile` | 100 |
| leaderboard | `/leaderboard` | 100 |
| insights | `/insights` | 100 |
| companies | `/companies` | 100 |
| crack-path | `/companies/infosys` | 100 |
| skills | `/companies/infosys/skills` | 100 |
| profile-coach | `/profile-coach` | 100 |
| drill | `/drill/<id>` | 100 |
| learn | `/learn/c_language` | 100 |
| in-mock | `/mocks/attempt/<id>` | 100 |
| mock-result | `/mocks/attempt/<id>/result` | 100 |
| onboarding | `/onboarding` | 100 |
| tpo | `/tpo` | 100 |
| tpo-funnel | `/tpo/funnel` | 100 |
| tpo-weak | `/tpo/weak-topics` | 100 |
| tpo-heatmap | `/tpo/heatmap` | 100 |
| tpo-students | `/tpo/students` | 100 |
| tpo-student | `/tpo/students/<id>` | 100 |
| tpo-at-risk | `/tpo/at-risk` | 100 |
| tpo-mocks | `/tpo/mocks` | 100 |
| tpo-reports | `/tpo/reports` | 100 |
| admin-import | `/admin/import` | 100 |
| admin-batches | `/admin/batches` | 100 |
| admin-college | `/admin/college` | 100 |
| content-review | `/content/review` | 100 |
| content-companies | `/content/companies` | 100 |
| super | `/super` | 100 |
| super-audit | `/super/audit` | 100 |
| super-llm | `/super/llm` | 100 |
| super-privacy | `/super/privacy` | 100 |

**37/37 routes ≥ 95 (all 100) → PASS.** v3 report kept below for history.

---

## v3: Lighthouse (mobile emulation, Lighthouse 13.6, 4x CPU throttle, slow 4G) — 2026-11-04T16:15:50.846Z

Production build (`next start`) on the 4-vCPU build box, logged-in student for today/drill.

| Page | Perf | A11y | Best practices | SEO | FCP ms | LCP ms | TBT ms | CLS |
|---|---|---|---|---|---|---|---|---|
| landing | 99 | 100 | 100 | 90 | 771 | 771 | 134 | 0.000 |
| login | 99 | 100 | 100 | 90 | 774 | 774 | 141 | 0.000 |
| today | 99 | 100 | 100 | 100 | 803 | 803 | 95 | 0.000 |
| drill | 100 | 100 | 100 | 100 | 780 | 780 | 56 | 0.000 |

Gate (v2): performance ≥ 90 and accessibility ≥ 95 on every page → **PASS**. Installability is covered by e2e/a11y.spec.ts (manifest + service worker + offline shell); Lighthouse 13 no longer has a PWA category.

Full HTML reports: lighthouse-*.report.html.
