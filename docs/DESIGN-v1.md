# Design system — LearnCrew Campus

# UI / DESIGN SCHEMA
**Principles**: mobile-first (360×740 baseline, works on ₹8k Android in Chrome), thumb-zone actions at bottom, ≤150 KB JS on `/today`, offline-tolerant, Hindi/regional-ready strings (all copy in `src/i18n/en.ts`), accessible (WCAG AA, 44px tap targets). TPO screens are desktop-first (1280) but readable on mobile.

**Design tokens** (`src/styles/tokens.css` + Tailwind theme):
```
--brand-600:#4F46E5 (indigo)  --brand-50:#EEF2FF
--success:#16A34A  --danger:#DC2626  --warn:#F59E0B  --streak:#F97316 (flame)
--ink-900:#0F172A  --ink-600:#475569  --surface:#FFFFFF  --bg:#F8FAFC  --border:#E2E8F0
radius: sm 8px · md 12px · lg 16px · pill 999px
space: 4/8/12/16/24/32 · font: Inter (system fallback), sizes 12/14/16/20/24/32, numbers tabular
heatmap scale (mastery 0–100): #FEE2E2 → #FEF3C7 → #DCFCE7 → #16A34A
dark mode: optional, tokens only
```

**Routes**
| Route | Role | Purpose |
|---|---|---|
| `/` | public | landing for colleges (pitch, "Book pilot" mailto) — no student signup |
| `/login`, `/login/check-email` | all | magic link |
| `/onboarding` | student | consent (DPDP), confirm name/roll/batch, pick target company |
| `/today` | student | home: streak flame, XP, today's drill CTA, readiness ring |
| `/drill/[drillId]` | student | one MCQ at a time, timer, instant feedback, explanation |
| `/drill/[drillId]/done` | student | score, XP gained, streak update, share card |
| `/mocks`, `/mocks/[id]` , `/mocks/attempt/[id]` | student | company mocks, server timer, result by section |
| `/progress` | student | topic mastery bars, readiness per company, history |
| `/leaderboard` | student | batch weekly XP (first name + initial only) |
| `/tpo` | tpo | overview KPIs: active %, median streak, avg readiness, at-risk count |
| `/tpo/heatmap` | tpo | topic × batch (or student) mastery heatmap, filter by company |
| `/tpo/students`, `/tpo/students/[id]` | tpo | table + drill-down; CSV export |
| `/tpo/at-risk` | tpo | inactive ≥5 days or readiness <40; "copy WhatsApp nudge" text |
| `/tpo/reports` | tpo | weekly report (Sonnet narrative + charts), print-to-PDF |
| `/admin/import` | admin/tpo | CSV upload (name,email,roll_no,batch) → preview → upsert → invites |
| `/admin/batches`, `/admin/college` | admin | batches, drive dates, seats |
| `/content/review` | content | approve/retire questions, see QA flags |
| `/super` | superadmin | colleges list, create college, usage |
| `/api/health`, `/api/sync`, `/api/cron/*`, `/api/explain` | system | health, offline attempt sync, cron (CRON_SECRET), explain-more |

**Components** (`src/components/`): `AppShell` (student bottom nav: Today · Mocks · Progress · Board) · `TpoShell` (sidebar) · `StreakFlame` · `XpBadge` · `ReadinessRing` · `McqCard` (stem markdown + KaTeX-lite for math, code blocks) · `OptionButton` (states: idle/selected/correct/wrong/disabled) · `TimerBar` · `ExplanationSheet` (bottom sheet, "Explain more" button if AI enabled) · `ProgressDots` (10) · `OfflineBanner` · `Heatmap` · `KpiCard` · `DataTable` (sort/filter/export) · `CsvDropzone` · `EmptyState` · `Toast`.

**Mobile layouts**
- `/today`: top bar (logo, streak flame N) → hero card "Today's drill · 10 Q · ~7 min" big CTA → readiness ring for target company → 3 weakest topics chips → bottom nav.
- `/drill`: top: ProgressDots + TimerBar; middle: McqCard scrollable; bottom fixed: 4 OptionButtons stacked full-width; after answer: ExplanationSheet slides up with "Next" fixed at bottom.
- `/drill/done`: big score, confetti only if ≥7/10, streak +1 animation, "Come back tomorrow 5 AM" note.
- `/tpo` (desktop): KPI row (4 cards) → heatmap → at-risk table; on mobile, cards stack and heatmap scrolls horizontally.

**PWA**: `manifest.webmanifest` (name "LearnCrew", theme #4F46E5, icons 192/512, display standalone), service worker (Serwist or hand-rolled): precache shell; cache today's drill JSON on load; queue attempts in IndexedDB; POST `/api/sync` when online (idempotent by `client_id`).

