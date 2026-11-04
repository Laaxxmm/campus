# 5-minute TPO demo — LearnCrew Campus

Setup (once): `npm run db:seed` (or `railway run npm run db:seed`). Open two windows: a laptop browser for the TPO and a phone (or Chrome device mode, 360 px) for a student. Magic links appear in the server console when Resend isn't configured. For a local/preview demo, `/dev/login` gives one-click login for every seeded role (404 unless `ALLOW_DEV_LOGIN_LINKS=true` or outside production — never enable it on a real pilot); `/dev/ui` shows the component gallery.

| Min | Show | Say |
|---|---|---|
| 0:00 | Landing page `/` | "Your college pays per student; students practise 10 questions a day on their phone; you see who's ready." |
| 0:30 | Phone: log in as `newstudent@demo.learncrew.in` → consent screen → Today | "Invite-only — only emails you upload can sign in. DPDP consent is captured on first login." |
| 1:00 | Phone: Start drill → answer 2–3 questions → explanation sheet | "Each answer is graded on our server, with a worked explanation and shortcut. Difficulty adapts per topic." |
| 1:45 | Phone: turn on airplane mode, answer one more → "Saved offline" → back online | "Campus Wi-Fi drops; answers queue on the phone and sync once." |
| 2:15 | Laptop: log in as `tpo@demo.learncrew.in` → Overview | "Weekly active %, median streak, readiness for each student's target company, and how many need a nudge." |
| 2:45 | Heatmap → filter *Infosys* → click a batch → click a student | "Topic accuracy by batch — this is where to spend class time before the drive." |
| 3:30 | At risk → *Copy WhatsApp nudge* | "Who hasn't practised in 5 days or is below 40 — message ready to paste into your batch group." |
| 4:00 | Mocks → schedule *Infosys practice mock* for 2027 CSE-A | "Real exam feel: timer, sections, negative marking, review mode. Results land in the student's profile." |
| 4:30 | Reports → *Print / save PDF*; Students → *Export CSV* | "A one-page weekly summary for your principal, and everything in Excel." |
| 5:00 | Close | "Pilot: one batch free for 4 weeks. We import your roster CSV the same day." |

Other logins: `admin@demo.learncrew.in` (roster import `fixtures/roster-bad.csv` shows row-level errors), `content@learncrew.in` (review queue), `SUPERADMIN_EMAIL` (`/super`: create a college + first TPO invite, audit log, data requests).

## v3 coach add-on (+3 minutes)
| Show | Say |
|---|---|
| Phone as `student030@…`: finish a drill → Insight card → *Start focus drill* | "Every attempt ends with what's going wrong and a one-tap fix — computed by rules, not guessed." |
| Companies → tick Infosys → open it | "Readiness 0–100 with the why: aptitude vs the bar, tech concepts for your branch, consistency, profile. Round by round gaps, tech cards, HR questions with STAR outlines." |
| Skills checklist | "Required vs nice-to-have, have/weak/missing, one action each. Honest: no promises of selection." |
| Profile coach → upload a resume PDF | "Free checklist and templates. AI drafts only on click, with consent and a monthly quota; we never touch LinkedIn." |
| Laptop TPO → Companies funnel → Weak topics → *Assign to N* | "Interview-ready % per company, and one click sends a focus pack to the 42 students weak in Time & Work." |
