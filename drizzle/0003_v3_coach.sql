ALTER TYPE "public"."section" ADD VALUE 'tech';--> statement-breakpoint
CREATE TABLE "attempt_insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"drill_id" uuid,
	"mock_attempt_id" uuid,
	"facts" jsonb NOT NULL,
	"text" jsonb NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_profiles" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"version" integer NOT NULL,
	"roles" jsonb NOT NULL,
	"rounds" jsonb NOT NULL,
	"cutoffs" jsonb NOT NULL,
	"branch_expectations" jsonb NOT NULL,
	"jd_skills" jsonb NOT NULL,
	"hr_focus" jsonb NOT NULL,
	"sources" jsonb NOT NULL,
	"disclaimer" text NOT NULL,
	"status" "q_status" DEFAULT 'golden' NOT NULL,
	"updated_at" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "concept_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"topic" text NOT NULL,
	"skill_key" text NOT NULL,
	"branches" text[] NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"example" text,
	"interview_tip" text,
	"status" "q_status" DEFAULT 'golden' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"granted_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "focus_assignment_students" (
	"assignment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"completed_at" timestamp,
	CONSTRAINT "focus_assignment_students_assignment_id_user_id_pk" PRIMARY KEY("assignment_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "focus_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"college_id" uuid NOT NULL,
	"topics" text[] NOT NULL,
	"questions_per_day" integer DEFAULT 5 NOT NULL,
	"due_on" date,
	"note" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_questions" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"companies" text[] NOT NULL,
	"question" text NOT NULL,
	"why_they_ask" text NOT NULL,
	"structure" jsonb NOT NULL,
	"outline" text NOT NULL,
	"avoid" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "llm_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"college_id" uuid,
	"feature" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cached_tokens" integer DEFAULT 0 NOT NULL,
	"cost_usd" real DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"input" jsonb,
	"checklist" jsonb NOT NULL,
	"score" integer NOT NULL,
	"draft_text" jsonb,
	"model" text,
	"consent" boolean DEFAULT false NOT NULL,
	"shared_with_tpo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_tags" (
	"key" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"branch" text,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_skills" (
	"user_id" uuid NOT NULL,
	"skill_key" text NOT NULL,
	"status" text NOT NULL,
	"source" text NOT NULL,
	"evidence" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "student_skills_user_id_skill_key_pk" PRIMARY KEY("user_id","skill_key")
);
--> statement-breakpoint
CREATE TABLE "target_companies" (
	"user_id" uuid NOT NULL,
	"company" text NOT NULL,
	"is_dream" boolean DEFAULT false NOT NULL,
	"dream_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "target_companies_user_id_company_pk" PRIMARY KEY("user_id","company")
);
--> statement-breakpoint
CREATE TABLE "weekly_focus" (
	"user_id" uuid NOT NULL,
	"week_start" date NOT NULL,
	"topics" jsonb NOT NULL,
	"daily_targets" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "weekly_focus_user_id_week_start_pk" PRIMARY KEY("user_id","week_start")
);
--> statement-breakpoint
DROP INDEX "drills_user_date_uq";--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "answer_changes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "marked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "drills" ADD COLUMN "kind" text DEFAULT 'daily' NOT NULL;--> statement-breakpoint
ALTER TABLE "drills" ADD COLUMN "focus_topics" text[];--> statement-breakpoint
ALTER TABLE "drills" ADD COLUMN "assignment_id" uuid;--> statement-breakpoint
ALTER TABLE "readiness_snapshots" ADD COLUMN "breakdown" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "branch" text;--> statement-breakpoint
ALTER TABLE "attempt_insights" ADD CONSTRAINT "attempt_insights_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "focus_assignment_students" ADD CONSTRAINT "focus_assignment_students_assignment_id_focus_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."focus_assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "focus_assignment_students" ADD CONSTRAINT "focus_assignment_students_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "focus_assignments" ADD CONSTRAINT "focus_assignments_college_id_colleges_id_fk" FOREIGN KEY ("college_id") REFERENCES "public"."colleges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_reviews" ADD CONSTRAINT "profile_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_skills" ADD CONSTRAINT "student_skills_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "target_companies" ADD CONSTRAINT "target_companies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_focus" ADD CONSTRAINT "weekly_focus_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "insight_drill_uq" ON "attempt_insights" USING btree ("drill_id");--> statement-breakpoint
CREATE UNIQUE INDEX "insight_mock_uq" ON "attempt_insights" USING btree ("mock_attempt_id");--> statement-breakpoint
CREATE INDEX "insight_user_idx" ON "attempt_insights" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "concept_topic_idx" ON "concept_cards" USING btree ("topic");--> statement-breakpoint
CREATE INDEX "consents_user_idx" ON "consents" USING btree ("user_id","kind");--> statement-breakpoint
CREATE INDEX "focus_assign_college_idx" ON "focus_assignments" USING btree ("college_id");--> statement-breakpoint
CREATE INDEX "llm_usage_user_idx" ON "llm_usage" USING btree ("user_id","feature","created_at");--> statement-breakpoint
CREATE INDEX "llm_usage_college_idx" ON "llm_usage" USING btree ("college_id","created_at");--> statement-breakpoint
CREATE INDEX "profile_reviews_user_idx" ON "profile_reviews" USING btree ("user_id","kind","created_at");--> statement-breakpoint
CREATE INDEX "drills_user_kind_idx" ON "drills" USING btree ("user_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "drills_user_date_uq" ON "drills" USING btree ("user_id","date") WHERE kind = 'daily';