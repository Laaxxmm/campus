"use server";
import { redirect } from "next/navigation";
import { requireRole, requireUser } from "@/lib/authz";
import { createFocusDrill } from "@/server/services/insights";

/** One-tap "Start focus drill" from any insight card. */
export async function startFocusDrill(formData: FormData) {
  const user = requireRole(await requireUser(), ["student"]);
  const topics = String(formData.get("topics") ?? "").split(",").filter(Boolean);
  let id: string;
  try {
    id = (await createFocusDrill(user, topics)).id;
  } catch {
    redirect("/insights?error=focus");
  }
  redirect(`/drill/${id}`);
}

/** Start a TPO-assigned focus pack (questions/day from the assignment). */
export async function startAssignedPack(formData: FormData) {
  const user = requireRole(await requireUser(), ["student"]);
  const { myAssignments } = await import("@/server/services/tpo-coach");
  const a = (await myAssignments(user.id)).find((x) => x.id === String(formData.get("assignment")));
  if (!a) redirect("/today");
  let id: string;
  try {
    id = (await createFocusDrill(user, a.topics, { assignmentId: a.id, size: a.questionsPerDay })).id;
  } catch {
    redirect("/insights?error=focus");
  }
  redirect(`/drill/${id}`);
}
