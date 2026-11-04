"use server";
import { headers } from "next/headers";
import { requireRole, requireUser } from "@/lib/authz";
import { clientIp } from "@/lib/http";
import { hit } from "@/lib/rate-limit";
import { commitRoster, previewRoster } from "@/server/services/roster";

const MAX_BYTES = 2_000_000;

export async function previewAction(text: string, createBatches: boolean, collegeId?: string) {
  const user = requireRole(await requireUser(), ["tpo", "admin"]);
  if (typeof text !== "string" || text.length > MAX_BYTES) return { fatal: "File too large (max 2 MB)." } as const;
  return previewRoster(user, user.role === "superadmin" ? collegeId : undefined, text, { createBatches: Boolean(createBatches) });
}

export async function commitAction(text: string, createBatches: boolean, sendInvites: boolean, collegeId?: string) {
  const user = requireRole(await requireUser(), ["tpo", "admin"]);
  if (typeof text !== "string" || text.length > MAX_BYTES) return { ok: false as const, error: "File too large (max 2 MB)." };
  const rl = await hit("import", user.id);
  if (!rl.ok) return { ok: false as const, error: "Import limit reached (5 per hour). Try again later." };
  const ip = clientIp({ headers: await headers() });
  const r = await commitRoster(user, user.role === "superadmin" ? collegeId : undefined, text, { createBatches: Boolean(createBatches), sendInvites: Boolean(sendInvites), ip });
  return r.ok ? { ok: true as const, created: r.created, updated: r.updated, unchanged: r.unchanged, skipped: r.skipped, invited: r.invited, newBatches: r.newBatches } : { ok: false as const, error: r.error };
}
