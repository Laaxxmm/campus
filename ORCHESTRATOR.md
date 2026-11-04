# LearnCrew Campus — Orchestrator Prompt v3 (4 Nov 2026) — Placement Readiness Coach
Covers: top-notch UI design system, hardened multi-tenant backend, test-every-feature QA gates, parallel cloud-session run.

## A. Parallel cloud session — do this once
1. Create an EMPTY GitHub repo `learncrew-campus` (no README). Open it in a Claude Code cloud session or Cursor cloud agent.
2. Paste EVERYTHING below the `=====` line as the first message. Never paste it again.
3. Create `.env.local` from `.env.example` (the agent writes it) with placeholders:
   `DATABASE_URL=` (local Docker Postgres first), `AUTH_SECRET=` (`openssl rand -base64 32`), `ANTHROPIC_API_KEY=`, `EMAIL_SERVER=`/`RESEND_API_KEY=`, `APP_URL=http://localhost:3000`.
4. Railway comes LATER (Phase 10): new project → Postgres plugin → deploy from GitHub → copy env vars.
5. Progress lives in `PROGRESS.md`. If the session pauses, type only `continue`. The agent never asks "what next" — it only pauses for secrets/logins.
6. Running in parallel with other sessions: each session works on its own branch `phase-N-*`, reads PROGRESS.md first, and never redoes a phase marked ✅ with green tests.

=====

# ROLE
You are the lead engineer + orchestrator for LearnCrew Campus: a B2B mobile-first PWA where colleges/TPOs pay per student; students do daily aptitude drills and real-feel mock tests (TCS NQT / Infosys / Accenture / MAT / PGCET-style sectional mocks); TPOs see readiness heatmaps. Stack (fixed): Next.js 15 App Router + TypeScript strict, Tailwind + shadcn/ui (re-themed), Drizzle ORM + Postgres (Railway), Auth.js v5, Zod, Vitest, Playwright, Anthropic Claude for question generation. NO native Android app in MVP (PWA only).

# OPERATING LOOP (every turn)
1. Read PROGRESS.md. Pick the first unchecked task of the current phase.
2. Implement → run `pnpm lint && pnpm typecheck && pnpm test` (+ `pnpm e2e` from Phase 4).
3. Fix until green. Never mark a task done with red tests or skipped tests.
4. Update PROGRESS.md (task ✅, test counts, decisions, log line). Commit `phase-N: <task>`.
5. Immediately continue to the next task. Do not ask the human for direction.
6. Pause ONLY for: missing secret, Railway/GitHub login, paid action. Write it under "Blocked" and stop.
7. Before starting any task, grep the repo/PROGRESS for existing work — reuse, never duplicate.

# PROGRESS.md format
```
# PROGRESS — LearnCrew Campus
Current phase: N — name | Last green: <timestamp> | Tests: unit X/X, e2e Y/Y
## Phase checklist (✅ only when phase QA gate green)
## Current phase tasks
## Feature test registry  (feature → test file → status)
## Decisions (ADR-lite)
## Blocked / needs human
## Log
```

# FAILURE RULES
- Same error 3×: write a 5-line root-cause note in PROGRESS, try a different approach.
- Never delete tests to pass. Never disable lint/type rules. Never commit secrets.

# MODEL USE
- Build/coding: Claude Sonnet (latest) in the session; Opus only for architecture review at Phase 0 and Phase 12; Haiku for insight phrasing + question verify; Sonnet for on-demand resume/LinkedIn drafts.
- Question generation: Sonnet batch (JSON schema enforced via Zod); Haiku for tagging/difficulty checks and explanation rewrites; 10% human review queue in admin.

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

# ARCHITECTURE & SECURITY (non-negotiable)
- Layers: `app/` (routes/UI) → `src/server/actions|api` (thin, validated) → `src/server/services` (business logic) → `src/db` (Drizzle). UI never imports db.
- Multi-tenant: every tenant table has `college_id`. All queries go through `scopedDb(session)` helper that injects `college_id` filter; lint rule/grep test fails CI if `db.select` used outside `src/db/scoped.ts` or admin service. Tests prove student A of college X cannot read college Y data (IDOR tests for every resource id route).
- Roles: student / tpo / admin (super). RBAC map in `src/server/rbac.ts`; `requireRole()` on every action/route; deny by default. TPO limited to own college; admin actions require re-auth within 15 min.
- Auth.js v5: email magic link + optional Google; database sessions; cookies httpOnly, Secure, SameSite=Lax, `__Host-` prefix in prod; session rotation on login; 30-day max, 7-day idle.
- CSRF: Auth.js tokens + Server Actions origin check; custom API routes verify Origin/Host + double-submit token.
- Rate limits (Postgres or Upstash token bucket): login 5/15min/IP+email, answer submit 120/min/user, AI gen admin-only 20/hr, CSV import 5/hr.
- Validation: Zod on every input (actions, route handlers, CSV rows, env via `src/env.ts` — app fails to boot on missing env). Output DTOs strip internal fields; correct answers never sent to client before submit.
- DB: Drizzle parameterised queries only; no `sql.raw` with user input; migrations versioned; least-privilege DB user in prod; indexes on (college_id, …).
- Secrets only in env; `.env*` gitignored; `.env.example` placeholders; gitleaks check in CI.
- Headers: CSP (nonce), HSTS, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy via middleware.
- Audit log table `audit_logs(id, actor_id, college_id, action, target_type, target_id, meta jsonb, ip, created_at)` written for every admin/TPO mutation (imports, role change, question publish, mock create, delete). Append-only; viewable in admin.
- Mock integrity: server-side start/end timestamps, scoring only on server, one active attempt per mock, tab-switch count logged.
- Privacy (DPDP Act): minimal PII, data export/delete for a student by admin, logs without PII.
- Observability: structured logs (pino), error boundary pages, `/api/health`.
- CI (GitHub Actions): lint, typecheck, unit, e2e (Postgres service), `pnpm audit --prod`, gitleaks.

# DATABASE SCHEMA (implement as `src/db/schema.ts` in Phase 0; generate migrations in Phase 1)
```ts
import { pgTable, pgEnum, uuid, text, integer, boolean, timestamp, date, jsonb, real, primaryKey, index, uniqueIndex, vector } from "drizzle-orm/pg-core";

export const role = pgEnum("role", ["student", "tpo", "admin", "content", "superadmin"]);
export const section = pgEnum("section", ["quant", "logical", "verbal", "coding"]);
export const qStatus = pgEnum("q_status", ["draft", "review", "golden", "retired"]);
export const qSource = pgEnum("q_source", ["seed", "llm_variant", "tpo"]);
export const plan = pgEnum("plan", ["pilot", "starter", "placement", "premium"]);

export const colleges = pgTable("colleges", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(), city: text("city"),
  plan: plan("plan").notNull().default("pilot"),
  seats: integer("seats").notNull().default(200),
  bankSeed: integer("bank_seed").notNull(),            // deterministic per-college subset shuffle
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const batches = pgTable("batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  collegeId: uuid("college_id").notNull().references(() => colleges.id),
  name: text("name").notNull(), gradYear: integer("grad_year"), branch: text("branch"),
  targetDriveDate: date("target_drive_date"), targetCompany: text("target_company"),
}, t => [index("batches_college_idx").on(t.collegeId)]);

export const users = pgTable("users", {             // Auth.js-compatible
  id: uuid("id").primaryKey().defaultRandom(),
  collegeId: uuid("college_id").references(() => colleges.id),
  batchId: uuid("batch_id").references(() => batches.id),
  role: role("role").notNull().default("student"),
  name: text("name"), email: text("email").notNull(),
  emailVerified: timestamp("email_verified"), image: text("image"),
  rollNo: text("roll_no"), consentAt: timestamp("consent_at"),   // DPDP consent
  xp: integer("xp").notNull().default(0),
  lastActiveAt: timestamp("last_active_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, t => [uniqueIndex("users_email_uq").on(t.email), index("users_college_idx").on(t.collegeId, t.role)]);
// + accounts, sessions, verificationTokens exactly per @auth/drizzle-adapter docs

export const questions = pgTable("questions", {
  id: text("id").primaryKey(),                        // e.g. Q-QNT-PCT-0001
  section: section("section").notNull(),
  topic: text("topic").notNull(), subtopic: text("subtopic").notNull(),
  stem: text("stem").notNull(),
  options: jsonb("options").$type<string[]>().notNull(),   // exactly 4
  answerIndex: integer("answer_index").notNull(),          // 0..3
  explanation: text("explanation").notNull(), shortcut: text("shortcut"),
  companyTags: text("company_tags").array().notNull().default([]),
  difficulty: integer("difficulty").notNull(),             // 1..5
  timeSec: integer("time_sec").notNull(),
  source: qSource("source").notNull(), seedId: text("seed_id"),
  status: qStatus("status").notNull().default("draft"),
  variantGroup: text("variant_group").notNull(), version: integer("version").notNull().default(1),
  embedding: vector("embedding", { dimensions: 512 }),
  correctRate7d: real("correct_rate_7d"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, t => [index("q_pick_idx").on(t.status, t.topic, t.difficulty)]);

export const collegeQuestionAccess = pgTable("college_question_access", {
  collegeId: uuid("college_id").notNull().references(() => colleges.id),
  questionId: text("question_id").notNull().references(() => questions.id),
}, t => [primaryKey({ columns: [t.collegeId, t.questionId] })]);

export const skills = pgTable("skills", {
  userId: uuid("user_id").notNull().references(() => users.id),
  topic: text("topic").notNull(),
  rating: real("rating").notNull().default(1200), band: integer("band").notNull().default(2),
  streakRight: integer("streak_right").notNull().default(0), streakWrong: integer("streak_wrong").notNull().default(0),
  bandChangedOn: date("band_changed_on"), updatedAt: timestamp("updated_at").defaultNow(),
}, t => [primaryKey({ columns: [t.userId, t.topic] })]);

export const drills = pgTable("drills", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  date: date("date").notNull(),                          // IST date
  questionIds: text("question_ids").array().notNull(),
  optionOrder: jsonb("option_order").$type<number[][]>().notNull(),  // per-student shuffle
  completedAt: timestamp("completed_at"), score: integer("score"),
}, t => [uniqueIndex("drills_user_date_uq").on(t.userId, t.date)]);

export const attempts = pgTable("attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: text("client_id").notNull(),                 // idempotent offline sync
  userId: uuid("user_id").notNull().references(() => users.id),
  questionId: text("question_id").notNull().references(() => questions.id),
  drillId: uuid("drill_id").references(() => drills.id),
  mockAttemptId: uuid("mock_attempt_id"),
  chosenIndex: integer("chosen_index"), correct: boolean("correct").notNull(),
  timeMs: integer("time_ms").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, t => [uniqueIndex("attempts_client_uq").on(t.userId, t.clientId), index("attempts_user_q_idx").on(t.userId, t.questionId)]);

export const reviewQueue = pgTable("review_queue", {     // spaced review 1/3/7 days
  userId: uuid("user_id").notNull().references(() => users.id),
  questionId: text("question_id").notNull().references(() => questions.id),
  dueOn: date("due_on").notNull(), stage: integer("stage").notNull().default(1),
}, t => [primaryKey({ columns: [t.userId, t.questionId] })]);

export const streaks = pgTable("streaks", {
  userId: uuid("user_id").primaryKey().references(() => users.id),
  current: integer("current").notNull().default(0), longest: integer("longest").notNull().default(0),
  lastActiveDate: date("last_active_date"), freezes: integer("freezes").notNull().default(1),
  freezeWeek: text("freeze_week"),
});

export const mocks = pgTable("mocks", {
  id: uuid("id").primaryKey().defaultRandom(),
  company: text("company").notNull(), title: text("title").notNull(),
  blueprint: jsonb("blueprint").notNull(),  // [{section, topic?, count, difficulty:[min,max], timeSec}]
  durationSec: integer("duration_sec").notNull(),
});
export const mockAttempts = pgTable("mock_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  mockId: uuid("mock_id").notNull().references(() => mocks.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  questionIds: text("question_ids").array().notNull(),
  score: integer("score"), sectionScores: jsonb("section_scores"),
  tabSwitches: integer("tab_switches").notNull().default(0),
  startedAt: timestamp("started_at").defaultNow().notNull(), endsAt: timestamp("ends_at").notNull(), endedAt: timestamp("ended_at"),
});

export const explanationsCache = pgTable("explanations_cache", {
  questionId: text("question_id").notNull().references(() => questions.id),
  wrongIndex: integer("wrong_index").notNull(),
  text: text("text").notNull(), model: text("model").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, t => [primaryKey({ columns: [t.questionId, t.wrongIndex] })]);

export const readinessSnapshots = pgTable("readiness_snapshots", {
  userId: uuid("user_id").notNull().references(() => users.id),
  company: text("company").notNull(), week: text("week").notNull(),   // ISO week "2026-W45"
  score: integer("score").notNull(), topicBreakdown: jsonb("topic_breakdown"),
}, t => [primaryKey({ columns: [t.userId, t.company, t.week] })]);

export const companyBlueprints = pgTable("company_blueprints", {
  company: text("company").primaryKey(),   // tcs_nqt, infosys, accenture, cognizant, wipro, capgemini
  sectionWeights: jsonb("section_weights").notNull(),  // {quant:0.35, logical:0.3, verbal:0.2, coding:0.15}
  topicWeights: jsonb("topic_weights"), notes: text("notes"),
});

export const events = pgTable("events", {   // lightweight analytics
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id"), collegeId: uuid("college_id"),
  name: text("name").notNull(), props: jsonb("props"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, t => [index("events_college_time_idx").on(t.collegeId, t.createdAt)]);

export const invites = pgTable("invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  collegeId: uuid("college_id").notNull(), email: text("email").notNull(),
  role: role("role").notNull(), sentAt: timestamp("sent_at"), acceptedAt: timestamp("accepted_at"),
});
```
**Authorization rule (replaces RLS):** every server query for tpo/admin goes through `scoped(user)` / `requireRole(user, roles)` in `src/lib/authz.ts` that injects `where college_id = user.collegeId`. `superadmin` (Lakshmanan) sees all. Write a test proving a TPO of college A cannot read college B.

**Question JSON (bank files `content/bank/*.json`, validated by Zod `src/lib/question-schema.ts`):**
```json
{"id":"Q-QNT-PCT-0001","section":"quant","topic":"percentages","subtopic":"successive_change","stem":"...","options":["0%","−4%","+4%","−2%"],"answer_index":1,"explanation":"≤80 words","shortcut":"a+b+ab/100","company_tags":["tcs_nqt","infosys"],"difficulty":3,"time_sec":60,"source":"seed","seed_id":null,"status":"golden","variant_group":"PCT-SUCC-01","version":1}
```

# PRODUCT PILLARS (v3 — Campus is a READINESS COACH; mocks are the measurement layer)
1. **Measure** — drills + real mocks (timer, palette, negative marks). Every attempt emits per-question events (topic, difficulty, time_ms, changed_answer, marked, correct).
2. **Diagnose (Insight engine)** — after EVERY drill/mock: topic/skill gaps, time leaks (Q > 1.5× target time, skipped-then-wrong), negative-mark patterns (guessing rate on low-confidence topics), accuracy-vs-speed quadrant, trend vs last 3 attempts. Output: "What's going wrong" (≤3 bullets) + "Focus this week" (3 topics with daily Q targets) + auto-generated next drill.
3. **Company crack-path** — student picks targets (TCS NQT, Infosys, Accenture, Wipro, Cognizant + 1 optional dream company). Per company: realistic bar (aptitude section cutoffs/time, coding/tech round expectation by branch: CSE/IT vs ECE/EEE vs Mech/Civil), round-by-round plan, technical MCQ + short concept drills tagged by role/stack (DBMS, OOP, OS, CN, SQL, Python/Java/C, DSA basics, branch core), HR/interview Qs with model-answer structure (STAR). Show "gap to bar" per round.
4. **Missing-skills checklist** — compare readiness profile + self-declared skills/projects vs curated company JD patterns (`content/companies/*.json`, versioned, sourced, dated). Each item: have / weak / missing + one concrete action + resource link. Be REALISTIC: label "required" vs "nice-to-have"; never promise selection.
5. **Resume + LinkedIn coach** — from readiness profile: which projects to highlight, keywords matching target company JD, weak sections (no metrics, no summary, skills list without evidence), headline/About suggestions. Templates first (deterministic, free); Claude Sonnet drafts only on explicit "Draft for me" click (rate-limited, per-student monthly quota, batch/offline for cohorts). Student copies text manually — **NEVER auto-post or connect to LinkedIn APIs**; no scraping of profiles. Resume upload: PDF → text server-side, store text only if consented, delete file after parse.
6. **TPO cohort view** — cohort weak topics, interview-ready % (composite: aptitude ≥ company bar + tech concept score + resume checklist ≥80% + ≥1 mock interview-style set), per-company readiness funnel, not just mock scores. Actionable: "assign drill pack to 42 students weak in Time & Work".

## Readiness score (deterministic, explainable — no black box)
`readiness(company) = 0.40·aptitude_vs_cutoff + 0.30·tech_concepts + 0.15·consistency(streak/attempts) + 0.15·profile(resume+LI checklist)`; each component 0–100 with "why" breakdown shown in UI. Weights in config, unit-tested.

## Insight engine rules
- Pure TS rules in `src/lib/insights/*` compute facts from attempt events (deterministic, tested). Claude Haiku only rephrases facts into friendly text (input = computed JSON, no PII); fallback template if LLM fails. Cache per attempt.
- Never show insight claims not backed by ≥5 attempts on that topic ("not enough data yet").

## Extra schema (add to src/db/schema.ts in Phase 0)
`target_companies(student_id, company_key, is_dream, created_at)`, `company_profiles(key, name, version, rounds jsonb, cutoffs jsonb, branch_expectations jsonb, jd_skills jsonb, sources jsonb, updated_at)`, `skill_tags(id, key, kind: aptitude|tech|soft, branch)`, `student_skills(student_id, skill_key, status: have|weak|missing, evidence, updated_at)`, `attempt_insights(attempt_id, facts jsonb, text, model, created_at)`, `weekly_focus(student_id, week_start, topics jsonb, daily_targets jsonb)`, `profile_reviews(student_id, kind: resume|linkedin, checklist jsonb, draft_text, model, consent bool, created_at)`, `readiness_snapshots(student_id, company_key, score, breakdown jsonb, taken_at)`. All tenant-scoped via college_id through student; same IDOR tests.

## Extra security
LLM prompt-injection guard on resume text (treat as data, strip instructions, output schema-validated by Zod); PII minimisation (no phone/address sent to Claude); DPDP consent screen before resume upload; per-user LLM quotas; drafts never visible to TPO unless student shares.

## Navigation additions
Student tabs: Today · Practice · Mocks · **Insights** · **Companies** · **Profile coach**. Result screen of every drill/mock ends with Insight card + "Start focus drill" CTA. TPO: Overview (interview-ready %) · Weak topics · Companies funnel · Students · Mocks.

# PHASES (each ends with its QA gate — phase is ✅ only when gate green). Insights are built WITH measurement, not after ship.
### Phase 0 — Design system + architecture docs
`docs/DESIGN.md`, `docs/ARCHITECTURE.md`, `docs/SECURITY.md` (IDOR, CSRF, brute force, answer leakage, cheating, prompt injection, PII), `docs/PRODUCT.md` (6 pillars, readiness formula). Gate: docs exist, tokens compile, schema incl. coach tables typechecks.
### Phase 1 — Scaffold
Next.js, Tailwind tokens, shadcn re-themed, Drizzle, env.ts, Vitest, Playwright, CI, security headers, `/dev/ui`. Gate: CI green, header test.
### Phase 2 — Auth + roles + tenancy
Auth.js, RBAC, scopedDb, rate limiter, audit logger, consent records. Gate: RBAC matrix, IDOR, rate-limit, cookie flags tests.
### Phase 3 — Content: question bank + tech concept bank + company profiles
Aptitude pipeline (Claude gen → Haiku verify → dedupe → review → publish), seed 600 aptitude Q. Tech concept bank: 300 MCQ + 100 short-concept cards tagged skill/role/branch (DBMS, OOP, OS, CN, SQL, DSA basics, langs, ECE/Mech core). `content/companies/{tcs,infosys,accenture,wipro,cognizant}.json` with rounds, cutoffs (marked "approx, source + date"), branch expectations, jd_skills; Zod-validated. Gate: schema tests, verifier fixtures, seed counts, every company file has sources.
### Phase 4 — Drill + attempt events + streak + PWA
Every answer logs event (time_ms, changed, marked). Gate: e2e login → drill 10 Q → events stored → streak → offline shell; axe pass.
### Phase 5 — Real mocks + Insight engine v1
Mock UX, autosave/resume, server timing, scoring, negative marks, review mode; insight rules (gaps, time leaks, negative-mark pattern, trend), result Insight card, Focus-this-week + auto focus drill. Gate: e2e full mock incl refresh/autosubmit/leak test; unit tests per insight rule with fixtures; "not enough data" path tested; LLM-down fallback test.
### Phase 6 — Company crack-path + missing-skills checklist
Target picker (5 + dream), per-company bar vs student, round plan, tech MCQ/concept drills by role/stack, HR question cards, skills checklist have/weak/missing with actions. Readiness score with breakdown. Gate: readiness formula unit tests, e2e pick company → see gap → start tech drill → checklist updates.
### Phase 7 — Resume + LinkedIn coach
Consent → resume PDF parse → checklist (sections, metrics, keywords vs target JD), LinkedIn checklist (headline, About, skills, featured projects) from self-entered fields; templates; "Draft for me" Sonnet with quota; copy buttons; no LinkedIn integration. Gate: prompt-injection fixture test, Zod output test, quota test, file deleted after parse test, TPO cannot see unshared drafts.
### Phase 8 — TPO dashboard (coach view)
Cohort weak topics heatmap, interview-ready % per company funnel, student drilldown (insights + checklist, not drafts), assign focus pack to segment, schedule mock, CSV export. Gate: e2e TPO flows; cross-college blocked.
### Phase 9 — Admin
Colleges, CSV import, question/tech/company-profile review queues, LLM usage/quota view, audit log. Gate: bad-rows import test, audit asserted.
### Phase 10 — Railway deploy
Dockerfile/nixpacks, `railway.json`, migrations, health check, env list. Pause for Railway login only. Gate: `/api/health` 200, prod smoke e2e.
### Phase 11 — Pilot hardening
Lighthouse ≥90/95, k6 200 concurrent mock-takers, backups, error pages, LLM cost report (₹/student/month). Gate: reports in `docs/reports/`.
### Phase 12 — Final QA matrix (blocks DONE)
`docs/QA_MATRIX.md`, run every row:
| Area | Route/API | student | tpo | admin | anon | Test |
|---|---|---|---|---|---|---|
| Landing/login | /, /login | ✓ | ✓ | ✓ | ✓ | e2e auth |
| Today/drill | /app/today | ✓ | ✗ | ✗ | redirect | e2e drill, events, rate-limit |
| Mocks take/result/review | /app/mocks/* | ✓ own | ✗ | ✗ | redirect | e2e mock, resume, autosubmit, leak |
| Insights + focus | /app/insights | ✓ own | ✗ | ✗ | redirect | e2e + rule unit tests |
| Companies crack-path | /app/companies/* | ✓ own | ✗ | ✗ | redirect | e2e + readiness tests |
| Skills checklist | /app/companies/[k]/skills | ✓ own | ✗ | ✗ | redirect | e2e |
| Profile coach | /app/profile-coach | ✓ own | ✗ | ✗ | redirect | consent, injection, quota, deletion |
| TPO overview/weak topics/funnel | /tpo | ✗ | ✓ own college | ✓ | redirect | e2e + IDOR |
| TPO students/assign/export | /tpo/* | ✗ | ✓ own | ✓ | redirect | e2e + CSV + no-draft-leak |
| Admin | /admin/* | ✗ | ✗ | ✓ (re-auth) | redirect | e2e + audit |
| Health | /api/health | ✓ | ✓ | ✓ | ✓ | unit |
Plus CSRF, headers, cookies, gitleaks, pnpm audit, axe, Lighthouse, 360px screenshots in `docs/screens/`. Any red: fix, rerun full matrix.

# DEFINITION OF DONE
All phases ✅, Phase 12 matrix fully green, deployed on Railway, README with run/deploy/env, demo accounts (student/tpo/admin) seeded for one pilot college. Then write "DONE" in PROGRESS with the prod URL and stop.

# START NOW
If PROGRESS.md missing: create it and begin Phase 0. Otherwise resume from it. Do not ask what to do next.
