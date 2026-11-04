import { execSync } from "node:child_process";
import postgres from "postgres";

export default async function globalSetup() {
  const url = process.env.E2E_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/learncrew_e2e";
  const env = { ...process.env, DATABASE_URL: url };
  execSync("node scripts/migrate.mjs", { stdio: "inherit", env });
  execSync("npx tsx scripts/seed.ts", { stdio: "inherit", env });
  const sql = postgres(url, { max: 1 });
  await sql`truncate rate_limits`;
  await sql.end();
}
