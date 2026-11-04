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
