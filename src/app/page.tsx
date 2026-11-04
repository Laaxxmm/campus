import Link from "next/link";
import { BarChart3, CalendarCheck, FileText, Flame, ShieldCheck, Smartphone, Target, TriangleAlert } from "lucide-react";

export const metadata = { title: "LearnCrew Campus — placement readiness for your college", description: "10 aptitude questions a day for every student. Readiness per company for the TPO. Built for Indian campuses." };

const MAIL = "mailto:pilot@learncrew.in?subject=LearnCrew%20Campus%20pilot&body=College%3A%0ACity%3A%0AStudents%20in%20final%20%2B%20pre-final%20year%3A%0ANext%20drive%20(company%2C%20month)%3A";

export default function Landing() {
  return (
    <div className="bg-bg text-text-900">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
        <div className="flex items-center gap-2 text-lg font-bold text-ink-900"><BarChart3 aria-hidden className="h-5 w-5 text-accent-500" />LearnCrew Campus</div>
        <Link href="/login" className="inline-flex min-h-11 items-center rounded-sm px-4 text-sm font-semibold text-ink-900 hover:bg-ink-50">Log in</Link>
      </header>

      <main>
      <section className="mx-auto max-w-6xl px-4 py-12 md:py-20">
        <p className="text-sm font-semibold uppercase tracking-wide text-ink-700">For Training &amp; Placement Officers</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight text-ink-900 md:text-5xl">Know who&apos;s ready for next month&apos;s drive — and who needs a push.</h1>
        <p className="mt-6 max-w-2xl text-lg text-text-600">Every student gets a 10-question aptitude drill a day, adapted to their level and their target company. You get readiness per company, topic heatmaps by batch, and an at-risk list with ready-to-send nudges.</p>
        <div className="mt-8 flex flex-wrap gap-4">
          <a href={MAIL} className="inline-flex min-h-12 items-center rounded-sm bg-accent-500 px-6 font-semibold text-ink-900 hover:bg-accent-600">Book a free pilot</a>
          <Link href="/login" className="inline-flex min-h-12 items-center rounded-sm border border-border px-6 font-semibold text-ink-900 hover:bg-surface">Student or TPO login</Link>
        </div>
        <p className="mt-4 text-sm text-text-600">TCS NQT · Infosys · Accenture · Cognizant · Wipro · Capgemini patterns</p>
      </section>

      <section className="bg-surface py-12 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-3">
          {[
            { Icon: Flame, t: "A rhythm students keep", b: "10 questions, about 10 minutes, every day. Streaks with a weekly freeze, XP and a batch leaderboard — calm, not noisy." },
            { Icon: Target, t: "Adaptive to each student", b: "Difficulty moves with every answer. Six questions at their level, two stretch, two spaced reviews of past mistakes." },
            { Icon: Smartphone, t: "Works on any phone", b: "Installable web app, no Play Store. Under 110 KB to start, and drills keep working when campus Wi-Fi drops." },
          ].map(({ Icon, t, b }) => (
            <div key={t} className="rounded-md border border-border bg-bg p-6 shadow-sm">
              <Icon aria-hidden className="h-6 w-6 text-ink-900" />
              <h2 className="mt-4 text-lg font-semibold text-ink-900">{t}</h2>
              <p className="mt-2 text-text-600">{b}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 md:py-20">
        <h2 className="text-3xl font-bold text-ink-900">What the TPO sees</h2>
        <ul className="mt-8 grid gap-6 md:grid-cols-2">
          {[
            { Icon: BarChart3, t: "Readiness per company", b: "A 0–100 score for each student against each company's section weights, tracked week by week." },
            { Icon: CalendarCheck, t: "Real mock tests", b: "Timed, company-pattern papers with sections, negative marking and review mode. Schedule one for a batch before a drive." },
            { Icon: TriangleAlert, t: "At-risk list", b: "Who hasn't practised in 5 days or is below the bar — with a WhatsApp message ready to copy." },
            { Icon: FileText, t: "Weekly report", b: "A one-page summary for your principal: activity, readiness trend, weakest topics. Print or save as PDF." },
          ].map(({ Icon, t, b }) => (
            <li key={t} className="flex gap-4">
              <Icon aria-hidden className="mt-2 h-6 w-6 shrink-0 text-accent-600" />
              <div><h3 className="font-semibold text-ink-900">{t}</h3><p className="mt-2 text-text-600">{b}</p></div>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-surface py-12 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-bold text-ink-900">Simple per-student pricing</h2>
          <p className="mt-2 text-text-600">Billed to the college, per student per year. Pilots are free for one batch.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              { n: "Starter", p: "₹200", f: ["Daily drills, streaks, leaderboard", "Basic TPO dashboard", "200-seat minimum"] },
              { n: "Placement", p: "₹350", f: ["Everything in Starter", "Company mock tests", "Readiness per company + weekly reports"] },
              { n: "Premium", p: "₹500", f: ["Everything in Placement", "WhatsApp nudges, custom sets", "Drive bootcamps, college SSO"] },
            ].map((t) => (
              <div key={t.n} className="rounded-md border border-border bg-bg p-6 shadow-sm">
                <h3 className="font-semibold text-ink-900">{t.n}</h3>
                <p className="mt-2 text-3xl font-bold text-ink-900">{t.p}<span className="text-base font-normal text-text-600"> / student / year</span></p>
                <ul className="mt-4 space-y-2 text-sm text-text-600">{t.f.map((x) => <li key={x}>• {x}</li>)}</ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      </main>
      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-text-600">
        <span className="inline-flex items-center gap-2"><ShieldCheck aria-hidden className="h-4 w-4" />DPDP-ready: consent, export and deletion built in.</span>
        <span><Link href="/privacy" className="underline">Privacy</Link> · <a href={MAIL} className="underline">pilot@learncrew.in</a></span>
      </footer>
    </div>
  );
}
