import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole, requireUser } from "@/lib/authz";
import { companyName } from "@/lib/companies";
import { mockSummary, startMock } from "@/server/services/mocks";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

async function start(formData: FormData) {
  "use server";
  const user = requireRole(await requireUser(), ["student"]);
  const a = await startMock(user, String(formData.get("mockId") ?? ""));
  redirect(`/mocks/attempt/${a.id}`);
}

const SECTION: Record<string, string> = { quant: "Quantitative aptitude", logical: "Logical reasoning", verbal: "Verbal ability", coding: "Programming (MCQ)" };

export default async function MockIntro({ params }: { params: Promise<{ id: string }> }) {
  const user = requireRole(await requireUser(), ["student"]);
  const { id } = await params;
  const m = await mockSummary(user, id);
  if (!m) notFound();
  return (
    <div className="space-y-6">
      <Link href="/mocks" className="inline-flex min-h-11 items-center gap-1 text-sm text-ink-900"><ArrowLeft aria-hidden className="h-4 w-4" /> All mocks</Link>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-text-600">{companyName(m.company)}</div>
        <h1 className="text-2xl font-bold text-ink-900">{m.title}</h1>
      </div>
      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md border border-border bg-bg p-4"><dt className="text-xs text-text-600">Questions</dt><dd className="text-xl font-bold tabular">{m.questionCount}</dd></div>
        <div className="rounded-md border border-border bg-bg p-4"><dt className="text-xs text-text-600">Duration</dt><dd className="text-xl font-bold tabular">{Math.round(m.durationSec / 60)}m</dd></div>
        <div className="rounded-md border border-border bg-bg p-4"><dt className="text-xs text-text-600">Marking</dt><dd className="text-sm font-bold">+{m.markCorrect} / {m.negativeMark ? `−${m.negativeMark}` : "0"}</dd></div>
      </dl>
      <section className="rounded-md border border-border bg-bg p-4">
        <h2 className="font-semibold">Sections</h2>
        <ul className="mt-2 divide-y divide-border text-sm">
          {m.sections.map((s) => (
            <li key={s.section} className="flex justify-between py-2"><span>{SECTION[s.section] ?? s.section}</span><span className="tabular text-text-600">{s.count} Q{m.sectional ? ` · ${Math.round((m.durationSec * s.count) / m.questionCount / 60)} min` : ""}</span></li>
          ))}
        </ul>
      </section>
      <section className="rounded-md border border-border bg-bg p-4 text-sm">
        <h2 className="font-semibold">Instructions</h2>
        <ul className="mt-2 list-disc space-y-2 pl-6 text-text-600">
          <li>{m.instructions}</li>
          <li>The timer runs on our server — closing the app doesn&apos;t pause it. The test submits automatically at 0:00.</li>
          <li>Use the question palette to jump around; &ldquo;Mark for review&rdquo; flags a question to revisit.</li>
          <li>On a keyboard: 1–4 choose, N next, P previous, F flag.</li>
          <li>Switching tabs is counted and shown to your TPO.</li>
        </ul>
      </section>
      <form action={start}>
        <input type="hidden" name="mockId" value={m.id} />
        <Button type="submit" variant="cta" size="lg" data-testid="start-mock">{m.activeAttemptId ? "Resume test" : "Start test"}</Button>
      </form>
      {m.best && <Link href={`/mocks/attempt/${m.best.attemptId}/result`} className="block text-center text-sm text-info-500 underline">See your best result ({m.best.marks}/{m.best.maxMarks})</Link>}
    </div>
  );
}
