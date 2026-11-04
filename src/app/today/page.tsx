import { requireRole, requireUser } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function Today() {
  const user = requireRole(await requireUser(), ["student"]);
  return <main className="p-4"><h1 className="text-xl font-bold">Today</h1><p data-testid="hello">Hi {user.name}</p></main>;
}
