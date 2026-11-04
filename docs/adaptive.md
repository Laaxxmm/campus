# Adaptive engine — rules (src/lib/adaptive.ts, pure functions)

## Skill model
- Elo per user × topic, start 1200.
- Question rating by band: 1=900, 2=1050, 3=1200, 4=1350, 5=1500.
- K = 24. Expected = 1 / (1 + 10^((Rq − Ru)/400)).
- Outcome S: correct = 1; correct but slower than `time_sec` = 0.75; wrong = 0.
- New rating = R + K × (S − Expected).

## Band moves
- 3 correct in a row in a topic → band +1; 2 wrong in a row → band −1.
- At most one band change per topic per IST day. Clamp 1–5. Streak counters reset after a move.

## Drill composition (10)
- 6 at skill band — topics sampled weighted by (target company topic/section weight × weakness).
- 2 at band + 1 (cap 5).
- 2 spaced review from `review_queue` with `due_on ≤ today`; stages 1/3/7 days; correct → next stage (after 7 → removed), wrong → stage 1.
- Shortfall in review → fill from band.
- Eligible: `college_question_access` for the student's college, status `golden`, not attempted in last 14 days (fallback: oldest seen if pool exhausted).
- Option order shuffled per student per drill (stored in `drills.option_order`).

## Readiness (0–100 per company)
- mastery(topic) = 1 / (1 + e^(−(rating − 1200)/150)).
- section score = mean over that section's topics weighted by topic weights (untouched topic → 0.2 prior).
- accuracy-time factor = clamp(0.5 + 0.5 × recent accuracy (last 50 attempts), 0.5, 1).
- readiness = round(100 × Σ section_weight × section score × factor). Snapshot weekly (ISO week).

## Streak & XP
- IST day boundary. +1 if last active = yesterday; same day → no change; missed exactly one day and freeze available this ISO week → freeze consumed, streak continues; else reset to 1. Track longest.
- XP: 10 per correct, +5 if correct and time < time_sec/2, +20 on drill completion.
