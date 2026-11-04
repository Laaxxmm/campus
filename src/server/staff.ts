import { redirect } from "next/navigation";
import { requireRole, requireUser } from "@/lib/authz";
import { collegeInfo } from "@/server/services/tpo";

/** For TPO/admin pages: the acting college (superadmin picks via ?college=, else goes to /super). */
export async function staffContext(collegeParam?: string) {
  const user = requireRole(await requireUser(), ["tpo", "admin"]);
  const collegeId = user.role === "superadmin" ? collegeParam : user.collegeId;
  if (!collegeId) redirect("/super");
  const college = await collegeInfo(collegeId);
  if (!college) redirect(user.role === "superadmin" ? "/super" : "/403");
  return { user, collegeId, college, opts: { collegeId } };
}
