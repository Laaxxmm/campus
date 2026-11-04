# Load test — 2026-11-04T16:12:10.174Z

Target: `http://localhost:3300` (production build, `next start`), Postgres 16 local. Host: linux x64, 4 vCPU.

**Scenario A** — 500 students each open Today and answer 10 questions (one POST /api/sync per answer, 1.5–3 s apart); arrivals spread over 120 s (a 10-minute class window compressed 5×). Wall time 143 s. Drills completed: **500/500**.

**Scenario B** — 200 students take the Infosys mock at the same time: load the attempt page, autosave 10 times ~2 s apart, submit. Wall time 25 s. Submitted: **200/200**.

| Endpoint | Requests | RPS | p50 ms | p95 ms | p99 ms | max ms | errors |
|---|---|---|---|---|---|---|---|
| GET /today (build drill) | 500 | 3.5 | 40 | 67 | 88 | 215 | 0 |
| POST /api/sync (answer) | 5000 | 34.9 | 17 | 35 | 50 | 80 | 0 |
| GET /mocks/attempt/[id] | 200 | 7.9 | 321 | 829 | 866 | 874 | 0 |
| POST mock autosave | 2000 | 79.4 | 11 | 32 | 68 | 108 | 0 |
| POST mock submit | 200 | 7.9 | 18 | 55 | 73 | 76 | 0 |

Gate (v1): /api/sync p95 < 500 ms → **PASS** (p95 35 ms, 0 errors).
Gate (v2): 200 concurrent mock-takers → **PASS**.
