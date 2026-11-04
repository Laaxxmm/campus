import { sql } from "drizzle-orm";
import { db } from "@/db";
import { batches, colleges, users } from "@/db/schema";

export async function resetDb() {
  const rows = await db.execute<{ tablename: string }>(
    sql`select tablename from pg_tables where schemaname = 'public' and tablename <> '__drizzle_migrations'`,
  );
  const names = rows.map((r) => `"${r.tablename}"`).join(", ");
  if (names) await db.execute(sql.raw(`TRUNCATE ${names} RESTART IDENTITY CASCADE`));
}

let n = 0;
export async function makeCollege(name = `College ${++n}`) {
  const [c] = await db.insert(colleges).values({ name, bankSeed: 1000 + n }).returning();
  const [b] = await db.insert(batches).values({ collegeId: c.id, name: `${name} 2027 CSE`, gradYear: 2027, targetCompany: "tcs_nqt" }).returning();
  return { college: c, batch: b };
}

export async function makeUser(opts: { collegeId: string | null; batchId?: string | null; role?: "student" | "tpo" | "admin" | "content" | "superadmin"; email?: string; name?: string }) {
  const [u] = await db
    .insert(users)
    .values({
      collegeId: opts.collegeId,
      batchId: opts.batchId ?? null,
      role: opts.role ?? "student",
      email: opts.email ?? `u${++n}-${Date.now()}@test.in`,
      name: opts.name ?? `User ${n}`,
      consentAt: new Date(),
    })
    .returning();
  return u;
}
