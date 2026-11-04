import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireRole, scoped, type SessionUser } from "@/lib/authz";

type Staff = Pick<SessionUser, "role" | "collegeId">;

/** Student detail for TPO/admin — null when the student is in another college (caller returns 404). */
export async function getStudentForStaff(staff: Staff, studentId: string) {
  requireRole(staff, ["tpo", "admin"]);
  if (!/^[0-9a-f-]{36}$/i.test(studentId)) return null;
  const scope = scoped(staff);
  const [row] = await db
    .select()
    .from(users)
    .where(scope.where(users.collegeId, and(eq(users.id, studentId), eq(users.role, "student"))))
    .limit(1);
  return row ?? null;
}

export async function listStudentsForStaff(staff: Staff) {
  requireRole(staff, ["tpo", "admin"]);
  const scope = scoped(staff);
  return db.select().from(users).where(scope.where(users.collegeId, eq(users.role, "student")));
}
