// Forward-only migrations. Plain JS so it runs inside the production image without tsx.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { existsSync, readFileSync } from "node:fs";

for (const f of [".env.local", ".env"]) {
  if (!process.env.DATABASE_URL && existsSync(f)) {
    for (const line of readFileSync(f, "utf8").split("\n")) {
      const m = line.match(/^DATABASE_URL=(.*)$/);
      if (m) process.env.DATABASE_URL = m[1].trim();
    }
  }
}
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL missing"); process.exit(1); }

const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  await migrate(drizzle(sql), { migrationsFolder: process.env.MIGRATIONS_DIR ?? "./drizzle" });
  console.log("migrations applied");
} finally {
  await sql.end();
}
