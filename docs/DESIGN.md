# DESIGN SYSTEM (inspired by learncrew.org — recreate, do NOT copy logos/photos/copy)
Voice: calm, clear, encouraging coaching — "a rhythm that respects your week". No anxiety, no shouting red banners, no confetti spam.
## Tokens (`src/styles/tokens.css` + tailwind theme)
| Token | Hex | Use |
|---|---|---|
| ink-900 (primary) | #0F1B3D | headers, primary buttons, nav |
| ink-700 | #23315C | hover, secondary text on light |
| accent-500 | #F59E0B | CTAs, streak flame, highlights |
| accent-600 | #D97706 | CTA hover |
| coral-500 | #F97362 | soft alerts, "flagged" |
| success-500 | #16A34A | correct answers, streak done, ready |
| danger-500 | #DC2626 | wrong answers (review mode only) |
| info-500 | #2563EB | links, focus ring |
| bg | #FFFFFF / surface #F7F8FB | page / sections |
| border | #E5E7EB | cards, inputs |
| text-900 #111827, text-600 #4B5563, text-400 #9CA3AF | body/meta |
Heatmap scale (TPO): #FEE2E2 → #FEF3C7 → #D9F99D → #86EFAC → #16A34A.
Typography: Inter (next/font, fallback system-ui). Scale 12/14/16/18/20/24/30/36; weights 400/500/600/700; line-height 1.5 body, 1.2 headings. Tabular nums for timers/scores.
Spacing: **8pt grid** (v4, overrides the old 4px scale) — see Layout grid below.
Radius: 8 inputs/buttons/palette cells, 12 cards, 9999 chips. Shadows: elevation-0/1/2 only (`shadow-e1`, `shadow-e2`).
Motion: 150–200ms ease-out; respect prefers-reduced-motion.
## Components (build in `src/components/ui`, Storybook-free; show them on `/dev/ui` page in dev only)
Button (primary ink, CTA amber, ghost), Card (program-card style), Chip (schedule/section chips), Badge (trust/difficulty), StarRating, Accordion (FAQ), Tabs, Dialog, Toast, ProgressDots, TimerBar, StreakFlame, Heatmap, EmptyState, Skeleton, BottomNav (mobile), Sidebar (TPO desktop).
## Navigation
- Student (mobile bottom nav, 4 items max): Today · Mocks · Progress · Profile.
- TPO (sidebar desktop, collapsible): Overview heatmap · Batches · Students · Mocks · Reports · Settings.
- Admin: Colleges · Question bank · Review queue · Audit log.
- Every screen ≤2 taps from home; breadcrumbs on TPO/admin; clear back on mocks.
## Mock-test UX (must feel like a real exam)
- Pre-test screen: sections, question count, duration, marking scheme (negative marks), instructions, "Start" CTA.
- In-test: sticky top TimerBar (turns amber <5 min, coral <1 min, auto-submit at 0), section tabs, question palette with ProgressDots (unanswered / answered / flagged / visited), Mark for review, Clear, Prev/Next, keyboard shortcuts on desktop (1–4 options, N/P, F flag).
- Resilience: answers autosave every change to server (debounced) + localStorage; refresh/resume restores state and server-authoritative remaining time; offline banner.
- Submit confirm dialog showing unanswered count. Sectional timers when mock type requires.
- Result: score, percentile in college, accuracy, time per question, section breakdown chart.
- Review mode: each question with your answer (danger) vs correct (success), explanation, time taken, filter by wrong/flagged/skipped.
- Daily drill: 10 Q, ~10 min, StreakFlame updates, gentle "come back tomorrow" state.
## UI quality bar
Mobile-first 360px, WCAG AA contrast, visible focus rings, 44px tap targets, skeletons not spinners, real empty states, no lorem ipsum, no gradient blobs / emoji soup / generic AI dashboards. Lighthouse mobile ≥90 performance, ≥95 accessibility. PWA: manifest, icons, offline shell, installable.


## Implementation notes
- Tokens: `src/styles/tokens.css` → Tailwind v4 `@theme inline` in `src/app/globals.css`. Class names: `bg-ink-900`, `bg-accent-500`, `text-text-600`, `bg-surface`, `border-border`, `text-success-500`, `text-danger-500`, `text-coral-500`, `text-info-500`.
- Font: Inter via `next/font/google` when reachable at build; system-ui fallback (D7 revised).
- Icons: `lucide-react` (tree-shaken, ~1 KB each). No emoji as UI icons.
- Components live in `src/components/ui` + feature folders; gallery at `/dev/ui` (404 in production unless `ALLOW_DEV_LOGIN_LINKS=true`).
- Routes (D13): student routes are `/today`, `/drill/*`, `/mocks/*`, `/progress`, `/profile`, `/leaderboard` (no `/app` prefix; v1 routes kept).

---

# v4 — product-grade layout (overrides anything above that conflicts)

## Layout grid
| Rule | Value | Where it lives |
|---|---|---|
| Spacing tokens | 8 / 16 / 24 / 32 / 40 / 48 / 64 / 80 / 96 px (Tailwind `2 4 6 8 10 12 16 20 24`) | `scripts/lint-spacing.mjs` (CI) |
| 4px exception | icon-to-label gaps (`gap-1`) and chip inner padding (`py-1` on `rounded-pill`) only | same lint |
| Containers | student `max-w-[1120px]` · reading / mock stem `max-w-[720px]` (≈70ch) · TPO/admin `max-w-[1440px]`; always `mx-auto` | `ui/layout.tsx` `Container`, `StudentPage`, shells |
| Gutters | 16 (<640) · 24 (tablet) · 32 (≥1024) → `px-4 sm:px-6 lg:px-8` | same |
| Desktop columns | 12-col grid, gap 24 (`lg:grid-cols-12 gap-6`); card grids `gap-6`, equal heights, tops aligned | pages; checked by `e2e/visual-qa.spec.ts` |
| Rhythm | inside cards 8–16 · section header → content 24 · between sections 48 mobile / 64 desktop | `Section` |
| Page header | min 56 mobile / 72 desktop; title 24–30/600 + 16 subtitle text-600; actions right on the same baseline; 32 below | `PageHeader` (`data-page-header`) |
| Card padding | 24 mobile / 32 desktop everywhere (`p-6 lg:p-8`) | `Card` |
| Orphan whitespace | single-column content centres in the 720 reading container; never an empty right column | `StudentPage width="reading"` default |

The `src/components/ui/` primitives are exempt from the lint because their exact specs below (e.g. button padding-x 20) come from this document.

## Placement wireframes

### In-mock — desktop (≥1024)
```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ Infosys pattern mock          ( 24:12 )▔▔▔▔▔▔▔▔▔▔                    [▶ Submit  52] │ 64  sticky
│ All answers saved                                                                    │
├──────────────────────────────────────────────────────────────────────────────────────┤
│  Quant   Logical   Verbal                                       [Quant 12:30]        │ 48  sticky
├──────────────────────────────────────────────────────────────┬───────────────────────┤
│        Question 3 of 30                    +1 / −0.25        │ Questions  12 · 3 flag │
│       ┌───────────────── stem (720 max) ─────────────────┐   │ [1][2][3][4][5]        │
│       │ A train 240 m long passes a pole in 12 s …        │   │ [6][7][8][9][10]  40×40│
│       └───────────────────────────────────────────────────┘   │ …          gap 8      │
│       ┌ (•) [A]  20 m/s ─────────────────────── 56 ┐          │ ■ Answered □ Not ans.  │
│       ┌ ( ) [B]  24 m/s ───────────────────────────┐          │ □ Not visited • Review │
│       ┌ ( ) [C]  …                                  ┐          │ 320 rail, sticky,      │
│       ┌ ( ) [D]  …                                  ┐          │ scrolls internally     │
├──────────────────────────────────────────────────────────────┴───────────────────────┤
│ [‹ Prev] [⚑ Mark for review] [⌫ Clear]                           [Save & Next ›]    │ 72  fixed
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### In-mock — mobile (360)
```
┌──────────────────────────────┐
│ Infosys mock  (24:12) [Submit]│ 64
├──────────────────────────────┤
│ Quant Logical Verbal [▦ 12/30]│ 48  ← opens palette bottom sheet
├──────────────────────────────┤
│ Question 3 of 30             │
│ ┌ stem ────────────────────┐ │
│ └──────────────────────────┘ │
│ ┌ (•) [A] 20 m/s ─────── 56 ┐│
│ ┌ ( ) [B] …                 ┐│
├──────────────────────────────┤
│ [‹] [⚑] [⌫]     [Save & Next]│ 72
└──────────────────────────────┘
 Palette sheet: fixed bottom, max-h 75dvh, rounded top, [×] close (Esc), same grid + legend.
```

### Results
```
┌ PageHeader: eyebrow company · "<mock> — result" · [All mocks] ───────────────────────┐
┌ Hero score card (full width) ────────────────────────────────────────────────────────┐
│ SCORE                                   PERCENTILE   ACCURACY   AVG / Q             │
│ 72/100   (48–60/700 tabular)            84           68%        41s                 │
│ ── Section breakdown (2-col bars on desktop) ──                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
  Insight headline
┌ Focus this week (pinned first) ───────┐ ┌ What's going wrong ─────────────────────────┐
│ • Percentages — 10 a day              │ │ • Time & work is eating time …              │
│ [ Start focus drill · 10 Q ] (primary)│ │ • Guesses cost you 3 marks …                │
└───────────────────────────────────────┘ └─────────────────────────────────────────────┘
  Review  [All] [Wrong] [Flagged] [Skipped]
┌ Q4 · Wrong · 52s ── stem (70ch) · options with Correct / Your answer badges · explanation ┐
```

### Insights
Same 2-col card row as Results: **Focus this week** (with the screen's only primary CTA) left, **What's going wrong** right; 1-col on mobile. "Earlier" insights are one divided list card, not a stack of equal-weight cards.

### TPO heatmap
```
┌ sidebar 240 ┐┌ 1440 container ─────────────────────────────────────────────────────────┐
│ LearnCrew   ││ Overview / Heatmap                                                     │
│ Overview    ││ Heatmap                                    (subtitle)                  │
│ Weak topics ││┌ filter bar (sticky top-0 under header) ────────────────────────────────┐│
│ …           │││ Rows ▾ │ Branch ▾ │ Company ▾ │ Dates ▾ │ Measure ▾ │ [Apply] Reset   ││
│             ││└────────────────────────────────────────────────────────────────────────┘│
│             ││┌ Accuracy % (last 30 days)               legend: ■<30 ■30–44 … □ none ┐ │
│             │││ Batch (sticky) │ P │ T │ S │ … (sticky header row, vertical labels)  │ │
│             │││ 2027 CSE-A     │82 │51 │33 │   cells ≥ 40×40, 4px spacing            │ │
│             ││└ scrolls inside the card (max-h 70dvh), never the page ────────────────┘ │
└─────────────┘└────────────────────────────────────────────────────────────────────────┘
```

## Visual hierarchy
- **One primary CTA per screen** (amber `cta` or ink `primary`, marked `data-cta="primary"`); everything else `secondary` (outline) or `ghost`. In the exam the primary is **Submit**; Save & Next is a heavy-outline secondary so the two never compete.
- **60/30/10**: surface/white · ink structure (nav, headings) · amber only for CTA, streak, key highlights. Success/danger only for semantic state.
- KPIs: 12/500 uppercase tracking-wide label above a 36–60px tabular numeral (`Stat`, `KpiCard`).
- Quiet chrome: low-contrast nav, 1px borders, no heavy shadows. Banned: gray-on-gray, equal-weight card walls, centred-everything, icon+title+paragraph tile grids, gradient blobs, emoji headers, shadcn zinc defaults.

## Component specs (exact) — all states on `/dev/ui`
| Component | Spec |
|---|---|
| Button | sm 36 (dense desktop tables only) · md 44 (default) · lg 52 (primary page CTA / exam Submit). Padding-x 16/20/24, radius 8, 14/16 600, icon 20 + 8 gap. Hover darkens one step, active `translateY(1px)`, focus 2px info-500 ring + 2px offset, disabled 40%, loading = spinner over invisible content (width locked). |
| Card | radius 12, 1px `#E5E7EB`, elevation-0 default; elevation-1 `0 1px 2px rgba(15,27,61,.06), 0 1px 3px rgba(15,27,61,.08)` when interactive; hover elevation-2 `0 4px 12px rgba(15,27,61,.08)`. Header 16/600 + optional meta right; 16 header→body. |
| TimerBar | 40px pill, tabular 20/600 `mm:ss` (`hh:mm:ss` when the test is over 60 min), 4px progress under it. ink → amber (<5 min) → coral (<1 min); `aria-live="polite"` announces "5 minutes left" and "1 minute left" once; never flashes. |
| OptionCard | min 56, padding 16, radio indicator + letter key A–D, selected = 2px ink border + `ink-50` tint; review mode shows "Correct answer" / "Your answer" badges. |
| Palette cell | 40×40, radius 8: unvisited = border · visited-unanswered = 2px coral outline · answered = ink fill · flagged = amber corner dot · current = 2px info ring (+2 offset). |
| Input | 44px, label above 14/500, helper/error 12, 8 gaps (`Field`). |
| Chip | radius 9999, 4px block / 8px inline padding, 12/500. |

**Tap-target note.** The spec's 40×40 palette cell is below the 44px tap rule. It is kept (it is what makes a 30–60 question grid fit a 320 rail) because the 8px gap gives a 48px pitch, which satisfies WCAG 2.5.8 target spacing; the visual-QA check exempts exactly these cells and nothing else. `size="sm"` (36) buttons are only allowed inside dense desktop tables and are exempted there only at ≥1024px.

## Visual QA gate
`e2e/visual-qa.spec.ts` (Playwright project `visual`) screenshots landing, login, Today, drill, mock pre-test, in-mock (desktop rail + mobile drawer), submit dialog, result, review, insights, company crack-path, profile coach, TPO overview + heatmap and the admin queue at 360 / 768 / 1280 / 1440 and asserts: no horizontal scroll, tap targets ≥44, exactly one primary CTA (where the screen has one), ≥32 under the page header, equal-height cards per grid row, exam chrome on one centre line with 64/48/72 bars, nothing starting under sticky chrome. `VISUAL_QA_WRITE=1` writes the PNGs and `docs/screens/CHECKLIST.md`; the orphan-whitespace box is ticked only from the manual review file `docs/screens/v4-review.json`. Visual-regression snapshots (`toHaveScreenshot`, `maxDiffPixelRatio: 0.01`) cover the deterministic screens (`/dev/ui`, landing, login at 360 and 1280); data-driven screens are covered by the assertions instead, because seeded dates and timers make pixel snapshots of them flaky.
