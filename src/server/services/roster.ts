import Papa from "papaparse";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { batches, colleges, invites, users } from "@/db/schema";
import { audit } from "@/lib/audit";
import { sendMail } from "@/lib/mail";
import { track } from "@/lib/events";
import { collegeOf } from "./tpo";
import type { SessionUser } from "@/lib/authz";

type Staff = Pick<SessionUser, "id" | "role" | "collegeId">;
export const MAX_ROWS = 5000;

const Row = z.object({
  name: z.string().trim().min(2, "name missing").max(80, "name too long"),
  email: z.string().trim().toLowerCase().email("bad email").max(254),
  roll_no: z.string().trim().max(40, "roll no too long").optional().transform((v) => v || null),
  batch: z.string().trim().max(60, "batch name too long").optional().transform((v) => v || null),
});

export type PreviewRow = { line: number; name: string; email: string; rollNo: string | null; batch: string | null; status: "new" | "update" | "unchanged" | "error"; errors: string[] };
export type Preview = { rows: PreviewRow[]; counts: { total: number; new: number; update: number; unchanged: number; error: number }; seats: { used: number; limit: number; after: number }; overSeats: boolean; newBatches: string[]; fatal: string | null };

const HEADER_ALIASES: Record<string, string> = { name: "name", "full name": "name", "student name": "name", email: "email", "email id": "email", "e-mail": "email", roll_no: "roll_no", "roll no": "roll_no", rollno: "roll_no", "roll number": "roll_no", "register no": "roll_no", batch: "batch", section: "batch", class: "batch" };

export function parseCsv(text: string) {
  const res = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => HEADER_ALIASES[h.trim().toLowerCase()] ?? h.trim().toLowerCase(),
  });
  return { data: res.data, fields: res.meta.fields ?? [], errors: res.errors };
}

/** Pure-ish validation against current DB state. Never writes. */
export async function previewRoster(staff: Staff, collegeId: string | undefined, text: string, opts: { createBatches: boolean }): Promise<Preview> {
  const cid = collegeOf(staff, collegeId);
  const empty: Preview = { rows: [], counts: { total: 0, new: 0, update: 0, unchanged: 0, error: 0 }, seats: { used: 0, limit: 0, after: 0 }, overSeats: false, newBatches: [], fatal: null };
  const { data, fields } = parseCsv(text);
  if (!fields.includes("email") || !fields.includes("name")) return { ...empty, fatal: "CSV needs a header row with at least: name,email (optional: roll_no,batch)" };
  if (data.length > MAX_ROWS) return { ...empty, fatal: `Too many rows (${data.length}); split into files of ≤ ${MAX_ROWS}.` };

  const [college] = await db.select().from(colleges).where(eq(colleges.id, cid));
  const collegeBatches = await db.select().from(batches).where(eq(batches.collegeId, cid));
  const batchByName = new Map(collegeBatches.map((b) => [b.name.toLowerCase(), b]));
  const emails = data.map((r) => (r.email ?? "").trim().toLowerCase()).filter(Boolean);
  const existing = emails.length ? await db.select().from(users).where(inArray(users.email, emails)) : [];
  const byEmail = new Map(existing.map((u) => [u.email, u]));
  const rolls = await db.select({ id: users.id, email: users.email, rollNo: users.rollNo }).from(users).where(and(eq(users.collegeId, cid), sql`${users.rollNo} is not null`));
  const rollOwner = new Map(rolls.map((r) => [r.rollNo!.toLowerCase(), r.email]));
  const [{ used }] = await db.select({ used: sql<number>`count(*)::int` }).from(users).where(and(eq(users.collegeId, cid), eq(users.role, "student")));

  const seenEmail = new Map<string, number>();
  const seenRoll = new Map<string, number>();
  const newBatches = new Set<string>();
  const rows: PreviewRow[] = data.map((raw, i) => {
    const line = i + 2; // header is line 1
    const p = Row.safeParse(raw);
    const base = { line, name: (raw.name ?? "").trim(), email: (raw.email ?? "").trim().toLowerCase(), rollNo: (raw.roll_no ?? "").trim() || null, batch: (raw.batch ?? "").trim() || null };
    if (!p.success) return { ...base, status: "error" as const, errors: [...new Set(p.error.issues.map((x) => x.message))] };
    const r = p.data;
    const errors: string[] = [];
    if (seenEmail.has(r.email)) errors.push(`duplicate email (line ${seenEmail.get(r.email)})`);
    seenEmail.set(r.email, line);
    if (r.roll_no) {
      const k = r.roll_no.toLowerCase();
      if (seenRoll.has(k)) errors.push(`duplicate roll no (line ${seenRoll.get(k)})`);
      seenRoll.set(k, line);
      const owner = rollOwner.get(k);
      if (owner && owner !== r.email) errors.push(`roll no already used by ${owner}`);
    }
    if (r.batch && !batchByName.has(r.batch.toLowerCase())) {
      if (opts.createBatches) newBatches.add(r.batch);
      else errors.push(`unknown batch "${r.batch}"`);
    }
    const ex = byEmail.get(r.email);
    if (ex && ex.collegeId !== cid) errors.push("email is registered with another college");
    if (ex && ex.collegeId === cid && ex.role !== "student") errors.push(`email belongs to a ${ex.role} account`);
    if (errors.length) return { ...base, rollNo: r.roll_no, batch: r.batch, status: "error" as const, errors };
    const b = r.batch ? batchByName.get(r.batch.toLowerCase()) : undefined;
    const status = !ex ? "new" : ex.name === r.name && ex.rollNo === r.roll_no && (!r.batch || ex.batchId === b?.id) ? "unchanged" : "update";
    return { line, name: r.name, email: r.email, rollNo: r.roll_no, batch: r.batch, status, errors: [] };
  });
  const counts = { total: rows.length, new: 0, update: 0, unchanged: 0, error: 0 };
  for (const r of rows) counts[r.status]++;
  const limit = college?.seats ?? 0;
  const after = used + counts.new;
  return { rows, counts, seats: { used, limit, after }, overSeats: after > limit, newBatches: [...newBatches], fatal: null };
}

/** Imports valid rows (errors are skipped and reported). Blocks entirely if seats would be exceeded. Idempotent by email. */
export async function commitRoster(staff: Staff, collegeId: string | undefined, text: string, opts: { createBatches: boolean; sendInvites: boolean; ip?: string }) {
  const cid = collegeOf(staff, collegeId);
  const pv = await previewRoster(staff, cid, text, opts);
  if (pv.fatal) return { ok: false as const, error: pv.fatal, preview: pv };
  if (pv.overSeats) return { ok: false as const, error: `Seat limit reached: ${pv.seats.after} students would exceed ${pv.seats.limit} seats.`, preview: pv };
  const valid = pv.rows.filter((r) => r.status !== "error");
  const result = await db.transaction(async (tx) => {
    const batchIds = new Map((await tx.select().from(batches).where(eq(batches.collegeId, cid))).map((b) => [b.name.toLowerCase(), b.id]));
    for (const name of pv.newBatches) {
      const [b] = await tx.insert(batches).values({ collegeId: cid, name }).returning();
      batchIds.set(name.toLowerCase(), b.id);
    }
    let created = 0, updated = 0;
    const newEmails: string[] = [];
    for (const r of valid) {
      if (r.status === "unchanged") continue;
      const batchId = r.batch ? batchIds.get(r.batch.toLowerCase()) ?? null : null;
      const [u] = await tx
        .insert(users)
        .values({ email: r.email, name: r.name, rollNo: r.rollNo, collegeId: cid, batchId, role: "student" })
        .onConflictDoUpdate({ target: users.email, set: { name: r.name, rollNo: r.rollNo, ...(batchId ? { batchId } : {}) }, where: sql`${users.collegeId} = ${cid} and ${users.role} = 'student'` })
        .returning({ id: users.id, createdAt: users.createdAt });
      if (r.status === "new") {
        created++;
        newEmails.push(r.email);
      } else if (u) updated++;
    }
    if (newEmails.length) await tx.insert(invites).values(newEmails.map((email) => ({ collegeId: cid, email, role: "student" as const })));
    return { created, updated, newEmails };
  });
  let invited = 0;
  if (opts.sendInvites && result.newEmails.length) invited = await sendInvites(cid, result.newEmails);
  await audit(staff, "roster.import", { type: "college", id: cid, collegeId: cid, ip: opts.ip, meta: { rows: pv.counts.total, created: result.created, updated: result.updated, errors: pv.counts.error, newBatches: pv.newBatches, invited } });
  await track("roster_import", { userId: staff.id, collegeId: cid, props: { created: result.created, updated: result.updated, errors: pv.counts.error } });
  return { ok: true as const, created: result.created, updated: result.updated, unchanged: pv.counts.unchanged, skipped: pv.counts.error, invited, newBatches: pv.newBatches, errors: pv.rows.filter((r) => r.status === "error") };
}

export async function sendInvites(collegeId: string, emails: string[]) {
  const [c] = await db.select().from(colleges).where(eq(colleges.id, collegeId));
  const app = process.env.APP_BASE_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
  let sent = 0;
  for (const email of emails) {
    try {
      await sendMail(
        email,
        `${c?.name ?? "Your college"} added you to LearnCrew`,
        `<p>${c?.name ?? "Your college"} has added you to <b>LearnCrew Campus</b> — 10 placement-aptitude questions a day, about 10 minutes.</p><p><a href="${app}/login">Log in with this email</a> to start.</p>`,
        `${c?.name ?? "Your college"} added you to LearnCrew Campus. Log in with this email at ${app}/login`,
      );
      await db.update(invites).set({ sentAt: new Date() }).where(and(eq(invites.collegeId, collegeId), eq(invites.email, email)));
      sent++;
    } catch (e) {
      console.error(JSON.stringify({ level: "error", msg: "invite failed", err: String(e) }));
    }
  }
  return sent;
}
