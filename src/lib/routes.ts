import type { AppRole } from "@/types/next-auth";

/** Route prefix → allowed roles. superadmin is allowed everywhere except student-only screens. */
export const ROUTE_ROLES: { prefix: string; roles: AppRole[] }[] = [
  { prefix: "/onboarding", roles: ["student"] },
  { prefix: "/today", roles: ["student"] },
  { prefix: "/drill", roles: ["student"] },
  { prefix: "/mocks", roles: ["student"] },
  { prefix: "/progress", roles: ["student"] },
  { prefix: "/leaderboard", roles: ["student"] },
  { prefix: "/profile", roles: ["student"] },
  { prefix: "/insights", roles: ["student"] },
  { prefix: "/companies", roles: ["student"] },
  { prefix: "/profile-coach", roles: ["student"] },
  { prefix: "/learn", roles: ["student"] },
  { prefix: "/tpo", roles: ["tpo", "admin", "superadmin"] },
  { prefix: "/admin", roles: ["admin", "tpo", "superadmin"] },
  { prefix: "/content", roles: ["content", "superadmin"] },
  { prefix: "/super", roles: ["superadmin"] },
];

export function rolesFor(pathname: string): AppRole[] | null {
  const hit = ROUTE_ROLES.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));
  return hit ? hit.roles : null;
}

export function homeFor(role: AppRole, consented: boolean): string {
  switch (role) {
    case "student":
      return consented ? "/today" : "/onboarding";
    case "tpo":
    case "admin":
      return "/tpo";
    case "content":
      return "/content/review";
    case "superadmin":
      return "/super";
  }
}
