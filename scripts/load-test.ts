/**
 * Load test (local/staging only). Real HTTP against a running server; setup uses the DB directly.
 *   npx tsx scripts/load-test.ts --base http://localhost:3300 --students 500 --window 120 --mock-takers 200 --yes
 * Scenario A (v1): N students each open /today and answer 10 questions via POST /api/sync, arrivals spread over --window s.
 * Scenario B (v2): M students take a mock concurrently: GET attempt page, autosave every ~2 s ×10, submit.
 * Writes docs/reports/load-test.md. Refuses to run against a non-local DB unless --force.
 */
import "./env";
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { and, eq, inArray, like } from "drizzle-orm";
import { db, pg } from "../src/db";
import { drills, mockAttempts, mocks, sessions, users, attempts } from "../src/db/schema";
import { istDate } from "../src/lib/time";
import { startMock } from "../src/server/services/mocks";

const argv = process.argv.slice(2);
const arg = (k: string, d: string) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const BASE = arg("--base", "http://localhost:3300");
const N = Number(arg("--students", "500"));
const WINDOW = Number(arg("--window", "120"));
const M = Number(arg("--mock-takers", "200"));
if (!argv.includes("--yes")) throw new Error("This mutates the target DB (drills/attempts of demo students). Pass --yes.");
if (!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL ?? "") && !argv.includes("--force")) throw new Error("DATABASE_URL is not local; pass --force for staging.");

type Sample = { ms: number; status: number };
const pct = (xs: number[], p: number) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor((p / 100) * xs.length))] : 0);
const summarize = (name: string, s: Sample[], wallSec: number) => {
  const ms = s.map((x) => x.ms);
  const errors = s.filter((x) => x.status >= 400 || x.status === 0).length;
  return { name, requests: s.length, rps: +(s.length / wallSec).toFixed(1), p50: Math.round(pct(ms, 50)), p95: Math.round(pct(ms, 95)), p99: Math.round(pct(ms, 99)), max: Math.round(Math.max(0, ...ms)), errors };
};

async function sessionFor(userId: string) {
  const token = randomBytes(24).toString("hex");
  await db.insert(sessions).values({ sessionToken: token, userId, expires: new Date(Date.now() + 86_400_000) });
  return `authjs.session-token=${token}`;
}
async function timed(samples: Sample[], url: string, init: RequestInit) {
  const t = performance.now();
  try {
    const r = await fetch(url, init);
    await r.arrayBuffer();
    samples.push({ ms: performance.now() - t, status: r.status });
    return r;
  } catch {
    samples.push({ ms: performance.now() - t, status: 0 });
    return null;
  }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const health = await fetch(`${BASE}/api/health`).then((r) => r.json()).catch(() => null);
  if (!health?.ok) throw new Error(`server not healthy at ${BASE}`);
  const studs = await db.select({ id: users.id, collegeId: users.collegeId, batchId: users.batchId }).from(users).where(and(eq(users.role, "student"), like(users.email, "student%@demo.learncrew.in"))).limit(Math.max(N, M));
  if (studs.length < N) throw new Error(`need ${N} demo students, found ${studs.length} — run: npm run db:seed -- --students ${N}`);
  const today = istDate();
  const ids = studs.slice(0, N).map((s) => s.id);
  // fresh drill for today
  const old = await db.select({ id: drills.id }).from(drills).where(and(inArray(drills.userId, ids), eq(drills.date, today), eq(drills.kind, "daily")));
  if (old.length) {
    await db.delete(attempts).where(inArray(attempts.drillId, old.map((d) => d.id)));
    await db.delete(drills).where(inArray(drills.id, old.map((d) => d.id)));
  }
  const cookies = new Map<string, string>();
  for (const s of studs) cookies.set(s.id, await sessionFor(s.id));
  const H = (id: string, json = false) => ({ cookie: cookies.get(id)!, origin: BASE, ...(json ? { "content-type": "application/json" } : {}) });

  // ---- Scenario A: daily drill -------------------------------------------------
  const todaySamples: Sample[] = [];
  const syncSamples: Sample[] = [];
  const tA = performance.now();
  await Promise.all(
    ids.map(async (id, i) => {
      await sleep((i / N) * WINDOW * 1000);
      await timed(todaySamples, `${BASE}/today`, { headers: H(id) });
      const [d] = await db.select().from(drills).where(and(eq(drills.userId, id), eq(drills.date, today), eq(drills.kind, "daily")));
      if (!d) return;
      for (let q = 0; q < d.questionIds.length; q++) {
        await sleep(1500 + Math.random() * 1500); // reading time, compressed
        await timed(syncSamples, `${BASE}/api/sync`, { method: "POST", headers: H(id, true), body: JSON.stringify({ attempts: [{ clientId: `load-${d.id}-${q}`, drillId: d.id, questionId: d.questionIds[q], displayedIndex: Math.floor(Math.random() * 4), timeMs: 20_000 }] }) });
      }
    }),
  );
  const wallA = (performance.now() - tA) / 1000;
  const [{ n: completed }] = await pg`select count(*)::int n from drills where date = ${today} and completed_at is not null and user_id = any(${ids})`;

  // ---- Scenario B: concurrent mock takers --------------------------------------
  const [mock] = await db.select().from(mocks).where(eq(mocks.company, "infosys"));
  const takers = studs.slice(0, M);
  await db.delete(mockAttempts).where(and(inArray(mockAttempts.userId, takers.map((s) => s.id)), eq(mockAttempts.mockId, mock.id)));
  const att = new Map<string, Awaited<ReturnType<typeof startMock>>>();
  for (const s of takers) att.set(s.id, await startMock(s, mock.id));
  const pageSamples: Sample[] = [];
  const saveSamples: Sample[] = [];
  const submitSamples: Sample[] = [];
  const tB = performance.now();
  await Promise.all(
    takers.map(async (s) => {
      const a = att.get(s.id)!;
      await sleep(Math.random() * 3000);
      await timed(pageSamples, `${BASE}/mocks/attempt/${a.id}`, { headers: H(s.id) });
      for (let k = 0; k < 10; k++) {
        await sleep(1500 + Math.random() * 1000);
        const qid = a.questionIds[k % a.questionIds.length];
        await timed(saveSamples, `${BASE}/api/mocks/attempt/${a.id}/save`, { method: "POST", headers: H(s.id, true), body: JSON.stringify({ patch: { [qid]: { choice: Math.floor(Math.random() * 4), visited: true, timeMsDelta: 2000 } }, tabSwitchesDelta: 0 }) });
      }
      await timed(submitSamples, `${BASE}/api/mocks/attempt/${a.id}/submit`, { method: "POST", headers: H(s.id, true), body: "{}" });
    }),
  );
  const wallB = (performance.now() - tB) / 1000;
  const [{ n: submitted }] = await pg`select count(*)::int n from mock_attempts where mock_id = ${mock.id} and ended_at is not null and user_id = any(${takers.map((t) => t.id)})`;

  // cleanup load-test sessions
  await db.delete(sessions).where(inArray(sessions.sessionToken, [...cookies.values()].map((c) => c.split("=")[1])));

  const rows = [summarize("GET /today (build drill)", todaySamples, wallA), summarize("POST /api/sync (answer)", syncSamples, wallA), summarize("GET /mocks/attempt/[id]", pageSamples, wallB), summarize("POST mock autosave", saveSamples, wallB), summarize("POST mock submit", submitSamples, wallB)];
  const table = ["| Endpoint | Requests | RPS | p50 ms | p95 ms | p99 ms | max ms | errors |", "|---|---|---|---|---|---|---|---|", ...rows.map((r) => `| ${r.name} | ${r.requests} | ${r.rps} | ${r.p50} | ${r.p95} | ${r.p99} | ${r.max} | ${r.errors} |`)].join("\n");
  const sync = rows[1];
  const report = `# Load test — ${new Date().toISOString()}

Target: \`${BASE}\` (production build, \`next start\`), Postgres 16 local. Host: ${process.platform} ${process.arch}, ${(await import("node:os")).cpus().length} vCPU.

**Scenario A** — ${N} students each open Today and answer 10 questions (one POST /api/sync per answer, 1.5–3 s apart); arrivals spread over ${WINDOW} s (a 10-minute class window compressed ${Math.round(600 / WINDOW)}×). Wall time ${wallA.toFixed(0)} s. Drills completed: **${completed}/${N}**.

**Scenario B** — ${M} students take the Infosys mock at the same time: load the attempt page, autosave 10 times ~2 s apart, submit. Wall time ${wallB.toFixed(0)} s. Submitted: **${submitted}/${M}**.

${table}

Gate (v1): /api/sync p95 < 500 ms → **${sync.p95 < 500 ? "PASS" : "FAIL"}** (p95 ${sync.p95} ms, ${sync.errors} errors).
Gate (v2): 200 concurrent mock-takers → **${submitted === M && rows[3].errors === 0 ? "PASS" : "FAIL"}**.
`;
  mkdirSync("docs/reports", { recursive: true });
  writeFileSync("docs/reports/load-test.md", report);
  console.log(report);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pg.end());
