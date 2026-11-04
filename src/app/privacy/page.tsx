import Link from "next/link";

export const metadata = { title: "Privacy — LearnCrew Campus" };

export default function Privacy() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 leading-relaxed">
      <h1 className="text-3xl font-bold text-ink-900">Privacy &amp; your data</h1>
      <p className="mt-2 text-sm text-text-600">Last updated 4 November 2026 · Digital Personal Data Protection Act, 2023</p>
      <h2 className="mt-8 text-xl font-semibold">Who is responsible</h2>
      <p className="mt-2">Your college (the Data Fiduciary) registers you on LearnCrew Campus for placement preparation. LearnCrew processes your data on the college&apos;s behalf.</p>
      <h2 className="mt-6 text-xl font-semibold">What we collect</h2>
      <ul className="mt-2 list-disc space-y-2 pl-6">
        <li>Name, college email, roll number, batch — from your college&apos;s roster.</li>
        <li>Your answers, time taken, streaks, XP and mock-test results.</li>
        <li>Basic usage events (e.g. drill started) without device fingerprinting.</li>
      </ul>
      <h2 className="mt-6 text-xl font-semibold">Why</h2>
      <p className="mt-2">To build your daily practice, show your progress, and give your Training &amp; Placement Officer readiness reports for your batch. We do not sell data, show ads, or share it with recruiters.</p>
      <h2 className="mt-6 text-xl font-semibold">AI</h2>
      <p className="mt-2">Practice questions and explanations are prepared in advance. If you tap &ldquo;Explain more&rdquo;, only the question text is sent to our AI provider — never your name or email. Weekly TPO summaries use aggregated numbers only.</p>
      <h2 className="mt-6 text-xl font-semibold">Your rights</h2>
      <p className="mt-2">You can see your data in the app, correct your profile, withdraw consent, and request deletion from <Link className="text-info-500 underline" href="/profile">Profile → Request data deletion</Link>. We act on requests within 7 days. Data is kept for your course duration plus 12 months, then deleted.</p>
      <h2 className="mt-6 text-xl font-semibold">Contact</h2>
      <p className="mt-2">Your college TPO, or privacy@learncrew.in.</p>
    </main>
  );
}
