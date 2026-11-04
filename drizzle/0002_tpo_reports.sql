CREATE TABLE "weekly_reports" (
	"college_id" uuid NOT NULL,
	"week" text NOT NULL,
	"stats" jsonb NOT NULL,
	"narrative" text NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "weekly_reports_college_id_week_pk" PRIMARY KEY("college_id","week")
);
--> statement-breakpoint
ALTER TABLE "weekly_reports" ADD CONSTRAINT "weekly_reports_college_id_colleges_id_fk" FOREIGN KEY ("college_id") REFERENCES "public"."colleges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attempts_user_time_idx" ON "attempts" USING btree ("user_id","created_at");