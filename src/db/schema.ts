/* Source: ORCHESTRATOR.md § DATABASE SCHEMA. Keep docs/schema.md in sync. */
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
  targetCompany: text("target_company"),               // D5: student's own pick at onboarding (falls back to batch)
  xp: integer("xp").notNull().default(0),
  lastActiveAt: timestamp("last_active_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, t => [uniqueIndex("users_email_uq").on(t.email), index("users_college_idx").on(t.collegeId, t.role)]);

// Auth.js tables — shape per @auth/drizzle-adapter (postgres), user ids are uuid.
export const accounts = pgTable("accounts", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").$type<"oauth" | "oidc" | "email" | "webauthn">().notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
}, t => [primaryKey({ columns: [t.provider, t.providerAccountId] })]);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
}, t => [primaryKey({ columns: [t.identifier, t.token] })]);

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
  qaFlags: jsonb("qa_flags"),                              // D5: output of scripts/qa.ts for /content/review
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
