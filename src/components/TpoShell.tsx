import Link from "next/link";
import { t } from "@/i18n/en";

const items = [
  { href: "/tpo", label: t.tpoNav.overview },
  { href: "/tpo/heatmap", label: t.tpoNav.heatmap },
  { href: "/tpo/students", label: t.tpoNav.students },
  { href: "/tpo/at-risk", label: t.tpoNav.atRisk },
  { href: "/tpo/reports", label: t.tpoNav.reports },
  { href: "/admin/import", label: t.tpoNav.import },
  { href: "/admin/batches", label: t.tpoNav.batches },
  { href: "/admin/college", label: t.tpoNav.college },
];

export function TpoShell({ children, title, collegeName }: { children: React.ReactNode; title: string; collegeName?: string }) {
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="no-print border-b border-border bg-surface md:w-56 md:border-b-0 md:border-r">
        <div className="px-4 py-4">
          <div className="text-lg font-bold text-brand-600">{t.appName}</div>
          {collegeName && <div className="text-xs text-ink-600">{collegeName}</div>}
        </div>
        <nav aria-label="TPO" className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible">
          {items.map((it) => (
            <Link key={it.href} href={it.href} className="whitespace-nowrap rounded-sm px-3 py-2 text-sm text-ink-600 hover:bg-brand-50 hover:text-brand-700">
              {it.label}
            </Link>
          ))}
          <form action="/api/auth/signout" method="post" className="md:mt-4" />
        </nav>
      </aside>
      <main className="flex-1 p-4 md:p-8">
        <h1 className="mb-6 text-2xl font-bold">{title}</h1>
        {children}
      </main>
    </div>
  );
}
