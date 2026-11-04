import Link from "next/link";
import { Container, PageHeader } from "@/components/ui/layout";

export const metadata = { title: "Privacy — LearnCrew Campus" };

const H2 = "text-xl font-semibold text-ink-900";

export default function Privacy() {
  return (
    <main className="min-h-dvh bg-bg">
      <Container size="reading" className="pb-16 text-base leading-relaxed text-text-900">
        <PageHeader title="Privacy & your data" subtitle="Last updated 4 November 2026 · Digital Personal Data Protection Act, 2023" />
        <div className="space-y-8">
          <section>
            <h2 className={H2}>Who is responsible</h2>
            <p className="mt-2">Your college (the Data Fiduciary) registers you on LearnCrew Campus for placement preparation. LearnCrew processes your data on the college&apos;s behalf.</p>
          </section>
          <section>
            <h2 className={H2}>What we collect</h2>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li>Name, college email, roll number, batch — from your college&apos;s roster.</li>
              <li>Your answers, time taken, streaks, XP and mock-test results.</li>
              <li>Basic usage events (e.g. drill started) without device fingerprinting.</li>
            </ul>
          </section>
          <section>
            <h2 className={H2}>Why</h2>
            <p className="mt-2">To build your daily practice, show your progress, and give your Training &amp; Placement Officer readiness reports for your batch. We do not sell data, show ads, or share it with recruiters.</p>
          </section>
          <section>
            <h2 className={H2}>AI</h2>
            <p className="mt-2">Practice questions and explanations are prepared in advance. If you tap &ldquo;Explain more&rdquo;, only the question text is sent to our AI provider — never your name or email. Weekly TPO summaries use aggregated numbers only.</p>
          </section>
          <section>
            <h2 className={H2}>Your rights</h2>
            <p className="mt-2">
              You can see your data in the app, correct your profile, withdraw consent, and request deletion from{" "}
              <Link className="text-info-500 underline" href="/profile">
                Profile → Request data deletion
              </Link>
              . We act on requests within 7 days. Data is kept for your course duration plus 12 months, then deleted.
            </p>
          </section>
          <section>
            <h2 className={H2}>Contact</h2>
            <p className="mt-2">Your college TPO, or privacy@learncrew.in.</p>
          </section>
        </div>
      </Container>
    </main>
  );
}
