import { execSync } from "node:child_process";
import postgres from "postgres";

export default async function globalSetup() {
  const url = process.env.E2E_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/learncrew_e2e";
  const env = { ...process.env, DATABASE_URL: url };
  execSync("node scripts/migrate.mjs", { stdio: "inherit", env });
  execSync("npx tsx scripts/seed.ts", { stdio: "inherit", env });
  const sql = postgres(url, { max: 1 });
  await sql`truncate rate_limits`;
  // Remove rows created by previous e2e runs so every run starts from the same state.
  await sql`delete from invites where email like 'roster%@demo.learncrew.in' or email in ('asha.varma@demo.learncrew.in','comma.name@demo.learncrew.in') or email like '%@e2e-college.in'`;
  await sql`delete from users where email like 'roster%@demo.learncrew.in' or email in ('asha.varma@demo.learncrew.in','comma.name@demo.learncrew.in') or email like '%@e2e-college.in'`;
  await sql`delete from college_question_access where college_id in (select id from colleges where name like 'E2E College%')`;
  await sql`delete from colleges where name like 'E2E College%'`;
  await sql`delete from batch_mocks`;
  await sql`update questions set status = 'golden' where status <> 'golden' and source = 'seed'`;
  await sql.end();
}
