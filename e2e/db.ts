import postgres from "postgres";
export const e2eSql = () => postgres(process.env.E2E_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/learncrew_e2e", { max: 1 });
