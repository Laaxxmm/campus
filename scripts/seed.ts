/**
 * Idempotent demo seed. Run twice → same counts.
 *   npm run db:seed                 # 40 demo students
 *   npm run db:seed -- --students 500
 */
import "./env";
import { seedAll } from "../src/db/seed-lib";
import { pg } from "../src/db";

const argv = process.argv.slice(2);
const idx = argv.indexOf("--students");
const students = idx >= 0 ? Number(argv[idx + 1]) : 40;
const noActivity = argv.includes("--no-activity");

seedAll({ students, activity: !noActivity })
  .then((counts) => {
    console.log("seed done", counts);
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pg.end());
