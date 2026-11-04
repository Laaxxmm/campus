import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lightbulb } from "lucide-react";
import { requireRole, requireUser } from "@/lib/authz";
import { topicById } from "@/lib/question-schema";
import { renderStem } from "@/lib/mini-markdown";
import { conceptCardsFor } from "@/server/services/companies";
import { startFocusDrill } from "@/app/actions/focus";

export const dynamic = "force-dynamic";

export default async function Learn({ params }: { params: Promise<{ topic: string }> }) {
  requireRole(await requireUser(), ["student"]);
  const { topic } = await params;
  const t = topicById.get(topic);
  if (!t) notFound();
  const cards = await conceptCardsFor([topic]);
  return (
    <div className="space-y-4">
      <Link href="/companies" className="inline-flex min-h-11 items-center gap-1 text-sm text-ink-900"><ArrowLeft aria-hidden className="h-4 w-4" />Companies</Link>
      <h1 className="text-xl font-bold text-ink-900">{t.name}</h1>
      <p className="text-sm text-text-600">Read the cards (about a minute each), then test yourself.</p>
      <ul className="space-y-3" data-testid="concept-cards">
        {cards.map((c) => (
          <li key={c.id} className="rounded-md border border-border bg-bg p-4">
            <h2 className="font-semibold text-ink-900">{c.title}</h2>
            <div className="mt-1 text-sm leading-relaxed">{renderStem(c.body)}</div>
            {c.example && <div className="mt-2 text-sm">{renderStem(c.example)}</div>}
            {c.interviewTip && <p className="mt-2 flex gap-2 rounded-sm bg-accent-50 p-2 text-xs"><Lightbulb aria-hidden className="h-4 w-4 shrink-0 text-accent-600" />{c.interviewTip}</p>}
          </li>
        ))}
        {!cards.length && <li className="text-sm text-text-600">Concept cards for this topic are coming soon.</li>}
      </ul>
      <form action={startFocusDrill}>
        <input type="hidden" name="topics" value={topic} />
        <button type="submit" className="min-h-12 w-full rounded-sm bg-accent-500 font-semibold text-ink-900 hover:bg-accent-600" data-testid="learn-drill">Test yourself · 10 Q</button>
      </form>
    </div>
  );
}
