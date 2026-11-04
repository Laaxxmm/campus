CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"college_id" uuid,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"meta" jsonb,
	"ip" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "batch_mocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"college_id" uuid NOT NULL,
	"batch_id" uuid NOT NULL,
	"mock_id" uuid NOT NULL,
	"opens_at" timestamp NOT NULL,
	"closes_at" timestamp NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"bucket" text NOT NULL,
	"key" text NOT NULL,
	"window_start" timestamp NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_limits_bucket_key_window_start_pk" PRIMARY KEY("bucket","key","window_start")
);
--> statement-breakpoint
ALTER TABLE "mock_attempts" ADD COLUMN "answers" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "mock_attempts" ADD COLUMN "option_order" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "mock_attempts" ADD COLUMN "section_ends_at" jsonb;--> statement-breakpoint
ALTER TABLE "mock_attempts" ADD COLUMN "auto_submitted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "mock_attempts" ADD COLUMN "correct_count" integer;--> statement-breakpoint
ALTER TABLE "mock_attempts" ADD COLUMN "wrong_count" integer;--> statement-breakpoint
ALTER TABLE "mock_attempts" ADD COLUMN "marks" real;--> statement-breakpoint
ALTER TABLE "mocks" ADD COLUMN "college_id" uuid;--> statement-breakpoint
ALTER TABLE "mocks" ADD COLUMN "mark_correct" real DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "mocks" ADD COLUMN "negative_mark" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "mocks" ADD COLUMN "sectional" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "mocks" ADD COLUMN "instructions" text;--> statement-breakpoint
ALTER TABLE "mocks" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "mocks" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "batch_mocks" ADD CONSTRAINT "batch_mocks_college_id_colleges_id_fk" FOREIGN KEY ("college_id") REFERENCES "public"."colleges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_mocks" ADD CONSTRAINT "batch_mocks_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_mocks" ADD CONSTRAINT "batch_mocks_mock_id_mocks_id_fk" FOREIGN KEY ("mock_id") REFERENCES "public"."mocks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_college_time_idx" ON "audit_logs" USING btree ("college_id","created_at");--> statement-breakpoint
CREATE INDEX "batch_mocks_college_idx" ON "batch_mocks" USING btree ("college_id","batch_id");--> statement-breakpoint
ALTER TABLE "mocks" ADD CONSTRAINT "mocks_college_id_colleges_id_fk" FOREIGN KEY ("college_id") REFERENCES "public"."colleges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mock_attempts_user_idx" ON "mock_attempts" USING btree ("user_id","mock_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mock_attempts_one_active_uq" ON "mock_attempts" USING btree ("user_id","mock_id") WHERE ended_at is null;