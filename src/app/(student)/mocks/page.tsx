import { requireRole, requireUser } from "@/lib/authz";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

export default async function Mocks() {
  requireRole(await requireUser(), ["student"]);
  return <EmptyState title="Mocks are coming" body="Company-pattern mock tests unlock in the next release." />;
}
