# LearnCrew Campus — Orchestrator Prompt (v1, 4 Nov 2026)

## How to run this in Claude (read first, then paste everything below the line)
1. **Best: Claude Code** (terminal). `npm i -g @anthropic-ai/claude-code` → `mkdir learncrew-campus && cd learncrew-campus && git init` → `claude`. Use model **Sonnet** for building (switch to **Opus** via `/model` only for Phase 0 design and any blocked debugging). Paste everything below the `=====` line as your first message. When it pauses, just reply `continue` — it reads `PROGRESS.md` and picks the next step itself.
   - Optional: allow autonomous runs with `claude --permission-mode acceptEdits` (still asks before shell commands) — or approve commands as they come.
   - Context fills up? Run `/compact` or start a fresh `claude` session and say: `Resume per ORCHESTRATOR.md and PROGRESS.md`.
2. **Claude Projects (web)**: create Project "LearnCrew Campus", upload this file + `learncrew-campus-product-pack.md` as knowledge, paste the prompt in chat. It outputs files per phase; you copy them into the repo and paste back command output. Slower — prefer Claude Code.
3. Keep handy (it will ask once, at the right phase): `ANTHROPIC_API_KEY`, `AUTH_RESEND_KEY` (resend.com), Railway account + GitHub repo, domain (optional).
4. Budget: Railway ~$10–12/mo pilot + Anthropic ~$30 one-time bank build, inside the $250 credit. Drills never call an LLM at runtime.

=====================================================================

# ROLE
You are the **LearnCrew Campus Build Orchestrator**. You own this repository until the Definition of Done (DoD) at the bottom is fully checked. You plan, write code, run commands, test, fix, and track progress yourself. The human (Lakshmanan) is the product owner; he does NOT feed you step prompts.

**Product**: B2B placement-aptitude practice for Indian colleges. The college/TPO pays (₹200–500/student/yr). Students (Android-heavy, poor campus Wi-Fi) do a 10-question daily drill with streaks/XP; TPOs see readiness per company (TCS NQT, Infosys, Accenture, Cognizant, Wipro, Capgemini), heatmaps, at-risk lists, CSV export. **NOT** a consumer Duolingo app: no public signup, no payments in-app, no native Android (PWA / mobile-web only), no video, no coding judge, no WhatsApp bot (phase 2).

**Locked stack** (do not substitute without logging a decision): Next.js 15 App Router + TypeScript (strict) + Tailwind + shadcn/ui · Auth.js v5 (email magic link via Resend; Drizzle adapter) · Drizzle ORM + drizzle-kit on Postgres 16 + pgvector · Zod · Vitest + Playwright · Railway (services `web`, `postgres`, `cron`; region Singapore) · Docker (Next standalone) · Anthropic SDK (`@anthropic-ai/sdk`) for offline content pipeline only.

# OPERATING LOOP (follow on EVERY turn)
1. **Re-read `PROGRESS.md`** (create it in Phase 0 if missing) and `ORCHESTRATOR.md` (save this whole prompt there in Phase 0 so you can always reload it).
2. Pick the **first phase whose status ≠ `done`**. Within it, pick the first unchecked task.
3. Do the work: create/edit files, run commands, run the phase's acceptance checks.
4. If checks pass → mark tasks/phase `done`, write a short log entry, `git add -A && git commit -m "phase N: <summary>"`, then **immediately continue to the next phase in the same turn** if context allows.
5. If checks fail → apply the Failure/Retry rules.
6. End each turn with a 3-line status: `Phase X/9 · done: … · next: …` (and what you need from the human, if anything).

**Never** ask the human "what next?" or for the next prompt. **Only stop** for: (a) a secret/credential you cannot create (API keys, Railway login, Resend domain verification), (b) a genuinely blocked product decision not answered in this prompt — then propose a default, log it under `Blocked`, and keep working on anything not dependent on it, (c) DoD complete. If the human says `continue`, resume the loop.

# PROGRESS PROTOCOL — `PROGRESS.md` format (keep it exactly like this)
```md
# PROGRESS — LearnCrew Campus
Current phase: 3
Last updated: <ISO datetime> · Loop count this phase: 1/5

| # | Phase | Status | Commit |
|---|-------|--------|--------|
| 0 | Design system + schema | done | abc123 |
| 1 | Scaffold | done | ... |
| 2 | Auth + roles | done | ... |
| 3 | Question bank + seed | in_progress | |
| 4 | Student drill + streak | todo | |
| 5 | Adaptive engine + mocks | todo | |
| 6 | TPO dashboard | todo | |
| 7 | Admin CSV + content review | todo | |
| 8 | Railway deploy config | todo | |
| 9 | Smoke tests + pilot hardening | todo | |

## Current phase tasks
- [x] ...
- [ ] ...

## Decisions (ADR-lite)
- D1 <date>: <decision> — <why>

## Blocked / needs human
- [ ] ANTHROPIC_API_KEY in .env.local (needed for scripts/generate.ts; phase 3 continues with seed-only bank meanwhile)

## Log
- <datetime> phase 2 done: magic link works locally via Resend test mode; 14 tests green.
```
Statuses: `todo | in_progress | blocked | done`. Update the file after every phase AND whenever you stop.

# FAILURE / RETRY RULES
- Each acceptance check: up to **3 fix attempts** per distinct error. Read the full error, fix the root cause (no `@ts-ignore`, no skipping tests, no deleting failing tests to go green).
- Max **5 loops per phase** (a loop = implement → check). After 5, mark `blocked`, log the exact error + what you tried + 2 options, then move to the next phase that does not depend on it.
- If the same error repeats twice after a fix, step back: re-read the relevant docs (Next.js/Auth.js/Drizzle/Railway versions in package.json) before editing again.
- Never run destructive commands (`rm -rf` outside the repo, `git push --force`, dropping prod DB). Migrations are forward-only via drizzle-kit.
- Keep commits small per phase; if a phase breaks earlier ones, `git diff` against last good commit and fix forward.
- Context hygiene: don't paste huge files back; summarise in PROGRESS.md so a fresh session can resume.

# MODEL USE
**For building (you, in Claude Code):** Sonnet by default. Opus only for Phase 0 design and when a phase is `blocked`. Haiku is fine for bulk boilerplate (tests, fixtures) if the human switches.

**Inside the product (runtime/pipeline):**
| Job | Model | When |
|---|---|---|
| Taxonomy + company blueprints + seeds | `claude-opus-4-5` (or latest Opus) | once, offline script |
| Bulk MCQ variants | `claude-haiku-4-5` via **Message Batches** (50% off) | offline `scripts/generate.ts` |
| QA / answer verification | `claude-sonnet-4-5` | offline `scripts/qa.ts` |
| "Explain more" on a wrong answer | Haiku, **cached** in `explanations_cache` per (question_id, wrong_index) | on demand only, server-side, rate-limited |
| Weekly TPO narrative | Sonnet, aggregated stats only, **no PII** | Monday cron |
| Grading, adaptive difficulty, streaks, readiness | **Plain code — never an LLM** | always |
Rules: model IDs come from env (`ANTHROPIC_MODEL_FAST`, `ANTHROPIC_MODEL_SMART`); verify current IDs at docs.anthropic.com before coding. System prompt + style guide in a cached prefix (`cache_control: {type:"ephemeral"}`). Never call Anthropic from the client. Explanations are **pre-generated into the bank** so 80%+ of drill traffic costs $0. The app must fully work with `ANTHROPIC_API_KEY` unset (Explain-more hidden, bank from seed JSON).

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

# PHASES (autoload in order)

### Phase 0 — Design system + schema docs
- **Goal**: lock decisions before code.
- **Files**: `ORCHESTRATOR.md` (this prompt verbatim), `PROGRESS.md`, `docs/PRODUCT.md` (brief, personas, MVP scope, out of scope, metrics), `docs/schema.md` (schema above + ER notes), `docs/design.md` (tokens, routes, components, layouts above), `docs/adaptive.md` (rules below), `docs/decisions.md`.
- **Acceptance**: all files exist; PROGRESS.md has the 10-phase table; schema in docs matches section above.
- **Advance**: immediately.

### Phase 1 — Scaffold
- **Goal**: running app + DB locally.
- **Do**: `npx create-next-app@latest . --ts --tailwind --app --src-dir --eslint --use-npm`; add shadcn/ui, drizzle-orm, drizzle-kit, postgres (`postgres` driver), zod, @auth/drizzle-adapter, next-auth@beta, resend, @anthropic-ai/sdk, vitest, @playwright/test. `next.config.ts`: `output: "standalone"`. `docker-compose.yml` with `pgvector/pgvector:pg16` (port 5432) . `src/db/schema.ts`, `src/db/index.ts`, `drizzle.config.ts`, migration `0000` incl. `CREATE EXTENSION IF NOT EXISTS vector;`. Scripts: `dev, build, start, lint, typecheck, test, e2e, db:generate, db:migrate, db:seed, db:studio`. `.env.example` (env list below). `/api/health` returns `{ok:true, db:true}` after `select 1`. Tokens + `AppShell` + `TpoShell` skeletons.
- **Acceptance**: `docker compose up -d && npm run db:migrate` OK; `npm run typecheck && npm run lint && npm run build` pass; `curl localhost:3000/api/health` → ok; 1 vitest passes.
- **Advance**: when all green.

### Phase 2 — Auth + roles
- **Goal**: invite-only magic-link login, role-based routing.
- **Files**: `src/auth.ts` (Auth.js v5, Resend provider, Drizzle adapter, database sessions, `signIn` callback rejects emails not in `users`/`invites`), `src/middleware.ts` (protect `/today|/drill|/mocks|/progress|/leaderboard` = student; `/tpo` = tpo/admin; `/admin` = admin/tpo; `/content` = content; `/super` = superadmin), `src/lib/authz.ts` (`requireUser`, `requireRole`, `scoped`), `/login`, `/onboarding` with DPDP consent. Dev fallback: if `AUTH_RESEND_KEY` empty, log magic link to console.
- **Acceptance**: unit tests for `requireRole` + cross-college isolation; Playwright: seeded student logs in via console link → lands `/onboarding` → `/today`; TPO lands `/tpo`; student hitting `/tpo` → 403/redirect.
- **Stop-for-secret**: `AUTH_RESEND_KEY` only needed for real email — keep going with console fallback, log in Blocked.

### Phase 3 — Question bank JSON + seed
- **Goal**: ≥120 golden questions committed now (enough to demo), pipeline ready to scale to 2,000.
- **Files**: `src/lib/question-schema.ts` (Zod + validators: 4 unique options, answer 0–3, explanation ≤80 words, difficulty 1–5, time_sec 20–180); `content/taxonomy.json` (sections → topics → subtopics from the pack: quant 18 topics, logical 11, verbal 7, coding 6); `content/blueprints.json` (6 companies, section weights); `content/bank/*.json` — **you author ≥120 original questions yourself** (≥5 per major topic, bands 1–5, include the 12 samples from the pack), status `golden`; `prompts/system.md`, `prompts/variant.md`, `prompts/qa.md`, `prompts/seed.md` (copy from pack, below); `scripts/validate-bank.ts`; `scripts/seed.ts` (demo college "Demo Engineering College, Chennai", 2 batches, 1 tpo, 1 admin, 40 students, superadmin `lakshmanan@…` from env `SUPERADMIN_EMAIL`, all golden questions, college_question_access = deterministic 60% subset per college via `bank_seed`, 3 mocks, 3 weeks of synthetic attempts so dashboards aren't empty); `scripts/generate.ts` (Haiku Message Batches per seed → Zod validate → write `content/drafts/`), `scripts/qa.ts` (Sonnet solves blind; mismatch/ambiguous → `review`), `scripts/quant-check.ts` (re-solve numeric quant with a small evaluator where templated), `scripts/dedupe.ts` (optional embeddings; fallback: normalized-stem trigram similarity >0.92 → drop).
- **Acceptance**: `npm run bank:validate` 0 errors; `npm run db:seed` idempotent (run twice, same counts); `generate.ts --dry-run` prints batch request JSON without calling API.
- **Stop-for-secret**: real generation needs `ANTHROPIC_API_KEY` — log in Blocked, continue phases 4+.
- **Pack prompts to include verbatim**: system (content engine rules: ORIGINAL only, Indian context, 4 options/1 correct, explanation ≤80 words + shortcut, strict JSON, difficulty 1–5, tags, `needs_review`), variant (10 variants per seed: 3 at band, 4 at band, 3 at band+1 cap 5; `source=llm_variant`, `status=draft`), QA (solve blind ≤60 words → `{id,my_answer_index,matches,ambiguous,issues,fixed_explanation}`), seed (5 seeds bands 1–5 per subtopic mirroring company patterns + 2-line emphasis note).

### Phase 4 — Student drill + streak (PWA)
- **Goal**: the daily habit loop.
- **Files**: `/today`, `/drill/[drillId]`, `/drill/[drillId]/done`, `src/lib/drill.ts` (get-or-create today's drill by IST date; until Phase 5 use random-by-band), `src/lib/streak.ts` (IST day boundary; +1 if last_active = yesterday; 1 freeze/ISO week auto-used on a single missed day; reset otherwise; longest), XP (10/correct, +5 speed bonus if < time_sec/2, +20 drill completion), server action `submitAttempt` (grade in code using stored option_order; never send `answer_index` to client before answer), `/api/sync` (batch, idempotent by client_id), service worker + IndexedDB queue, `OfflineBanner`, `/leaderboard`, `/progress` basic.
- **Acceptance**: vitest for streak edge cases (midnight IST, freeze, double-submit) and grading with shuffled options; Playwright on 360×740: login → today → answer 10 → done shows score + streak 1; offline mode (Playwright `context.setOffline(true)`) answer 3 → online → attempts synced exactly once; Lighthouse PWA installable; `/today` JS ≤150 KB (check build output).

### Phase 5 — Adaptive engine + mocks
- **Goal**: right difficulty per student; company mocks.
- **Rules** (`src/lib/adaptive.ts`, pure functions, 100% unit-tested):
  - Skill per user×topic, Elo start 1200; question rating by band 1=900, 2=1050, 3=1200, 4=1350, 5=1500; K=24; time factor: correct but > time_sec → count 0.75.
  - Band moves: 3 correct in a row in a topic → +1; 2 wrong in a row → −1; max one band change per topic per day; clamp 1–5.
  - Drill of 10: 6 at skill band (weakest topics weighted by target company's weights), 2 at band+1, 2 spaced review from `review_queue` due ≤ today (stages 1/3/7 days; correct → next stage, wrong → stage 1); fill from band if review short. Only questions in `college_question_access`, status `golden`, not seen in last 14 days. Options shuffled per student.
  - Readiness 0–100 per company = Σ section_weight × topic mastery (sigmoid of rating) × accuracy-time factor; snapshot weekly.
- **Cron**: `/api/cron/build-drills` (Bearer `CRON_SECRET`) builds tomorrow's drills for active students; `scripts/cron.ts` entry calling it (Railway cron `30 23 * * *` UTC = 05:00 IST); `/api/cron/weekly` Monday: readiness snapshots + retire leaked questions (correct-rate jump >85% in a week) + TPO report.
- **Mocks**: `/mocks` list from `mocks` table; start creates `mock_attempts` with server `ends_at`; submissions after `ends_at` rejected; tab-switch count via `visibilitychange`; section-wise result.
- **Acceptance**: adaptive unit tests (band up/down, daily clamp, composition 6/2/2, no repeats in 14 days, college subset respected); mock timer test; cron route 401 without secret.

### Phase 6 — TPO dashboard
- **Goal**: the thing the college pays for.
- **Files**: `/tpo` KPIs (weekly active %, median streak, avg readiness for target company, at-risk count, drills completed this week), `/tpo/heatmap` (topic × batch and topic × student; company filter; token heatmap scale), `/tpo/students` (DataTable + CSV export via route handler streaming CSV), `/tpo/students/[id]`, `/tpo/at-risk` (no activity ≥5 days OR readiness <40; "Copy WhatsApp nudge" template text), `/tpo/reports` (weekly; Sonnet narrative from **aggregated numbers only, no names/emails**; if no API key → templated narrative; print CSS for PDF). All queries via `scoped()`; SQL aggregates, not N+1.
- **Acceptance**: with seed data every page renders non-empty; cross-college isolation e2e (TPO A cannot open student of college B by URL → 404); CSV opens in Excel with correct headers; dashboard p95 < 800 ms locally on 500 seeded students (add `scripts/seed.ts --students 500`).

### Phase 7 — Admin CSV + content review
- **Files**: `/admin/import` (CsvDropzone → parse with papaparse → preview with row errors: bad email, duplicate roll, unknown batch → confirm → upsert users + create batches if `--create-batches` toggle → send invites via Resend (or console)); `/admin/batches` (drive date, target company); `/admin/college` (seats used/limit; block import over seats); `/content/review` (filter by status/topic/flag, side-by-side QA result, approve → golden, edit, retire); `/super` (create college + first TPO invite, usage counts).
- **Acceptance**: import of `fixtures/roster-200.csv` (generate it) → 200 users, re-import → 0 duplicates; malformed rows reported not crashed; seat limit enforced; review approve changes status and appears in next drill build.

### Phase 8 — Railway deploy config
- **Files**: `Dockerfile` (below), `.dockerignore`, `railway.json` (`{"$schema":"https://railway.com/railway.schema.json","build":{"builder":"DOCKERFILE"},"deploy":{"preDeployCommand":"npm run db:migrate","healthcheckPath":"/api/health","restartPolicyType":"ON_FAILURE"}}`), `scripts/cron.ts` compiled/run for the `cron` service, `docs/DEPLOY.md` (exact steps below), `docker-compose.prod.yml` for "run on another system" (web + pgvector + cloudflared note).
- **Dockerfile** (keep migrations available; include drizzle-kit/migrate script in runtime or use a small `scripts/migrate.ts` with `drizzle-orm/postgres-js/migrator`):
```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/drizzle ./drizzle
EXPOSE 3000
CMD ["node","server.js"]
```
- **Env** (`.env.example`; Railway variable references):
```
DATABASE_URL=${{postgres.DATABASE_URL}}
AUTH_SECRET=                      # openssl rand -base64 32
AUTH_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
AUTH_RESEND_KEY=
EMAIL_FROM=LearnCrew <no-reply@yourdomain.in>
ANTHROPIC_API_KEY=                # optional at runtime; required for scripts/generate.ts
ANTHROPIC_MODEL_FAST=claude-haiku-4-5
ANTHROPIC_MODEL_SMART=claude-sonnet-4-5
VOYAGE_API_KEY=                   # optional
APP_BASE_URL=https://app.yourdomain.in
CRON_SECRET=
SUPERADMIN_EMAIL=
REDIS_URL=                        # optional, skip until >1,000 actives
NODE_ENV=production
```
- **DEPLOY.md steps**: `npm i -g @railway/cli` → `railway login` → `railway init` (project `learncrew-campus`, region Singapore) → add Postgres (pgvector template) → add `web` from GitHub repo → set vars → generate domain / CNAME `app.yourdomain.in` → push `main` (pre-deploy migrates, healthcheck gates) → `railway run npm run db:seed` → add `cron` service (same repo, start `node dist/cron.js` or `npx tsx scripts/cron.ts`, schedule `30 23 * * *`) and second Monday cron `0 1 * * 1` → set usage alert $15/mo → staging env.
- **Acceptance**: `docker build -t learncrew . && docker run --env-file .env.local -p 3000:3000 learncrew` → `/api/health` ok against local DB; `railway.json` valid JSON. **Stop-for-human**: actual `railway login`/deploy needs Lakshmanan — print the exact commands and wait only for this step.

### Phase 9 — Smoke tests + pilot hardening
- **Do**: Playwright smoke suite `e2e/smoke.spec.ts` runnable against `BASE_URL` (local or Railway): health, login (console/test mailbox), drill end-to-end, TPO dashboard loads, CSV export, cross-college 404. k6 or autocannon script: 500 virtual students doing a drill in 10 min, p95 < 500 ms on `/api/sync`. Rate limit `/api/explain` (5/min/user, in-DB or Redis). Privacy page + DPDP consent text + data-deletion request route. Error boundary + `events` analytics (drill_started, drill_completed, explain_more, tpo_export). Demo script `docs/DEMO.md` (TPO 5-min walkthrough). README with local run in 5 commands.
- **Acceptance**: all unit + e2e green locally; smoke green against deployed URL (or marked Blocked pending deploy); load test result logged in PROGRESS.md.

# DEFINITION OF DONE
- [ ] `npm run typecheck && npm run lint && npm test && npm run e2e && npm run build` all green on a clean clone.
- [ ] `docker compose up -d && npm run db:migrate && npm run db:seed && npm run dev` gives a working demo college in ≤5 commands (README).
- [ ] Student on a 360px phone: magic-link login → consent → daily 10-Q drill (offline-tolerant) → streak/XP/leaderboard/progress; installable PWA.
- [ ] Adaptive engine (Elo, 6/2/2, spaced review, band rules) unit-tested; nightly cron builds drills.
- [ ] 6 company mocks with server-side timer and section scores.
- [ ] TPO: KPIs, heatmap, students table, at-risk with WhatsApp nudge text, CSV export, weekly report; strict college isolation tested.
- [ ] Admin: roster CSV import with preview/errors/seat limit; invites; content review queue; superadmin college creation.
- [ ] Bank: ≥120 golden original questions committed, validator green; generate/QA/dedupe scripts work (`--dry-run` without key, real with key) toward 2,000.
- [ ] Zero LLM calls in the drill path; Explain-more cached and rate-limited; app works with no Anthropic key.
- [ ] Dockerfile + railway.json + DEPLOY.md; deployed to Railway Singapore with healthcheck + cron (or exact commands handed to human).
- [ ] Smoke + load results logged; DPDP privacy page; PROGRESS.md shows all phases `done`.
- [ ] Final message to human: live URL (or local), demo logins, what's next (generate full bank with key, pilot college onboarding, phase-2 WhatsApp/SSO).

# START NOW
Begin Phase 0. Create `ORCHESTRATOR.md` with this full prompt, create `PROGRESS.md`, then proceed through phases without waiting for further instructions.
