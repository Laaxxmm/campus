import { notFound, redirect } from "next/navigation";
import { requireRole, requireUser } from "@/lib/authz";
import { drillForClient } from "@/lib/drill";
import { aiEnabled } from "@/lib/llm";
import { track } from "@/lib/events";
import { DrillRunner } from "@/components/drill/DrillRunner";
import { SwRegister } from "@/components/SwRegister";

export const dynamic = "force-dynamic";

export default async function DrillPage({ params }: { params: Promise<{ drillId: string }> }) {
  const { drillId } = await params;
  const user = requireRole(await requireUser(), ["student"]);
  if (!/^[0-9a-f-]{36}$/i.test(drillId)) notFound();
  const data = await drillForClient(user.id, drillId);
  if (!data) notFound();
  if (data.drill.completedAt) redirect(`/drill/${drillId}/done`);
  if (data.results.length === 0) await track("drill_started", { userId: user.id, collegeId: user.collegeId, props: { drillId } });
  return (
    <>
      <SwRegister />
      <DrillRunner drillId={drillId} items={data.items} initialResults={data.results} explainEnabled={aiEnabled()} />
    </>
  );
}
