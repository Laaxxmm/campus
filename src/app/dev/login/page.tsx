import { notFound } from "next/navigation";
import { devLinksExposed } from "@/lib/mail";

export const dynamic = "force-dynamic";

const DEMO = [
  { email: "student001@demo.learncrew.in", label: "Student — 3 weeks of history" },
  { email: "student030@demo.learncrew.in", label: "Student — insights & crack-path" },
  { email: "newstudent@demo.learncrew.in", label: "Student — first login (consent)" },
  { email: "tpo@demo.learncrew.in", label: "TPO — Demo Engineering College" },
  { email: "admin@demo.learncrew.in", label: "College admin (roster import)" },
  { email: "content@learncrew.in", label: "Content reviewer" },
  { email: process.env.SUPERADMIN_EMAIL || "founder@learncrew.in", label: "Superadmin" },
];

/** Dev/demo only: one-click login for seeded accounts. Posts to /api/dev/login. */
export default function DevLogin() {
  if (!devLinksExposed()) notFound();
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-bold text-ink-900">Demo login</h1>
      <p className="mt-1 text-sm text-text-600">Dev/preview only — skips the email step for seeded accounts.</p>
      <ul className="mt-6 space-y-2">
        {DEMO.map((d) => (
          <li key={d.email}>
            <form action="/api/dev/login" method="post">
              <input type="hidden" name="email" value={d.email} />
              <button type="submit" className="flex min-h-14 w-full flex-col items-start justify-center rounded-md border border-border bg-bg px-4 text-left hover:border-ink-700">
                <span className="font-semibold text-ink-900">{d.label}</span>
                <span className="text-xs text-text-600">{d.email}</span>
              </button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
