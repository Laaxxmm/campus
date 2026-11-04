import { and, eq, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import type { AppRole } from "@/types/next-auth";

export type SessionUser = {
  id: string;
  role: AppRole;
  collegeId: string | null;
  batchId: string | null;
  email: string;
  name: string | null;
  consentAt: string | null;
};

export class ForbiddenError extends Error {
  status = 403 as const;
  constructor(msg = "Forbidden") {
    super(msg);
  }
}
export class UnauthorizedError extends Error {
  status = 401 as const;
  constructor(msg = "Unauthorized") {
    super(msg);
  }
}

export const STAFF_ROLES: AppRole[] = ["tpo", "admin"];

/** Server-only: current session user or throw (redirect to /login when `redirectTo` is set). */
export async function requireUser(opts: { redirect?: boolean } = { redirect: true }): Promise<SessionUser> {
  const { auth } = await import("@/auth");
  const session = await auth();
  if (!session?.user?.id) {
    if (opts.redirect) {
      const { redirect } = await import("next/navigation");
      redirect("/login");
    }
    throw new UnauthorizedError();
  }
  const u = session.user;
  return {
    id: u.id,
    role: u.role,
    collegeId: u.collegeId,
    batchId: u.batchId,
    email: u.email ?? "",
    name: u.name ?? null,
    consentAt: u.consentAt,
  };
}

/** Throws ForbiddenError unless user has one of the roles. superadmin passes every check. */
export function requireRole<U extends Pick<SessionUser, "role">>(user: U, roles: AppRole[]): U {
  if (user.role === "superadmin" || roles.includes(user.role)) return user;
  throw new ForbiddenError(`role ${user.role} not in [${roles.join(",")}]`);
}

/**
 * College scoping (replaces RLS). Every tpo/admin query MUST add `scope.where(table.collegeId)`.
 * superadmin → no filter. A non-superadmin without a college gets an impossible filter (sees nothing).
 */
export function scoped(user: Pick<SessionUser, "role" | "collegeId">) {
  const all = user.role === "superadmin";
  const collegeId = user.collegeId;
  return {
    all,
    collegeId,
    where(col: PgColumn, extra?: SQL): SQL | undefined {
      if (all) return extra;
      const base = collegeId ? eq(col, collegeId) : eq(col, "00000000-0000-0000-0000-000000000000");
      return extra ? and(base, extra) : base;
    },
    owns(rowCollegeId: string | null | undefined) {
      return all || (!!collegeId && rowCollegeId === collegeId);
    },
  };
}
