import Link from "next/link";
import { FileText, ShieldCheck, Sparkles, UserRoundCheck } from "lucide-react";
import { requireRole, requireUser } from "@/lib/authz";
import { aiEnabled } from "@/lib/llm";
import type { Checklist as C, LinkedInFields } from "@/lib/coach/checklists";
import { coachTemplates, draftsUsedThisMonth, hasConsent, latestReviews, MONTHLY_DRAFTS, type Draft } from "@/server/services/profile-coach";
import { draftAction, forgetResumeText, saveLinkedinAction, shareAction, uploadResume } from "@/app/actions/coach";
import { Checklist } from "@/components/coach/Checklist";
import { CopyText } from "@/components/coach/CopyText";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

function DraftBlock({ kind, draft, reviewId, shared, aiOn, used, consented }: { kind: "resume" | "linkedin"; draft: Draft | null; reviewId: string | null; shared: boolean; aiOn: boolean; used: number; consented: boolean }) {
  return (
    <section className="space-y-4 rounded-md border border-border bg-bg p-4">
      <h3 className="flex items-center gap-2 font-semibold text-ink-900"><Sparkles aria-hidden className="h-4 w-4 text-accent-600" />Draft for me</h3>
      {!aiOn ? (
        <p className="text-sm text-text-600">AI drafts aren&apos;t switched on for your college. The templates above are free and always available.</p>
      ) : (
        <form action={draftAction} className="space-y-2 text-sm">
          <input type="hidden" name="kind" value={kind} />
          {!consented && (
            <label className="flex min-h-11 items-start gap-2"><input type="checkbox" name="consent" required className="mt-2 h-5 w-5 accent-ink-900" /><span>I agree to send my {kind === "resume" ? "saved resume text" : "LinkedIn fields"} to an AI model to draft suggestions. Phone, email, links and address are removed first; the draft stays private to me unless I share it.</span></label>
          )}
          <Button type="submit" variant="secondary" disabled={!reviewId || used >= MONTHLY_DRAFTS}>Draft {kind === "resume" ? "summary + bullets" : "headline + About"} ({MONTHLY_DRAFTS - used} left this month)</Button>
        </form>
      )}
      {draft && (
        <div className="space-y-2" data-testid={`${kind}-draft`}>
          {draft.headline && <CopyText label="Headline" text={draft.headline} />}
          {draft.summary && <CopyText label="Summary" text={draft.summary} />}
          {draft.about && <CopyText label="About" text={draft.about} />}
          {draft.bullets?.map((b, i) => <CopyText key={i} label={`Bullet ${i + 1}`} text={b.improved} />)}
          <p className="text-xs text-text-600">Check every line is true before using it. Copy it into your resume or LinkedIn yourself — LearnCrew never posts anything.</p>
          {reviewId && (
            <form action={shareAction} className="text-xs"><input type="hidden" name="id" value={reviewId} /><input type="hidden" name="kind" value={kind} /><input type="hidden" name="shared" value={String(!shared)} />
              <button type="submit" className="min-h-9 underline">{shared ? "Stop sharing with my TPO" : "Share this draft with my TPO"}</button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}

export default async function ProfileCoach({ searchParams }: { searchParams: Promise<{ tab?: string; ok?: string; error?: string }> }) {
  const user = requireRole(await requireUser(), ["student"]);
  const sp = await searchParams;
  const tab = sp.tab === "linkedin" ? "linkedin" : "resume";
  const [{ resume, linkedin }, tpl, used, aiConsent] = await Promise.all([latestReviews(user.id), coachTemplates(user.id), draftsUsedThisMonth(user.id), hasConsent(user.id, "ai_drafts")]);
  const li = (linkedin?.input ?? {}) as Partial<LinkedInFields>;
  const aiOn = aiEnabled();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-ink-900">Profile coach</h1>
      <p className="text-sm text-text-600">Make your resume and LinkedIn match what your target companies look for. Checklists and templates are free; AI drafts only when you ask.</p>
      <nav className="flex gap-2" aria-label="Coach sections">
        <Link href="/profile-coach?tab=resume" aria-current={tab === "resume" ? "page" : undefined} className={`inline-flex min-h-11 items-center gap-2 rounded-pill border px-4 text-sm ${tab === "resume" ? "border-ink-900 bg-ink-900 text-white" : "border-border bg-bg"}`}><FileText aria-hidden className="h-4 w-4" />Resume</Link>
        <Link href="/profile-coach?tab=linkedin" aria-current={tab === "linkedin" ? "page" : undefined} className={`inline-flex min-h-11 items-center gap-2 rounded-pill border px-4 text-sm ${tab === "linkedin" ? "border-ink-900 bg-ink-900 text-white" : "border-border bg-bg"}`}><UserRoundCheck aria-hidden className="h-4 w-4" />LinkedIn</Link>
      </nav>
      {sp.error && <p role="alert" className="rounded-sm bg-coral-50 p-4 text-sm">{sp.error}</p>}
      {sp.ok && <p role="status" className="rounded-sm bg-success-50 p-4 text-sm">{{ resume: "Resume checked.", linkedin: "LinkedIn checklist updated.", draft: "Draft ready below.", forgot: "Saved resume text deleted." }[sp.ok] ?? "Done."}</p>}

      {tab === "resume" ? (
        <>
          <form action={uploadResume} className="space-y-4 rounded-md border border-border bg-bg p-4" data-testid="resume-upload">
            <h2 className="font-semibold text-ink-900">Check my resume (PDF, max 2 MB)</h2>
            <input type="file" name="resume" accept="application/pdf" required aria-label="Resume PDF" className="block w-full text-sm" />
            <label className="flex min-h-11 items-start gap-2 text-sm"><input type="checkbox" name="consent" required className="mt-2 h-5 w-5 accent-ink-900" /><span><ShieldCheck aria-hidden className="mr-2 inline h-4 w-4" />I consent to LearnCrew reading this file to check it (DPDP Act). The file itself is deleted right after reading.</span></label>
            <label className="flex min-h-11 items-start gap-2 text-sm"><input type="checkbox" name="store" className="mt-2 h-5 w-5 accent-ink-900" /><span>Also save the extracted text so I can use &ldquo;Draft for me&rdquo; later (optional — you can delete it any time).</span></label>
            <Button type="submit">Check resume</Button>
          </form>
          {resume && (
            <section className="rounded-md border border-border bg-bg p-4">
              <Checklist c={resume.checklist as C} testid="resume-checklist" />
              {resume.input ? <form action={forgetResumeText} className="mt-4"><button type="submit" className="min-h-9 text-xs underline">Delete my saved resume text</button></form> : <p className="mt-4 text-xs text-text-600">Text not saved — only this checklist was kept.</p>}
            </section>
          )}
          <section className="space-y-2">
            <h2 className="font-semibold text-ink-900">Templates</h2>
            <CopyText label="Resume summary" text={tpl.resumeSummary} />
            <CopyText label="Project bullet pattern" text={tpl.bullet} />
          </section>
          <DraftBlock kind="resume" draft={(resume?.draftText as Draft) ?? null} reviewId={resume?.id ?? null} shared={Boolean(resume?.sharedWithTpo)} aiOn={aiOn} used={used} consented={aiConsent} />
        </>
      ) : (
        <>
          <form action={saveLinkedinAction} className="space-y-4 rounded-md border border-border bg-bg p-4" data-testid="linkedin-form">
            <h2 className="font-semibold text-ink-900">Your LinkedIn (copy from your profile)</h2>
            <label className="block text-sm">Headline<Input name="headline" defaultValue={li.headline ?? ""} maxLength={220} className="mt-2" /></label>
            <label className="block text-sm">About<textarea name="about" defaultValue={li.about ?? ""} rows={5} maxLength={2600} className="mt-2 w-full rounded-sm border border-border p-2" /></label>
            <label className="block text-sm">Skills (comma-separated)<Input name="skills" defaultValue={li.skills ?? ""} className="mt-2" /></label>
            <label className="block text-sm">Featured links (one per line)<textarea name="featured" defaultValue={li.featured ?? ""} rows={2} className="mt-2 w-full rounded-sm border border-border p-2" /></label>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="hasPhoto" defaultChecked={li.hasPhoto} className="h-5 w-5 accent-ink-900" />Profile photo</label>
              <label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="hasEducation" defaultChecked={li.hasEducation} className="h-5 w-5 accent-ink-900" />Education filled</label>
              <label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="customUrl" defaultChecked={li.customUrl} className="h-5 w-5 accent-ink-900" />Custom URL</label>
            </div>
            <Button type="submit">Check LinkedIn</Button>
            <p className="text-xs text-text-600">We never connect to LinkedIn or read your profile — you paste what you want checked.</p>
          </form>
          {linkedin && <section className="rounded-md border border-border bg-bg p-4"><Checklist c={linkedin.checklist as C} testid="linkedin-checklist" /></section>}
          <section className="space-y-2">
            <h2 className="font-semibold text-ink-900">Templates</h2>
            <CopyText label="Headline" text={tpl.headline} />
            <CopyText label="About" text={tpl.about} />
          </section>
          <DraftBlock kind="linkedin" draft={(linkedin?.draftText as Draft) ?? null} reviewId={linkedin?.id ?? null} shared={Boolean(linkedin?.sharedWithTpo)} aiOn={aiOn} used={used} consented={aiConsent} />
        </>
      )}
    </div>
  );
}
