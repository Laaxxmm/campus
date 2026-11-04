import { and, eq, sql } from "drizzle-orm";
import { db } from "./index";
import { batches, colleges, users } from "./schema";

export const DEMO = {
  college: "Demo Engineering College, Chennai",
  otherCollege: "Sample Institute of Technology, Coimbatore",
  tpo: "tpo@demo.learncrew.in",
  admin: "admin@demo.learncrew.in",
  content: "content@learncrew.in",
  newStudent: "newstudent@demo.learncrew.in",
  /** Fresh-every-seed students for e2e (activity wiped on each seed run). */
  freshStudents: ["drill.student@demo.learncrew.in", "offline.student@demo.learncrew.in", "mock.student@demo.learncrew.in", "smoke.student@demo.learncrew.in"],
  student: (i: number) => `student${String(i).padStart(3, "0")}@demo.learncrew.in`,
  otherTpo: "tpo@sample.learncrew.in",
  otherStudent: (i: number) => `student${String(i).padStart(3, "0")}@sample.learncrew.in`,
};

const FIRST = ["Aarav", "Priya", "Karthik", "Divya", "Rahul", "Sneha", "Arjun", "Lakshmi", "Vikram", "Ananya", "Surya", "Meera", "Rohan", "Kavya", "Aditya", "Pooja", "Harish", "Nithya", "Siddharth", "Revathi", "Manoj", "Deepika", "Gokul", "Swathi", "Naveen", "Keerthana", "Ajay", "Bhavana", "Pranav", "Ishwarya"];
const LAST = ["Kumar", "Sharma", "Iyer", "Reddy", "Nair", "Raman", "Patel", "Menon", "Rao", "Subramanian", "Krishnan", "Pillai", "Das", "Singh", "Gupta"];
export function demoName(i: number) {
  return `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`;
}

async function upsertCollege(name: string, city: string, bankSeed: number, seats: number) {
  const [existing] = await db.select().from(colleges).where(eq(colleges.name, name)).limit(1);
  if (existing) return existing;
  const [c] = await db.insert(colleges).values({ name, city, bankSeed, seats, plan: "pilot" }).returning();
  return c;
}

async function upsertBatch(collegeId: string, name: string, v: { gradYear: number; branch: string; targetCompany: string; targetDriveDate: string }) {
  const [existing] = await db.select().from(batches).where(and(eq(batches.collegeId, collegeId), eq(batches.name, name))).limit(1);
  if (existing) return existing;
  const [b] = await db.insert(batches).values({ collegeId, name, ...v }).returning();
  return b;
}

type Role = "student" | "tpo" | "admin" | "content" | "superadmin";
export async function upsertUser(v: { email: string; name: string; role: Role; collegeId: string | null; batchId?: string | null; rollNo?: string | null; consent: boolean; targetCompany?: string | null; resetConsent?: boolean }) {
  const email = v.email.toLowerCase();
  const values = {
    email,
    name: v.name,
    role: v.role,
    collegeId: v.collegeId,
    batchId: v.batchId ?? null,
    rollNo: v.rollNo ?? null,
    targetCompany: v.targetCompany ?? null,
    consentAt: v.consent ? new Date("2026-10-01T04:00:00Z") : null,
  };
  const [u] = await db
    .insert(users)
    .values(values)
    .onConflictDoUpdate({
      target: users.email,
      set: {
        role: values.role,
        collegeId: values.collegeId,
        batchId: values.batchId,
        ...(v.resetConsent ? { consentAt: null, name: values.name, rollNo: values.rollNo, targetCompany: null } : {}),
      },
    })
    .returning();
  return u;
}

export async function resetActivity(userId: string) {
  await db.execute(sql`delete from attempts where user_id = ${userId}`);
  await db.execute(sql`delete from mock_attempts where user_id = ${userId}`);
  await db.execute(sql`delete from drills where user_id = ${userId}`);
  await db.execute(sql`delete from review_queue where user_id = ${userId}`);
  await db.execute(sql`delete from skills where user_id = ${userId}`);
  await db.execute(sql`delete from streaks where user_id = ${userId}`);
  await db.execute(sql`delete from readiness_snapshots where user_id = ${userId}`);
  await db.update(users).set({ xp: 0, lastActiveAt: null }).where(eq(users.id, userId));
}

export type SeedOptions = { students: number; activity: boolean };

export async function seedPeople(opts: SeedOptions) {
  const demo = await upsertCollege(DEMO.college, "Chennai", 424242, Math.max(200, opts.students + 50));
  if (demo.seats < opts.students + 10) await db.update(colleges).set({ seats: opts.students + 50 }).where(eq(colleges.id, demo.id));
  const other = await upsertCollege(DEMO.otherCollege, "Coimbatore", 777001, 200);

  const b1 = await upsertBatch(demo.id, "2027 CSE-A", { gradYear: 2027, branch: "CSE", targetCompany: "tcs_nqt", targetDriveDate: "2027-01-20" });
  const b2 = await upsertBatch(demo.id, "2027 ECE", { gradYear: 2027, branch: "ECE", targetCompany: "infosys", targetDriveDate: "2027-02-10" });
  const ob = await upsertBatch(other.id, "2027 IT", { gradYear: 2027, branch: "IT", targetCompany: "wipro", targetDriveDate: "2027-03-01" });

  const superEmail = process.env.SUPERADMIN_EMAIL || "founder@learncrew.in";
  await upsertUser({ email: superEmail, name: "Superadmin", role: "superadmin", collegeId: null, consent: true });
  await upsertUser({ email: DEMO.tpo, name: "R. Raman (TPO)", role: "tpo", collegeId: demo.id, consent: true });
  await upsertUser({ email: DEMO.admin, name: "College Admin", role: "admin", collegeId: demo.id, consent: true });
  await upsertUser({ email: DEMO.content, name: "Content Reviewer", role: "content", collegeId: null, consent: true });
  await upsertUser({ email: DEMO.otherTpo, name: "Other TPO", role: "tpo", collegeId: other.id, consent: true });
  await upsertUser({ email: DEMO.newStudent, name: "Nikhil Rao", role: "student", collegeId: demo.id, batchId: b1.id, rollNo: "21CS999", consent: false, resetConsent: true });

  for (const [i, email] of DEMO.freshStudents.entries()) {
    const u = await upsertUser({ email, name: ["Meera Krishnan", "Vikram Rao", "Ishwarya Nair", "Gokul Raman"][i] ?? `Student ${i + 1}`, role: "student", collegeId: demo.id, batchId: b1.id, rollNo: `21CS9${i}0`, consent: true, targetCompany: "tcs_nqt" });
    await resetActivity(u.id);
    await db.update(users).set({ consentAt: new Date("2026-10-01T04:00:00Z") }).where(eq(users.id, u.id));
  }

  const students = [];
  for (let i = 1; i <= opts.students; i++) {
    const batch = i % 2 === 0 ? b2 : b1;
    students.push(
      await upsertUser({
        email: DEMO.student(i),
        name: demoName(i),
        role: "student",
        collegeId: demo.id,
        batchId: batch.id,
        rollNo: `${batch.branch === "ECE" ? "21EC" : "21CS"}${String(i).padStart(3, "0")}`,
        consent: true,
        targetCompany: batch.targetCompany,
      }),
    );
  }
  const otherStudents = [];
  for (let i = 1; i <= 10; i++) {
    otherStudents.push(
      await upsertUser({ email: DEMO.otherStudent(i), name: demoName(i + 100), role: "student", collegeId: other.id, batchId: ob.id, rollNo: `21IT${String(i).padStart(3, "0")}`, consent: true, targetCompany: "wipro" }),
    );
  }
  return { demo, other, batches: [b1, b2, ob], students, otherStudents };
}

export async function counts() {
  const r = await db.execute<{ t: string; n: number }>(sql`
    select 'colleges' t, count(*)::int n from colleges union all
    select 'batches', count(*)::int from batches union all
    select 'users', count(*)::int from users union all
    select 'questions', count(*)::int from questions union all
    select 'access', count(*)::int from college_question_access union all
    select 'mocks', count(*)::int from mocks union all
    select 'drills', count(*)::int from drills union all
    select 'attempts', count(*)::int from attempts union all
    select 'skills', count(*)::int from skills union all
    select 'streaks', count(*)::int from streaks`);
  return Object.fromEntries(r.map((x) => [x.t, x.n]));
}

export async function seedAll(opts: SeedOptions) {
  const { seedQuestions, seedBlueprintsAndMocks, seedActivity, syncCollegeAccess } = await import("./seed-content");
  await seedQuestions();
  await seedBlueprintsAndMocks();
  const people = await seedPeople(opts);
  await syncCollegeAccess();
  if (opts.activity) await seedActivity([...people.students, ...people.otherStudents]);
  return counts();
}
