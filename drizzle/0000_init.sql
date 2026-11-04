CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('pilot', 'starter', 'placement', 'premium');--> statement-breakpoint
CREATE TYPE "public"."q_source" AS ENUM('seed', 'llm_variant', 'tpo');--> statement-breakpoint
CREATE TYPE "public"."q_status" AS ENUM('draft', 'review', 'golden', 'retired');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('student', 'tpo', 'admin', 'content', 'superadmin');--> statement-breakpoint
CREATE TYPE "public"."section" AS ENUM('quant', 'logical', 'verbal', 'coding');--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"question_id" text NOT NULL,
	"drill_id" uuid,
	"mock_attempt_id" uuid,
	"chosen_index" integer,
	"correct" boolean NOT NULL,
	"time_ms" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"college_id" uuid NOT NULL,
	"name" text NOT NULL,
	"grad_year" integer,
	"branch" text,
	"target_drive_date" date,
	"target_company" text
);
--> statement-breakpoint
CREATE TABLE "college_question_access" (
	"college_id" uuid NOT NULL,
	"question_id" text NOT NULL,
	CONSTRAINT "college_question_access_college_id_question_id_pk" PRIMARY KEY("college_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "colleges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"city" text,
	"plan" "plan" DEFAULT 'pilot' NOT NULL,
	"seats" integer DEFAULT 200 NOT NULL,
	"bank_seed" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_blueprints" (
	"company" text PRIMARY KEY NOT NULL,
	"section_weights" jsonb NOT NULL,
	"topic_weights" jsonb,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "drills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"question_ids" text[] NOT NULL,
	"option_order" jsonb NOT NULL,
	"completed_at" timestamp,
	"score" integer
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"college_id" uuid,
	"name" text NOT NULL,
	"props" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "explanations_cache" (
	"question_id" text NOT NULL,
	"wrong_index" integer NOT NULL,
	"text" text NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "explanations_cache_question_id_wrong_index_pk" PRIMARY KEY("question_id","wrong_index")
);
--> statement-breakpoint
CREATE TABLE "invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"college_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "role" NOT NULL,
	"sent_at" timestamp,
	"accepted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "mock_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mock_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"question_ids" text[] NOT NULL,
	"score" integer,
	"section_scores" jsonb,
	"tab_switches" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ends_at" timestamp NOT NULL,
	"ended_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "mocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company" text NOT NULL,
	"title" text NOT NULL,
	"blueprint" jsonb NOT NULL,
	"duration_sec" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" text PRIMARY KEY NOT NULL,
	"section" "section" NOT NULL,
	"topic" text NOT NULL,
	"subtopic" text NOT NULL,
	"stem" text NOT NULL,
	"options" jsonb NOT NULL,
	"answer_index" integer NOT NULL,
	"explanation" text NOT NULL,
	"shortcut" text,
	"company_tags" text[] DEFAULT '{}' NOT NULL,
	"difficulty" integer NOT NULL,
	"time_sec" integer NOT NULL,
	"source" "q_source" NOT NULL,
	"seed_id" text,
	"status" "q_status" DEFAULT 'draft' NOT NULL,
	"variant_group" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"embedding" vector(512),
	"correct_rate_7d" real,
	"qa_flags" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "readiness_snapshots" (
	"user_id" uuid NOT NULL,
	"company" text NOT NULL,
	"week" text NOT NULL,
	"score" integer NOT NULL,
	"topic_breakdown" jsonb,
	CONSTRAINT "readiness_snapshots_user_id_company_week_pk" PRIMARY KEY("user_id","company","week")
);
--> statement-breakpoint
CREATE TABLE "review_queue" (
	"user_id" uuid NOT NULL,
	"question_id" text NOT NULL,
	"due_on" date NOT NULL,
	"stage" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "review_queue_user_id_question_id_pk" PRIMARY KEY("user_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"user_id" uuid NOT NULL,
	"topic" text NOT NULL,
	"rating" real DEFAULT 1200 NOT NULL,
	"band" integer DEFAULT 2 NOT NULL,
	"streak_right" integer DEFAULT 0 NOT NULL,
	"streak_wrong" integer DEFAULT 0 NOT NULL,
	"band_changed_on" date,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "skills_user_id_topic_pk" PRIMARY KEY("user_id","topic")
);
--> statement-breakpoint
CREATE TABLE "streaks" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"current" integer DEFAULT 0 NOT NULL,
	"longest" integer DEFAULT 0 NOT NULL,
	"last_active_date" date,
	"freezes" integer DEFAULT 1 NOT NULL,
	"freeze_week" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"college_id" uuid,
	"batch_id" uuid,
	"role" "role" DEFAULT 'student' NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp,
	"image" text,
	"roll_no" text,
	"consent_at" timestamp,
	"target_company" text,
	"xp" integer DEFAULT 0 NOT NULL,
	"last_active_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_drill_id_drills_id_fk" FOREIGN KEY ("drill_id") REFERENCES "public"."drills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batches" ADD CONSTRAINT "batches_college_id_colleges_id_fk" FOREIGN KEY ("college_id") REFERENCES "public"."colleges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "college_question_access" ADD CONSTRAINT "college_question_access_college_id_colleges_id_fk" FOREIGN KEY ("college_id") REFERENCES "public"."colleges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "college_question_access" ADD CONSTRAINT "college_question_access_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drills" ADD CONSTRAINT "drills_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "explanations_cache" ADD CONSTRAINT "explanations_cache_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_attempts" ADD CONSTRAINT "mock_attempts_mock_id_mocks_id_fk" FOREIGN KEY ("mock_id") REFERENCES "public"."mocks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_attempts" ADD CONSTRAINT "mock_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "readiness_snapshots" ADD CONSTRAINT "readiness_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_queue" ADD CONSTRAINT "review_queue_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_queue" ADD CONSTRAINT "review_queue_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaks" ADD CONSTRAINT "streaks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_college_id_colleges_id_fk" FOREIGN KEY ("college_id") REFERENCES "public"."colleges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attempts_client_uq" ON "attempts" USING btree ("user_id","client_id");--> statement-breakpoint
CREATE INDEX "attempts_user_q_idx" ON "attempts" USING btree ("user_id","question_id");--> statement-breakpoint
CREATE INDEX "batches_college_idx" ON "batches" USING btree ("college_id");--> statement-breakpoint
CREATE UNIQUE INDEX "drills_user_date_uq" ON "drills" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "events_college_time_idx" ON "events" USING btree ("college_id","created_at");--> statement-breakpoint
CREATE INDEX "q_pick_idx" ON "questions" USING btree ("status","topic","difficulty");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_college_idx" ON "users" USING btree ("college_id","role");