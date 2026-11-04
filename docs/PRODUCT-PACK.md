# Product pack (extracted text of LearnCrew_Campus___Product_Pack.pdf, 9 pages)

> Machine-extracted; tables flattened. Source PDF supplied by the product owner on 2026-11-04.


---
<!-- page 1 -->
LearnCrew Campus — Product Pack
Everything to build and pilot LearnCrew Campus on Railway: B2B daily aptitude streaks for
college TPOs, the Claude model stack and costs, question bank method, app architecture,
a 6-week build plan and pilot pricing.
On this page
Product brief
Claude model stack
Cost calculator
Question bank
Sample questions
App architecture
Deploy
Budget for $250
6-week build
Pilot and pricing
Full pack as a file
Every prompt, schema, env var and SQL sketch is in /workspace/learncrew-campus-
product-pack.md on the box. This Page is the overview.
Build it with Claude Code
Paste /workspace/learncrew-campus-orchestrator.md (v2) once into a Claude
Code or Cursor cloud session on an empty repo. v2 adds a design system inspired
by learncrew.org (navy and amber tokens, Inter, a real mock-test UX with timer,
question palette and review mode), hardened multi-tenant security (Auth.js, CSRF,
rate limits, Zod, Drizzle, audit log, RBAC), a QA gate after every phase, and a final
Phase 10 QA matrix that has to pass before the build counts as done. It tracks its
own progress in PROGRESS.md and only pauses when it needs secrets or a Railway
login.
Product brief
Student JTBD Placement-ready in 10 min/day on a phone, on weak Wi-Fi
TPO JTBD Know who is ready for next month's TCS/Infosys drive and who needs a push
Admin JTBD Prove placement-prep ROI to management and NAAC
Buyer College pays ₹200–500 per student per year
P TCS NQT I f A C i Wi C i i


---
<!-- page 2 -->
Patterns TCS NQT, Infosys, Accenture, Cognizant, Wipro, Capgemini
MVP (4–6 weeks) Out of scope
Email OTP login, CSV roster import Native apps, Play Store
Daily 10-Q drill, offline PWA Video lessons
Streaks, XP, batch leaderboard Coding IDE / judge
Adaptive difficulty 1–5 WhatsApp bot (phase 2)
Company-pattern timed mocks In-app payments
TPO readiness heatmap + at-risk list Consumer signup
1,500–2,000 vetted questions College SSO (phase 2)
Weekly active students ≥ 60%
Median streak ≥ 5 days
Day-30 retention ≥ 40%
Readiness gain over pilot ≥ 10 pts
Paid conversion 1 college
Claude model stack
Job Model Why
Curriculum + company
blueprints (once)
Opus (claude-opus-4-5) Best reasoning; about $5 total
Bulk MCQ variants Haiku (claude-haiku-4-5) +
Batches
Cheap, fast, 50% batch
discount
Answer-key QA Sonnet (claude-sonnet-4-5) Solves independently, flags bad
keys
Explain more (student) Haiku, cached per question Pennies, reused across students
Weekly TPO narrative Sonnet Quality where the buyer looks
Adaptive difficulty,
grading
Plain code (Elo) Free and deterministic


---
<!-- page 3 -->
Dedupe / clustering Voyage voyage-3-lite +
pgvector
Drop near-duplicates
Indicative prices per 1M tokens: Haiku $1 in / $5 out, Sonnet $3 / $15, Opus $5 / $25;
cached reads about 10% of input. Confirm IDs at docs.anthropic.com/en/docs/about-
claude/models before coding.
1. Pre-write explanations into the bank so most traffic uses no model.
2. Cache each Explain-more answer by question and wrong option.
3. Put system prompt, style guide and taxonomy in a cached prefix.
4. Run all generation through the Message Batches API.
5. Never call the API from the browser; queue with retry and backoff.
Cost calculator
Students
500
% who tap Explain more daily
20
Estimate; 22 drill days a month, half of Explain-more hits served from cache
$2.37
Runtime per month
1100 model calls
$99
If model explains every miss
what to avoid
$30
One-time bank build
2,000 golden questions
Question bank
Section Topics
Quant Number system, %, P&L, SI/CI, ratio, time-work, TSD,
P&C, probability, DI
Logical Coding-decoding, blood relations, seating,
syllogism, puzzles, series, cubes
Verbal RC, error spotting, para-jumbles, sentence
completion, vocab
Coding MCQ Output prediction, pseudocode, complexity, DS
basics, SQL


---
<!-- page 4 -->
bas cs, SQ
Company tags tcs_nqt, infosys, accenture, cognizant, wipro,
capgemini
1 Opus designs taxonomy + blueprints
Once, per company section weights
2 Seed per subtopic × band
You or the TPO write one
3 Haiku batch: 10 variants per seed
About 2,700 drafts
4 Code validators
4 options, one answer, Python re-solve for quant
5 Sonnet QA
Solves blind; mismatches go to review
6 Embedding dedupe
Cosine above 0.92 dropped
7 Human spot-check
10%, plus all band-5; then golden
Adaptive rule: Elo per student × topic. Daily drill is 6 at band, 2 one band up, 2 spaced
reviews (1/3/7 days). Three right in a row moves up a band; two wrong moves down; at
most one band per day.
Anti-leak: each college sees a seeded 60% subset, options shuffle per student, numbers
templated per variant, a college-specific wording marker in explanations, and questions
retire when correct-rate jumps above 85% in a week.
Sample questions
All Quant Logical Verbal Coding
Question Options Answer
Percentages · d3 ·
TCS/Infosys — Price
+20% then −20%. Net
change?
A) 0% B) −4% C) +4% D) −2% B. 1.2×0.8 = 0.96 → −4%.
Shortcut: a+b+ab/100.
Time-work · d3 ·
Accenture — Ravi: 12
days Meena: 18
A) 6 B) 8 C) 7 D) 9 B. 4×5/36 = 20/36 done; 16/36
× 18 = 8.


---
<!-- page 5 -->
days, Meena: 18.
Together 4 days, then
Ravi leaves. Days for
Meena to finish?
TSD · d2 · Wipro — 150
m train at 54 km/h
crosses a pole in?
A) 8 s B) 10 s C) 12 s D) 15 s B. 54 km/h = 15 m/s; 150/15 =
10 s.
Probability · d4 · TCS
NQT — Two dice
thrown. P(sum is
prime)?
A) 1/3 B) 5/12 C) 1/2 D) 7/18 B. Sums 2,3,5,7,11 →
1+2+4+6+2 = 15/36 = 5/12.
Number system · d4 ·
Capgemini —
Remainder of 7^45 ÷
5?
A) 1 B) 2 C) 3 D) 4 B. Cycle 2,4,3,1; 45 mod 4 = 1 →
2.
Blood relation · d2 ·
Cognizant — Anita: 'His
mother is the only
daughter of my
mother.' The man is
Anita's:
A) Brother B) Son C) Nephew D)
Cousin
B. Only daughter of Anita's
mother = Anita → son.
Coding-decoding · d3 ·
Infosys — CAMPUS →
DBNQVT. PLACED → ?
A) QMBDFE B) QMBDEF C)
QLBDFE D) RMBDFE
A. Each letter +1.
Syllogism · d3 ·
Accenture — All drives
are tests. Some tests
are online. I: Some
drives are online. II:
Some tests are drives.
A) Only I B) Only II C) Both D)
Neither
B. II follows by conversion; I is
not certain.
Error spotting · d2 ·
Wipro — Each of the
students (A) / have
submitted (B) / their
resume (C) / on time
(D).
A) A B) B C) C D) D B. 'Each' is singular → 'has
submitted'.
Para-jumble · d3 ·
Capgemini — P: Hence
they practise daily. Q:
Tests reward speed. R:
Speed comes from
pattern familiarity. S:
Smart students know
this
A) QRSP B) SQRP C) QSRP D)
RQSP
A. Claim → reason → who knows
→ conclusion.


---
<!-- page 6 -->
this.
Output · d3 · TCS NQT
— Python: x=[1,2,3];
y=x; y.append(4);
print(len(x))
A) 3 B) 4 C) Error D) 1 B. y references the same list.
Complexity · d4 ·
Accenture — for i in
1..n: j=1; while j<n: j*=2
— complexity?
A) O(n) B) O(n log n) C) O(log n)
D) O(n²)
B. n outer × log n inner.
App architecture
Pick
Next.js PWA on Railway with Railway Postgres (pgvector) and optional Redis. One
platform and bill, Docker-portable to another PC, built-in cron. Auth.js email sign-in
via Resend, Drizzle ORM, role checks in app code instead of Supabase RLS.
Auth
Auth.js email magic link / OTP via Resend; Google Workspace SSO later
Student
Streak, XP, today's drill, offline sync
Adaptive engine
Server function, nightly cron builds drills
TPO dashboard
Topic × batch heatmap, readiness per company, at-risk, export
Admin
Colleges, batches, CSV import, invites
Content
Review queue, golden / retire
Notifications
Resend email now; WhatsApp provider later
Tables: colleges, batches, users, questions (with embedding), college_question_access,
skills, drills, attempts, streaks, mocks, mock_attempts, explanations_cache,
readiness_snapshots. Plus Auth.js adapter tables. A requireRole() helper scopes TPOs to
their ll id


---
<!-- page 7 -->
their college_id.
Railway service Source Notes
web GitHub repo, Dockerfile Next.js standalone, 0.5 GB, pre-
deploy npm run db:migrate,
healthcheck /api/health
postgres pgvector template 1–5 GB volume, backups
cron Same repo, node
scripts/cron.js
30 23 * * * UTC = 05:00 IST
drills; Monday TPO report
redis Railway Redis (optional) Rate limit, leaderboard; skip
under 1,000 actives
Env vars: DATABASE_URL=${{postgres.DATABASE_URL}}, REDIS_URL, AUTH_SECRET, AUTH_URL,
AUTH_RESEND_KEY, EMAIL_FROM, ANTHROPIC_API_KEY, ANTHROPIC_MODEL_FAST,
ANTHROPIC_MODEL_SMART, VOYAGE_API_KEY, APP_BASE_URL, CRON_SECRET. Full Dockerfile and
railway.json are in the markdown file. Region: Singapore, closest to India.
Deploy
1 A. Railway (primary)
npm i -g @railway/cli, railway
login, railway init
2 Add Postgres
pgvector template; Redis optional
3 Add web service
GitHub repo, Dockerfile, variables with
${{postgres.DATABASE_URL}}
4 Domain
Generate domain, then CNAME
app.yourdomain.in
5 Seed + cron
railway run npm run db:seed; add
cron service; usage alert at $15
1 B. Another system
Docker, Node 20, git
2 Local stack
docker compose up -d with
pgvector/pgvector:pg16 + web from
the same Dockerfile
3 Or use Railway env
railway link, then railway run npm
run dev against staging
4 Migrate + seed
npm run db:migrate && npm run
db:seed
5 Phones on HTTPS
cloudflared tunnel
From Vercel + Supabase To Railway


---
<!-- page 8 -->
Supabase Auth Auth.js email provider + Resend
RLS policies requireRole() + college_id filter in Drizzle queries
Supabase client Drizzle in server actions
Vercel crons Railway cron service
Existing data pg_dump → psql $DATABASE_URL
Budget for $250
Anthropic API $90
Railway Hobby, 6 months $72
Buffer for scale / Pro $48
WhatsApp test credit $25
Domain $15
Six months, estimate; Railway Hobby about $10–12 a month for 500 students, $20–30 for 2,000.
Verify at railway.com/pricing
6-week build
Week Ship
1 Railway project (web + Postgres), Drizzle schema,
Auth.js sign-in, CSV import
2 Question pipeline: seeds, Haiku batches, validators,
Sonnet QA, review UI
3 Daily drill player, streaks with freeze, offline service
worker
4 Adaptive engine, nightly drill cron, company mocks
5 TPO dashboard, at-risk list, weekly Sonnet summary
(no PII)
6 Load test 500 users, onboarding, DPDP consent,
demo college data
Paste-ready Claude Code / Cursor prompts for each week are in the markdown file.


---
<!-- page 9 -->
Pilot and pricing
Tier ₹ / student / yr Includes
Starter 200 Drills, streaks, basic dashboard, 200-seat
minimum
Placement 350 Company mocks, readiness per company,
weekly reports
Premium 500 WhatsApp nudges, custom sets, drive
bootcamps, SSO