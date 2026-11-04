import { execSync } from "node:child_process";

/** Migrate the dedicated test database once before the unit/integration suite. */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/learncrew_test";
  execSync("node scripts/migrate.mjs", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
}
