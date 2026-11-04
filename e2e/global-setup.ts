import { execSync } from "node:child_process";

export default function globalSetup() {
  const env = { ...process.env, DATABASE_URL: process.env.E2E_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/learncrew_e2e" };
  execSync("node scripts/migrate.mjs", { stdio: "inherit", env });
  execSync("npx tsx scripts/seed.ts", { stdio: "inherit", env });
}
