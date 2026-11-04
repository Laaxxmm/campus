import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lightbulb } from "lucide-react";
import { requireRole, requireUser } from "@/lib/authz";
import { topicById } from "@/lib/question-schema";
import { renderStem } from "@/lib/mini-markdown";
import { conceptCardsFor } from "@/server/services/companies";
import { startFocusDrill } from "@/app/actions/focus";
import { StudentPage } from "@/components/StudentPage";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function Learn({ params }: { params: Promise<{ topic: string }> }) {
  requireRole(await requireUser(), ["student"]);
  const { topic } = await params;
  const t = topicById.get(topic);
  if (!t) notFound();
  const cards = await conceptCardsFor([topic]);
  return (
    <StudentPage
      eyebrow={
        <Link href="/companies" className="inline-flex min-h-11 items-center gap-1 text-ink-900 hover:underline">
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Companies
        </Link>
      }
      title={t.name}
      subtitle="Read the cards (about a minute each), then test yourself."
    >
      <ul className="space-y-4" data-testid="concept-cards">
        {cards.map((c) => (
          <li key={c.id} className="rounded-md border border-border bg-bg p-6 lg:p-8">
            <h2 className="text-lg font-semibold text-ink-900">{c.title}</h2>
            <div className="mt-4 text-base leading-relaxed text-text-900">{renderStem(c.body)}</div>
            {c.example && <div className="mt-4 rounded-sm bg-surface p-4 text-base text-text-900">{renderStem(c.example)}</div>}
            {c.interviewTip && (
              <p className="mt-4 flex gap-2 rounded-sm border border-accent-500 bg-accent-50 p-4 text-sm text-text-900">
                <Lightbulb aria-hidden className="h-5 w-5 shrink-0 text-accent-600" />
                {c.interviewTip}
              </p>
            )}
          </li>
        ))}
        {!cards.length && <li className="text-base text-text-600">Concept cards for this topic are coming soon.</li>}
      </ul>
      <form action={startFocusDrill} className="pt-2">
        <input type="hidden" name="topics" value={topic} />
        <Button type="submit" variant="cta" size="lg" className="w-full" data-testid="learn-drill" data-cta="primary">
          Test yourself · 10 Q
        </Button>
      </form>
    </StudentPage>
  );
}
