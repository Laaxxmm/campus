import Link from "next/link";
import { FileText, ShieldCheck, Sparkles, UserRoundCheck } from "lucide-react";
import { requireRole, requireUser } from "@/lib/authz";
import { aiEnabled } from "@/lib/llm";
import type { Checklist as C, LinkedInFields } from "@/lib/coach/checklists";
import { coachTemplates, draftsUsedThisMonth, hasConsent, latestReviews, MONTHLY_DRAFTS, type Draft } from "@/server/services/profile-coach";
import { draftAction, forgetResumeText, saveLinkedinAction, shareAction, uploadResume } from "@/app/actions/coach";
import { Checklist } from "@/components/coach/Checklist";
import { CopyText } from "@/components/coach/CopyText";
import { StudentPage } from "@/components/StudentPage";
import { Section } from "@/components/ui/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

function DraftBlock({ kind, draft, reviewId, shared, aiOn, used, consented }: { kind: "resume" | "linkedin"; draft: Draft | null; reviewId: string | null; shared: boolean; aiOn: boolean; used: number; consented: boolean }) {
  return (
    <section className="space-y-4 rounded-md border border-border bg-bg p-6 lg:p-8" aria-labelledby={`${kind}-draft-h`}>
      <h2 id={`${kind}-draft-h`} className="flex items-center gap-2 text-base font-semibold text-ink-900">
        <Sparkles aria-hidden className="h-4 w-4 text-accent-600" />
        Draft for me
      </h2>
      {!aiOn ? (
        <p className="text-base text-text-600">AI drafts aren&apos;t switched on for your college. The templates above are free and always available.</p>
      ) : (
        <form action={draftAction} className="space-y-4 text-sm">
          <input type="hidden" name="kind" value={kind} />
          {!consented && (
            <label className="flex min-h-11 items-start gap-2">
              <input type="checkbox" name="consent" required className="mt-2 h-5 w-5 shrink-0 accent-ink-900" />
              <span className="pt-2">
                I agree to send my {kind === "resume" ? "saved resume text" : "LinkedIn fields"} to an AI model to draft suggestions. Phone, email, links and address are removed first; the draft stays private to me unless I share it.
              </span>
            </label>
          )}
          <Button type="submit" variant="secondary" className="w-full whitespace-normal sm:w-auto" disabled={!reviewId || used >= MONTHLY_DRAFTS}>
            Draft {kind === "resume" ? "summary + bullets" : "headline + About"} ({MONTHLY_DRAFTS - used} left this month)
          </Button>
        </form>
      )}
      {draft && (
        <div className="space-y-4" data-testid={`${kind}-draft`}>
          {draft.headline && <CopyText label="Headline" text={draft.headline} />}
          {draft.summary && <CopyText label="Summary" text={draft.summary} />}
          {draft.about && <CopyText label="About" text={draft.about} />}
          {draft.bullets?.map((b, i) => <CopyText key={i} label={`Bullet ${i + 1}`} text={b.improved} />)}
          <p className="text-sm text-text-600">Check every line is true before using it. Copy it into your resume or LinkedIn yourself — LearnCrew never posts anything.</p>
          {reviewId && (
            <form action={shareAction} className="text-sm">
              <input type="hidden" name="id" value={reviewId} />
              <input type="hidden" name="kind" value={kind} />
              <input type="hidden" name="shared" value={String(!shared)} />
              <button type="submit" className="min-h-11 font-semibold text-ink-900 underline">
                {shared ? "Stop sharing with my TPO" : "Share this draft with my TPO"}
              </button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}

const TAB = "inline-flex min-h-11 items-center gap-2 rounded-pill border px-4 text-sm";
const TAB_ON = "border-ink-900 bg-ink-50 font-semibold text-ink-900";
const TAB_OFF = "border-border bg-bg text-text-900 hover:border-ink-700";
const FIELD = "flex flex-col gap-2 text-sm font-medium text-text-900";
const TEXTAREA = "w-full rounded-sm border border-border bg-bg px-4 py-2 text-base font-normal focus:border-ink-900 focus:outline-2 focus:outline-offset-2 focus:outline-info-500";

export default async function ProfileCoach({ searchParams }: { searchParams: Promise<{ tab?: string; ok?: string; error?: string }> }) {
  const user = requireRole(await requireUser(), ["student"]);
  const sp = await searchParams;
  const tab = sp.tab === "linkedin" ? "linkedin" : "resume";
  const [{ resume, linkedin }, tpl, used, aiConsent] = await Promise.all([latestReviews(user.id), coachTemplates(user.id), draftsUsedThisMonth(user.id), hasConsent(user.id, "ai_drafts")]);
  const li = (linkedin?.input ?? {}) as Partial<LinkedInFields>;
  const aiOn = aiEnabled();
  return (
    <StudentPage title="Profile coach" subtitle="Make your resume and LinkedIn match what your target companies look for. Checklists and templates are free; AI drafts only when you ask.">
      <nav className="flex gap-2" aria-label="Coach sections">
        <Link href="/profile-coach?tab=resume" aria-current={tab === "resume" ? "page" : undefined} className={`${TAB} ${tab === "resume" ? TAB_ON : TAB_OFF}`}>
          <FileText aria-hidden className="h-4 w-4" />
          Resume
        </Link>
        <Link href="/profile-coach?tab=linkedin" aria-current={tab === "linkedin" ? "page" : undefined} className={`${TAB} ${tab === "linkedin" ? TAB_ON : TAB_OFF}`}>
          <UserRoundCheck aria-hidden className="h-4 w-4" />
          LinkedIn
        </Link>
      </nav>
      {sp.error && (
        <p role="alert" className="rounded-sm bg-coral-50 p-4 text-sm text-text-900">
          {sp.error}
        </p>
      )}
      {sp.ok && (
        <p role="status" className="rounded-sm bg-success-50 p-4 text-sm text-success-700">
          {{ resume: "Resume checked.", linkedin: "LinkedIn checklist updated.", draft: "Draft ready below.", forgot: "Saved resume text deleted." }[sp.ok] ?? "Done."}
        </p>
      )}

      {tab === "resume" ? (
        <>
          <div className="space-y-6">
            <form action={uploadResume} className="space-y-4 rounded-md border border-border bg-bg p-6 lg:p-8" data-testid="resume-upload">
              <h2 className="text-base font-semibold text-ink-900">Check my resume (PDF, max 2 MB)</h2>
              <input
                type="file"
                name="resume"
                accept="application/pdf"
                required
                aria-label="Resume PDF"
                className="block min-h-11 w-full text-sm text-text-900 file:mr-4 file:h-11 file:cursor-pointer file:rounded-sm file:border file:border-solid file:border-border file:bg-bg file:px-4 file:font-semibold file:text-ink-900 hover:file:border-ink-700"
              />
              <label className="flex min-h-11 items-start gap-2 text-sm">
                <input type="checkbox" name="consent" required className="mt-2 h-5 w-5 shrink-0 accent-ink-900" />
                <span className="pt-2">
                  <ShieldCheck aria-hidden className="mr-2 inline h-4 w-4" />I consent to LearnCrew reading this file to check it (DPDP Act). The file itself is deleted right after reading.
                </span>
              </label>
              <label className="flex min-h-11 items-start gap-2 text-sm">
                <input type="checkbox" name="store" className="mt-2 h-5 w-5 shrink-0 accent-ink-900" />
                <span className="pt-2">Also save the extracted text so I can use &ldquo;Draft for me&rdquo; later (optional — you can delete it any time).</span>
              </label>
              <Button type="submit" className="w-full sm:w-auto" data-cta="primary">
                Check resume
              </Button>
            </form>
            {resume && (
              <section className="rounded-md border border-border bg-bg p-6 lg:p-8" aria-label="Resume checklist">
                <Checklist c={resume.checklist as C} testid="resume-checklist" />
                {resume.input ? (
                  <form action={forgetResumeText} className="mt-4">
                    <button type="submit" className="min-h-11 text-sm text-ink-900 underline">
                      Delete my saved resume text
                    </button>
                  </form>
                ) : (
                  <p className="mt-6 text-sm text-text-600">Text not saved — only this checklist was kept.</p>
                )}
              </section>
            )}
          </div>
          <Section title="Templates">
            <div className="space-y-4">
              <CopyText label="Resume summary" text={tpl.resumeSummary} />
              <CopyText label="Project bullet pattern" text={tpl.bullet} />
            </div>
          </Section>
          <Section>
            <DraftBlock kind="resume" draft={(resume?.draftText as Draft) ?? null} reviewId={resume?.id ?? null} shared={Boolean(resume?.sharedWithTpo)} aiOn={aiOn} used={used} consented={aiConsent} />
          </Section>
        </>
      ) : (
        <>
          <div className="space-y-6">
            <form action={saveLinkedinAction} className="space-y-4 rounded-md border border-border bg-bg p-6 lg:p-8" data-testid="linkedin-form">
              <h2 className="text-base font-semibold text-ink-900">Your LinkedIn (copy from your profile)</h2>
              <label className={FIELD}>
                Headline
                <Input name="headline" defaultValue={li.headline ?? ""} maxLength={220} className="font-normal" />
              </label>
              <label className={FIELD}>
                About
                <textarea name="about" defaultValue={li.about ?? ""} rows={5} maxLength={2600} className={TEXTAREA} />
              </label>
              <label className={FIELD}>
                Skills (comma-separated)
                <Input name="skills" defaultValue={li.skills ?? ""} className="font-normal" />
              </label>
              <label className={FIELD}>
                Featured links (one per line)
                <textarea name="featured" defaultValue={li.featured ?? ""} rows={2} className={TEXTAREA} />
              </label>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <label className="flex min-h-11 items-center gap-2">
                  <input type="checkbox" name="hasPhoto" defaultChecked={li.hasPhoto} className="h-5 w-5 accent-ink-900" />
                  Profile photo
                </label>
                <label className="flex min-h-11 items-center gap-2">
                  <input type="checkbox" name="hasEducation" defaultChecked={li.hasEducation} className="h-5 w-5 accent-ink-900" />
                  Education filled
                </label>
                <label className="flex min-h-11 items-center gap-2">
                  <input type="checkbox" name="customUrl" defaultChecked={li.customUrl} className="h-5 w-5 accent-ink-900" />
                  Custom URL
                </label>
              </div>
              <Button type="submit" className="w-full sm:w-auto" data-cta="primary">
                Check LinkedIn
              </Button>
              <p className="text-sm text-text-600">We never connect to LinkedIn or read your profile — you paste what you want checked.</p>
            </form>
            {linkedin && (
              <section className="rounded-md border border-border bg-bg p-6 lg:p-8" aria-label="LinkedIn checklist">
                <Checklist c={linkedin.checklist as C} testid="linkedin-checklist" />
              </section>
            )}
          </div>
          <Section title="Templates">
            <div className="space-y-4">
              <CopyText label="Headline" text={tpl.headline} />
              <CopyText label="About" text={tpl.about} />
            </div>
          </Section>
          <Section>
            <DraftBlock kind="linkedin" draft={(linkedin?.draftText as Draft) ?? null} reviewId={linkedin?.id ?? null} shared={Boolean(linkedin?.sharedWithTpo)} aiOn={aiOn} used={used} consented={aiConsent} />
          </Section>
        </>
      )}
    </StudentPage>
  );
}
