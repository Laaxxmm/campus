# Product brief — LearnCrew Campus

## One-liner
B2B placement-aptitude practice for Indian engineering colleges. College / TPO pays ₹200–500 per student per year. Students build a daily 10-question habit; TPOs see who is placement-ready for which company.

## Personas
- **Student (Priya, 3rd-year ECE, tier-2 college, Tamil Nadu)** — ₹8k Android phone, patchy campus Wi-Fi, 15 min/day between classes. Wants to clear TCS NQT / Infosys online tests. Motivated by streaks, peer leaderboard, visible progress.
- **TPO (Mr. Raman, Training & Placement Officer)** — reports placement % to management. Needs: who is active, who is at risk, which topics the batch is weak in, a printable weekly report for the principal, CSV for Excel.
- **College admin** — uploads roster CSV, manages batches, drive dates, seats.
- **Content reviewer** — approves/retires generated questions.
- **Superadmin (founder)** — creates colleges, watches usage.

## MVP scope
- Invite-only magic-link login (no public signup), DPDP consent.
- Daily 10-Q adaptive drill (6 at band / 2 stretch / 2 spaced review), instant feedback + pre-written explanation, streak + XP + freeze.
- Company mocks (TCS NQT, Infosys, Accenture, Cognizant, Wipro, Capgemini) with server timer + section scores.
- Progress (topic mastery, readiness per company), batch leaderboard (first name + initial).
- TPO dashboard: KPIs, topic×batch heatmap, students table + CSV, at-risk list + WhatsApp nudge text, weekly report (print to PDF).
- Admin: roster CSV import with preview/errors/seat limit, batches, college settings; content review queue; superadmin college creation.
- PWA, offline-tolerant drills (IndexedDB queue → `/api/sync`).
- Question bank ≥120 golden original questions, pipeline (generate/QA/dedupe) toward 2,000.

## Out of scope (MVP)
Public signup, in-app payments, native Android, video, coding judge, WhatsApp bot (phase 2), SSO (phase 2).

## Metrics
- Student: D7 retention, weekly active %, median streak, drills/student/week.
- TPO: weekly active % of seats, avg readiness for target company, at-risk count trend.
- Business: pilot → paid conversion, seats/college, cost per active student (target < ₹5/mo infra+LLM).
- Quality: question correct-rate distribution per band, flagged/retired rate.

---
## v3 — Placement Readiness Coach (supersedes MVP scope above where they differ)
Mocks are the measurement layer; the product is the coach.

| # | Pillar | What the student / TPO gets | Where |
|---|---|---|---|
| 1 | **Measure** | Daily drills + real mocks; every answer stores topic, difficulty, time_ms, answer changes, marked-for-review, correct | `attempts` |
| 2 | **Diagnose** | After every drill/mock: "What's going wrong" (≤ 3 bullets) + "Focus this week" (3 topics with daily question targets) + a one-tap focus drill. Rules are deterministic TS (`src/lib/insights`); Haiku only rephrases computed facts; template fallback. No claim without ≥ 5 attempts on a topic. | `/insights`, result screens |
| 3 | **Company crack-path** | Pick up to 5 target companies + 1 dream. Per company: rounds, approximate bar (sourced, dated), branch expectations, round-by-round plan, tech MCQs + concept cards by stack, HR question cards (STAR outlines), "gap to bar" per round | `/companies`, `/companies/[key]` |
| 4 | **Missing-skills checklist** | Have / weak / missing per JD skill (required vs nice-to-have), one action + resource each; auto from attempts + self-declared | `/companies/[key]/skills` |
| 5 | **Resume + LinkedIn coach** | Deterministic checklists first (sections, metrics, keywords vs target JDs; headline/About/skills/featured). Sonnet "Draft for me" only on click, quota-limited. Copy-paste only — no LinkedIn API, no scraping. Resume PDF parsed in memory; text stored only with consent | `/profile-coach` |
| 6 | **TPO cohort view** | Interview-ready % per company (funnel), cohort weak topics, "assign focus pack to N students", student drill-down with insights + checklist (never unshared drafts) | `/tpo` |

### Readiness score (deterministic, explainable)
`readiness(company) = 0.40·aptitude_vs_cutoff + 0.30·tech_concepts + 0.15·consistency + 0.15·profile`
- **aptitude_vs_cutoff** (0–100): section mastery weighted by the company's section weights, scaled against its approximate cutoff (meeting the bar ≈ 80).
- **tech_concepts** (0–100): mastery on the tech topics the company expects for the student's branch.
- **consistency** (0–100): drills in the last 14 days, current streak, mocks taken.
- **profile** (0–100): resume + LinkedIn checklist completion.
Weights live in `src/lib/readiness-v3.ts` (config + unit tests); every component returns a "why" list shown in the UI.

**Interview-ready (TPO funnel)** for a company = aptitude ≥ bar **and** tech ≥ 60 **and** profile checklist ≥ 80% **and** ≥ 1 mock or HR set completed.
