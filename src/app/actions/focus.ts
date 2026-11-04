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
