import { notFound, redirect } from "next/navigation";
import { requireRole, requireUser } from "@/lib/authz";
import { attemptForClient, MockError } from "@/server/services/mocks";
import { MockRunner } from "@/components/mock/MockRunner";

export const dynamic = "force-dynamic";

export default async function MockAttempt({ params }: { params: Promise<{ id: string }> }) {
  const user = requireRole(await requireUser(), ["student"]);
  const { id } = await params;
  let data;
  try {
    data = await attemptForClient(user, id);
  } catch (e) {
    if (e instanceof MockError && e.status === 404) notFound();
    throw e;
  }
  if (data.ended) redirect(`/mocks/attempt/${id}/result`);
  return <MockRunner data={data} />;
}
