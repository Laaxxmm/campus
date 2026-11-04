import { db } from "@/db";
import { events } from "@/db/schema";

export type EventName =
  | "consent_given"
  | "drill_started"
  | "drill_completed"
  | "explain_more"
  | "tpo_export"
  | "mock_started"
  | "mock_submitted"
  | "roster_import"
  | "data_deletion_request"
  | "client_error";

export async function track(name: EventName, opts: { userId?: string | null; collegeId?: string | null; props?: Record<string, unknown> } = {}) {
  try {
    await db.insert(events).values({ name, userId: opts.userId ?? null, collegeId: opts.collegeId ?? null, props: opts.props ?? null });
  } catch (e) {
    console.error("[events] failed", name, e);
  }
}
