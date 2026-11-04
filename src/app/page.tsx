import Link from "next/link";
import { BarChart3, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Container } from "@/components/ui/layout";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "LearnCrew Campus — placement readiness for your college", description: "10 aptitude questions a day for every student. Readiness per company for the TPO. Built for Indian campuses." };

const MAIL = "mailto:pilot@learncrew.in?subject=LearnCrew%20Campus%20pilot&body=College%3A%0ACity%3A%0AStudents%20in%20final%20%2B%20pre-final%20year%3A%0ANext%20drive%20(company%2C%20month)%3A";

const STUDENT = [
  { t: "A rhythm students keep", b: "10 questions, about 10 minutes, every day. Streaks with a weekly freeze, XP and a batch leaderboard — calm, not noisy." },
  { t: "Adaptive to each student", b: "Difficulty moves with every answer. Six questions at their level, two stretch, two spaced reviews of past mistakes." },
  { t: "Works on any phone", b: "Installable web app, no Play Store. Under 110 KB to start, and drills keep working when campus Wi-Fi drops." },
];
const TPO = [
  { t: "Readiness per company", b: "A 0–100 score for each student against each company's section weights, tracked week by week." },
  { t: "Real mock tests", b: "Timed, company-pattern papers with sections, negative marking and review mode. Schedule one for a batch before a drive." },
  { t: "At-risk list", b: "Who hasn't practised in 5 days or is below the bar — with a WhatsApp message ready to copy." },
  { t: "Weekly report", b: "A one-page summary for your principal: activity, readiness trend, weakest topics. Print or save as PDF." },
];
const PLANS = [
  { n: "Starter", p: "₹200", f: ["Daily drills, streaks, leaderboard", "Basic TPO dashboard", "200-seat minimum"] },
  { n: "Placement", p: "₹350", f: ["Everything in Starter", "Company mock tests", "Readiness per company + weekly reports"], featured: true },
  { n: "Premium", p: "₹500", f: ["Everything in Placement", "WhatsApp nudges, custom sets", "Drive bootcamps, college SSO"] },
];

export default function Landing() {
  return (
    <div className="min-h-dvh bg-bg text-text-900">
      <header className="border-b border-border">
        <Container className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-bold text-ink-900">
            <BarChart3 aria-hidden className="h-5 w-5 text-accent-500" />
            LearnCrew Campus
          </div>
          <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
            Log in
          </Link>
        </Container>
      </header>

      <main>
        <section className="py-12 lg:py-20">
          <Container className="grid gap-12 lg:grid-cols-12 lg:items-end lg:gap-6">
            <div className="lg:col-span-7">
              <p className="text-sm font-medium uppercase tracking-wide text-ink-700">For Training &amp; Placement Officers</p>
              <h1 className="mt-4 text-4xl font-bold leading-tight text-ink-900 lg:text-5xl">Know who&apos;s ready for next month&apos;s drive — and who needs a push.</h1>
              <p className="mt-6 text-lg text-text-600">
                Every student gets a 10-question aptitude drill a day, adapted to their level and their target company. You get readiness per company, topic heatmaps by batch, and an at-risk list with ready-to-send nudges.
              </p>
            </div>
            <div className="rounded-md border border-border bg-bg p-6 shadow-e1 lg:col-span-5 lg:p-8">
              <div className="flex flex-col gap-4">
                <a href={MAIL} className={cn(buttonVariants({ variant: "cta", size: "lg" }), "w-full")} data-cta="primary">
                  Book a free pilot
                </a>
                <Link href="/login" className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "w-full")}>
                  Student or TPO login
                </Link>
              </div>
              <p className="mt-6 border-t border-border pt-6 text-sm text-text-600">TCS NQT · Infosys · Accenture · Cognizant · Wipro · Capgemini patterns</p>
            </div>
          </Container>
        </section>

        <section className="border-y border-border bg-surface py-12 lg:py-16" aria-label="For students">
          <Container>
            <ol className="grid gap-6 lg:grid-cols-12">
              {STUDENT.map(({ t, b }, i) => (
                <li key={t} className="border-t-2 border-ink-900 pt-6 lg:col-span-4">
                  <span className="text-sm font-semibold text-ink-700 tabular">0{i + 1}</span>
                  <h2 className="mt-2 text-lg font-semibold text-ink-900">{t}</h2>
                  <p className="mt-2 text-base text-text-600">{b}</p>
                </li>
              ))}
            </ol>
          </Container>
        </section>

        <section className="py-12 lg:py-16">
          <Container className="grid gap-6 lg:grid-cols-12">
            <h2 className="text-3xl font-bold text-ink-900 lg:col-span-4">What the TPO sees</h2>
            <ul className="divide-y divide-border border-y border-border lg:col-span-8">
              {TPO.map(({ t, b }) => (
                <li key={t} className="grid gap-2 py-6 sm:grid-cols-3 sm:gap-6">
                  <h3 className="font-semibold text-ink-900">{t}</h3>
                  <p className="text-base text-text-600 sm:col-span-2">{b}</p>
                </li>
              ))}
            </ul>
          </Container>
        </section>

        <section className="border-t border-border bg-surface py-12 lg:py-16">
          <Container>
            <h2 className="text-3xl font-bold text-ink-900">Simple per-student pricing</h2>
            <p className="mt-2 text-base text-text-600">Billed to the college, per student per year. Pilots are free for one batch.</p>
            <div className="mt-6 grid items-stretch gap-6 lg:grid-cols-3">
              {PLANS.map((t) => (
                <div key={t.n} className={cn("flex h-full flex-col rounded-md border bg-bg p-6 lg:p-8", t.featured ? "border-ink-900 shadow-e1" : "border-border")}>
                  <h3 className="text-base font-semibold text-ink-900">{t.n}</h3>
                  <p className="mt-4 text-4xl font-bold leading-none text-ink-900 tabular">
                    {t.p}
                    <span className="text-base font-normal text-text-600"> / student / year</span>
                  </p>
                  <ul className="mt-6 space-y-2 border-t border-border pt-6 text-base text-text-900">
                    {t.f.map((x) => (
                      <li key={x}>• {x}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Container>
        </section>
      </main>
      <footer className="border-t border-border">
        <Container className="flex flex-wrap items-center justify-between gap-4 py-8 text-sm text-text-600">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck aria-hidden className="h-4 w-4" />
            DPDP-ready: consent, export and deletion built in.
          </span>
          <span>
            <Link href="/privacy" className="inline-flex min-h-11 items-center underline">
              Privacy
            </Link>{" "}
            ·{" "}
            <a href={MAIL} className="inline-flex min-h-11 items-center underline">
              pilot@learncrew.in
            </a>
          </span>
        </Container>
      </footer>
    </div>
  );
}
