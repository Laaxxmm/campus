import { describe, expect, it } from "vitest";
import { rolesFor } from "./routes";
import type { AppRole } from "@/types/next-auth";

const ROLES: AppRole[] = ["student", "tpo", "admin", "content", "superadmin"];
// Expected access matrix (docs/QA_MATRIX.md). ✓ = allowed by middleware; page-level checks narrow further.
const MATRIX: Record<string, AppRole[]> = {
  "/today": ["student"],
  "/drill/abc": ["student"],
  "/drill/abc/done": ["student"],
  "/mocks": ["student"],
  "/mocks/attempt/x": ["student"],
  "/progress": ["student"],
  "/profile": ["student"],
  "/leaderboard": ["student"],
  "/insights": ["student"],
  "/companies/tcs_nqt": ["student"],
  "/companies/tcs_nqt/skills": ["student"],
  "/profile-coach": ["student"],
  "/onboarding": ["student"],
  "/tpo": ["tpo", "admin", "superadmin"],
  "/tpo/students/123": ["tpo", "admin", "superadmin"],
  "/admin/import": ["admin", "tpo", "superadmin"],
  "/content/review": ["content", "superadmin"],
  "/super": ["superadmin"],
};

describe("RBAC matrix (deny by default)", () => {
  for (const [path, allowed] of Object.entries(MATRIX)) {
    for (const role of ROLES) {
      const expected = allowed.includes(role);
      it(`${role.padEnd(10)} ${expected ? "can" : "cannot"} open ${path}`, () => {
        expect(rolesFor(path)?.includes(role) ?? false).toBe(expected);
      });
    }
  }
  it("public paths are unguarded", () => {
    for (const p of ["/", "/login", "/login/check-email", "/privacy", "/offline.html", "/api/health"]) expect(rolesFor(p)).toBeNull();
  });
});
