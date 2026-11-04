import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { eq } from "drizzle-orm";
import { db, pg } from "@/db";
import { llmUsage, profileReviews } from "@/db/schema";
import { analyseResume, CoachError, draftForMe, grantConsent, parseResumePdf, reviewsForStaff, revokeConsent, saveLinkedin, setShared, type Drafter } from "@/server/services/profile-coach";
import { makeCollege, makeUser, resetDb } from "./db";

const good = new Uint8Array(readFileSync("tests/fixtures/resume-good.pdf"));
const evil = new Uint8Array(readFileSync("tests/fixtures/resume-injection.pdf"));
let S: { id: string; collegeId: string | null }, tpoA: Awaited<ReturnType<typeof makeUser>>, tpoB: Awaited<ReturnType<typeof makeUser>>;

beforeAll(async () => {
  await resetDb();
  const A = await makeCollege("P");
  const B = await makeCollege("Q");
  const s = await makeUser({ collegeId: A.college.id, batchId: A.batch.id });
  S = { id: s.id, collegeId: A.college.id };
  tpoA = await makeUser({ collegeId: A.college.id, role: "tpo" });
  tpoB = await makeUser({ collegeId: B.college.id, role: "tpo" });
});
afterAll(() => pg.end());

describe("resume parsing", () => {
  it("extracts text from a real PDF and deletes the temp file afterwards", async () => {
    let tmp = "";
    const text = await parseResumePdf(good, { onTempFile: (p) => (tmp = p) });
    expect(text).toContain("Attendance Tracker");
    expect(tmp).not.toBe("");
    expect(existsSync(tmp)).toBe(false);
  });
  it("deletes the temp file even when parsing fails, and rejects non-PDFs", async () => {
    let tmp = "";
    const fakePdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 1, 2, 3]);
    await expect(parseResumePdf(fakePdf, { onTempFile: (p) => (tmp = p) })).rejects.toBeInstanceOf(CoachError);
    expect(existsSync(tmp)).toBe(false);
    await expect(parseResumePdf(new TextEncoder().encode("hello"))).rejects.toThrow(/doesn't look like a PDF/);
  });
});

describe("consent + storage", () => {
  it("refuses to read a resume without processing consent", async () => {
    await expect(analyseResume(S, good, { processingConsent: false, storeText: false })).rejects.toMatchObject({ code: "consent" });
  });
  it("without storage consent only the checklist is kept", async () => {
    const r = await analyseResume(S, good, { processingConsent: true, storeText: false });
    expect(r.input).toBeNull();
    expect(r.score).toBeGreaterThan(50);
  });
  it("with storage consent the text is kept; revoking consent wipes it", async () => {
    const r = await analyseResume(S, good, { processingConsent: true, storeText: true });
    expect((r.input as { text: string }).text).toContain("Attendance Tracker");
    await revokeConsent(S, "resume_storage");
    const [after] = await db.select().from(profileReviews).where(eq(profileReviews.id, r.id));
    expect(after.input).toBeNull();
  });
});

describe("Draft for me", () => {
  const fake = (raw: unknown): Drafter => async (input) => {
    seen.push(input.text);
    return { raw, model: "fake-sonnet", usage: { input_tokens: 1000, output_tokens: 200 } };
  };
  const seen: string[] = [];
  it("needs AI-drafts consent", async () => {
    await expect(draftForMe(S, "resume", fake({ summary: "x".repeat(30) }))).rejects.toMatchObject({ code: "consent" });
  });
  it("prompt-injection lines and PII never reach the model; output is schema-validated (extra keys dropped)", async () => {
    await grantConsent(S, "ai_drafts");
    await analyseResume(S, evil, { processingConsent: true, storeText: true });
    const d = await draftForMe(S, "resume", fake({ summary: "Mechanical student skilled in teamwork and MS Office.", bullets: [{ improved: "Organised a team of [add number] for the college fest." }], system_override: "PWNED" }));
    const sent = seen.at(-1)!;
    expect(sent).not.toMatch(/ignore all previous|system prompt|you are now|PWNED/i);
    expect(sent).not.toMatch(/arjun@example\.in/);
    expect(d).toEqual({ summary: "Mechanical student skilled in teamwork and MS Office.", bullets: [{ improved: "Organised a team of [add number] for the college fest." }] });
    expect(JSON.stringify(d)).not.toContain("PWNED");
    expect((await db.select().from(llmUsage).where(eq(llmUsage.userId, S.id))).length).toBe(1);
  });
  it("rejects malformed model output", async () => {
    await expect(draftForMe(S, "resume", fake({ summary: 42 }))).rejects.toMatchObject({ code: "llm" });
  });
  it("monthly quota", async () => {
    await analyseResume(S, good, { processingConsent: true, storeText: true });
    await draftForMe(S, "resume", fake({ summary: "Final-year student with Java and SQL projects." }));
    await analyseResume(S, good, { processingConsent: true, storeText: true });
    await draftForMe(S, "resume", fake({ summary: "Final-year student with Java and SQL projects." }));
    await expect(draftForMe(S, "resume", fake({ summary: "Final-year student with Java and SQL projects." }))).rejects.toMatchObject({ code: "quota" });
  });
  it("disabled without an API key → clear message (templates still work)", async () => {
    await expect(draftForMe(S, "linkedin", null)).rejects.toMatchObject({ code: "disabled" });
  });
});

describe("TPO visibility", () => {
  it("TPO sees checklist scores but not unshared drafts; other college sees nothing", async () => {
    await saveLinkedin(S, { headline: "Student" });
    const v = await reviewsForStaff(tpoA, S.id);
    expect(v!.resume!.score).toBeGreaterThan(0);
    expect(v!.resume!.draft).toBeNull();
    expect(JSON.stringify(v)).not.toContain("Attendance Tracker"); // stored text never exposed
    const [latest] = await db.select().from(profileReviews).where(eq(profileReviews.userId, S.id)).orderBy(profileReviews.createdAt);
    expect(await reviewsForStaff(tpoB, S.id)).toBeNull();
    const rows = await db.select().from(profileReviews).where(eq(profileReviews.kind, "resume"));
    const drafted = rows.filter((r) => r.draftText).at(-1)!;
    await setShared(S, drafted.id, true);
    expect((await reviewsForStaff(tpoA, S.id))!.resume!.draft).not.toBeNull(); // visible only once shared
    void latest;
  });
});
