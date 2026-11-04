import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { requireRole, requireUser } from "@/lib/authz";
import { companyName } from "@/lib/companies";
import { mockSummary, startMock } from "@/server/services/mocks";
import { StudentPage } from "@/components/StudentPage";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";

export const dynamic = "force-dynamic";

async function start(formData: FormData) {
  "use server";
  const user = requireRole(await requireUser(), ["student"]);
  const a = await startMock(user, String(formData.get("mockId") ?? ""));
  redirect(`/mocks/attempt/${a.id}`);
}

const SECTION: Record<string, string> = { quant: "Quantitative aptitude", logical: "Logical reasoning", verbal: "Verbal ability", coding: "Programming (MCQ)" };
const KPI_LABEL = "text-xs font-medium uppercase tracking-wide text-text-600";

export default async function MockIntro({ params }: { params: Promise<{ id: string }> }) {
  const user = requireRole(await requireUser(), ["student"]);
  const { id } = await params;
  const m = await mockSummary(user, id);
  if (!m) notFound();
  return (
    <StudentPage
      eyebrow={
        <Link href="/mocks" className="inline-flex min-h-11 items-center gap-1 text-ink-900 hover:underline">
          <ArrowLeft aria-hidden className="h-4 w-4" /> All mocks
        </Link>
      }
      title={m.title}
      subtitle={companyName(m.company)}
    >
      <Card>
        <dl className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          <div>
            <dt className={KPI_LABEL}>Questions</dt>
            <dd className="mt-2 text-4xl font-bold leading-none text-ink-900 tabular">{m.questionCount}</dd>
          </div>
          <div>
            <dt className={KPI_LABEL}>Duration</dt>
            <dd className="mt-2 text-4xl font-bold leading-none text-ink-900 tabular">{Math.round(m.durationSec / 60)}m</dd>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className={KPI_LABEL}>Marking</dt>
            <dd className="mt-2 text-4xl font-bold leading-none text-ink-900 tabular sm:text-2xl lg:text-3xl">
              +{m.markCorrect} / {m.negativeMark ? `−${m.negativeMark}` : "0"}
            </dd>
          </div>
        </dl>
      </Card>
      <Card>
        <CardHeader title="Sections" />
        <ul className="divide-y divide-border text-base">
          {m.sections.map((s) => (
            <li key={s.section} className="flex justify-between gap-4 py-2 first:pt-0 last:pb-0">
              <span>{SECTION[s.section] ?? s.section}</span>
              <span className="tabular text-text-600">
                {s.count} Q{m.sectional ? ` · ${Math.round((m.durationSec * s.count) / m.questionCount / 60)} min` : ""}
              </span>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <CardHeader title="Instructions" />
        <ul className="list-disc space-y-2 pl-6 text-base text-text-900">
          <li>{m.instructions}</li>
          <li>The timer runs on our server — closing the app doesn&apos;t pause it. The test submits automatically at 0:00.</li>
          <li>Use the question palette to jump around; &ldquo;Mark for review&rdquo; flags a question to revisit.</li>
          <li>On a keyboard: 1–4 choose, N next, P previous, F flag.</li>
          <li>Switching tabs is counted and shown to your TPO.</li>
        </ul>
      </Card>
      <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center">
        <form action={start}>
          <input type="hidden" name="mockId" value={m.id} />
          <Button type="submit" variant="cta" size="lg" className="w-full sm:w-auto" data-testid="start-mock" data-cta="primary">
            {m.activeAttemptId ? "Resume test" : "Start test"}
          </Button>
        </form>
        {m.best && (
          <Link href={`/mocks/attempt/${m.best.attemptId}/result`} className="inline-flex min-h-11 items-center gap-2 text-base font-semibold text-ink-900 hover:underline">
            See your best result ({m.best.marks}/{m.best.maxMarks}) <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        )}
      </div>
    </StudentPage>
  );
}
