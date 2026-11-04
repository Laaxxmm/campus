import { afterAll, describe, expect, it } from "vitest";
import { pg } from "@/db";
import { GET } from "@/app/api/health/route";

afterAll(() => pg.end());
describe("/api/health", () => {
  it("returns ok + db true when Postgres answers", async () => {
    const r = await GET();
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true, db: true });
  });
});
