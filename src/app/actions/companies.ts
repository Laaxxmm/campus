"use server";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requireRole, requireUser } from "@/lib/authz";
import { markHrPracticed, setSelfSkill, setTargets } from "@/server/services/companies";

export async function saveTargets(formData: FormData) {
  const user = requireRole(await requireUser(), ["student"]);
  try {
    await setTargets(user, { companies: formData.getAll("companies").map(String), dream: String(formData.get("dream") ?? "") });
  } catch (e) {
    redirect(`/companies?error=${encodeURIComponent(e instanceof ZodError ? e.issues[0]?.message ?? "invalid" : "Could not save")}`);
  }
  redirect("/companies?saved=1");
}

export async function saveSelfSkill(formData: FormData) {
  const user = requireRole(await requireUser(), ["student"]);
  const back = String(formData.get("back") ?? "/companies");
  try {
    await setSelfSkill(user, { skill: formData.get("skill"), status: formData.get("status"), evidence: String(formData.get("evidence") ?? "") });
  } catch {
    redirect(`${back}?error=1`);
  }
  redirect(`${back}?saved=1`);
}

export async function practisedHr(formData: FormData) {
  const user = requireRole(await requireUser(), ["student"]);
  await markHrPracticed(user, String(formData.get("id") ?? ""));
  redirect(`${String(formData.get("back") ?? "/companies")}#hr`);
}
