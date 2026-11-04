import { requireRole, requireUser } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function TpoHome() {
  requireRole(await requireUser(), ["tpo", "admin"]);
  return <main className="p-4"><h1 className="text-xl font-bold">TPO overview</h1></main>;
}
