# Lighthouse (mobile emulation, Lighthouse 13.6, 4x CPU throttle, slow 4G) — 2026-11-04T16:15:50.846Z

Production build (`next start`) on the 4-vCPU build box, logged-in student for today/drill.

| Page | Perf | A11y | Best practices | SEO | FCP ms | LCP ms | TBT ms | CLS |
|---|---|---|---|---|---|---|---|---|
| landing | 99 | 100 | 100 | 90 | 771 | 771 | 134 | 0.000 |
| login | 99 | 100 | 100 | 90 | 774 | 774 | 141 | 0.000 |
| today | 99 | 100 | 100 | 100 | 803 | 803 | 95 | 0.000 |
| drill | 100 | 100 | 100 | 100 | 780 | 780 | 56 | 0.000 |

Gate (v2): performance ≥ 90 and accessibility ≥ 95 on every page → **PASS**. Installability is covered by e2e/a11y.spec.ts (manifest + service worker + offline shell); Lighthouse 13 no longer has a PWA category.

Full HTML reports: lighthouse-*.report.html.
