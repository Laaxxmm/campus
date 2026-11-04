"use server";
import { redirect } from "next/navigation";
import { requireRole, requireUser } from "@/lib/authz";
import { hit } from "@/lib/rate-limit";
import { analyseResume, CoachError, draftForMe, grantConsent, revokeConsent, saveLinkedin, setShared } from "@/server/services/profile-coach";

const back = (q: string) => redirect(`/profile-coach?${q}`);

export async function uploadResume(formData: FormData) {
  const user = requireRole(await requireUser(), ["student"]);
  const file = formData.get("resume");
  if (!(file instanceof File) || !file.size) back("error=" + encodeURIComponent("Choose a PDF file"));
  if (!(await hit("upload", user.id)).ok) back("error=" + encodeURIComponent("Too many uploads — try again in an hour"));
  try {
    await analyseResume(user, new Uint8Array(await (file as File).arrayBuffer()), { processingConsent: formData.get("consent") === "on", storeText: formData.get("store") === "on" });
  } catch (e) {
    back("error=" + encodeURIComponent(e instanceof CoachError ? e.message : "Upload failed"));
  }
  back("tab=resume&ok=resume");
}

export async function saveLinkedinAction(formData: FormData) {
  const user = requireRole(await requireUser(), ["student"]);
  const f = Object.fromEntries(formData);
  await saveLinkedin(user, { ...f, hasPhoto: f.hasPhoto === "on", customUrl: f.customUrl === "on", hasEducation: f.hasEducation === "on" });
  back("tab=linkedin&ok=linkedin");
}

export async function draftAction(formData: FormData) {
  const user = requireRole(await requireUser(), ["student"]);
  const kind = formData.get("kind") === "linkedin" ? "linkedin" : "resume";
  if (formData.get("consent") === "on") await grantConsent(user, "ai_drafts");
  if (!(await hit("draft", user.id)).ok) back(`tab=${kind}&error=` + encodeURIComponent("Please wait before asking for another draft"));
  try {
    await draftForMe(user, kind);
  } catch (e) {
    back(`tab=${kind}&error=` + encodeURIComponent(e instanceof CoachError ? e.message : "Draft failed"));
  }
  back(`tab=${kind}&ok=draft`);
}

export async function shareAction(formData: FormData) {
  const user = requireRole(await requireUser(), ["student"]);
  await setShared(user, String(formData.get("id")), formData.get("shared") === "true");
  back(`tab=${formData.get("kind") ?? "resume"}`);
}

export async function forgetResumeText() {
  const user = requireRole(await requireUser(), ["student"]);
  await revokeConsent(user, "resume_storage");
  back("tab=resume&ok=forgot");
}
