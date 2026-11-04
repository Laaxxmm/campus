// Railway cron service entry: `node scripts/cron.mjs build-drills` (30 23 * * * UTC = 05:00 IST)
// and `node scripts/cron.mjs weekly` (0 1 * * 1). Calls the web service so all logic stays in one place.
const job = process.argv[2] ?? "build-drills";
const base = process.env.APP_BASE_URL || process.env.CRON_TARGET_URL;
const secret = process.env.CRON_SECRET;
if (!base || !secret) {
  console.error("APP_BASE_URL and CRON_SECRET are required");
  process.exit(2);
}
const res = await fetch(new URL(`/api/cron/${job}`, base), { method: "POST", headers: { authorization: `Bearer ${secret}` } });
const body = await res.text();
console.log(JSON.stringify({ job, status: res.status, body: body.slice(0, 2000) }));
process.exit(res.ok ? 0 : 1);
