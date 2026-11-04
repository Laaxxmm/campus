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
Spacing: 4px base (4,8,12,16,24,32,48,64). Sections spacious (py-12 mobile, py-20 desktop).
Radius: 8 inputs, 12 cards, 9999 chips. Shadows: sm only; cards = border + subtle shadow.
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
- Components live in `src/components/ui` + feature folders; gallery at `/dev/ui` (404 in production).
- Routes (D13): student routes are `/today`, `/drill/*`, `/mocks/*`, `/progress`, `/profile`, `/leaderboard` (no `/app` prefix; v1 routes kept).
