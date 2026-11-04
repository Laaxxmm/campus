import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/learncrew";

const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };
export const pg = globalForDb.pg ?? postgres(url, { max: Number(process.env.DB_POOL ?? 10), prepare: false });
if (process.env.NODE_ENV !== "production") globalForDb.pg = pg;

export const db = drizzle(pg, { schema });
export type DB = typeof db;
export { schema };
