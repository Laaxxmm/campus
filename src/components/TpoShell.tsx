import Link from "next/link";
import { BarChart3, CalendarDays, ClipboardList, FileText, Filter, Grid3X3, LayoutDashboard, LogOut, Settings, Target, TriangleAlert, Upload, Users } from "lucide-react";
import { signOut } from "@/auth";
import { t } from "@/i18n/en";

const items = [
  { href: "/tpo", label: t.tpoNav.overview, Icon: LayoutDashboard },
  { href: "/tpo/weak-topics", label: "Weak topics", Icon: Target },
  { href: "/tpo/funnel", label: "Companies funnel", Icon: Filter },
  { href: "/tpo/heatmap", label: t.tpoNav.heatmap, Icon: Grid3X3 },
  { href: "/tpo/students", label: t.tpoNav.students, Icon: Users },
  { href: "/tpo/at-risk", label: t.tpoNav.atRisk, Icon: TriangleAlert },
  { href: "/tpo/mocks", label: t.tpoNav.mocks, Icon: ClipboardList },
  { href: "/tpo/reports", label: t.tpoNav.reports, Icon: FileText },
  { href: "/admin/batches", label: t.tpoNav.batches, Icon: CalendarDays },
  { href: "/admin/import", label: t.tpoNav.import, Icon: Upload },
  { href: "/admin/college", label: t.tpoNav.college, Icon: Settings },
];

async function logout() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export function TpoShell({ children, title, collegeName, crumbs = [], actions }: { children: React.ReactNode; title: string; collegeName?: string; crumbs?: { href: string; label: string }[]; actions?: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface md:flex-row">
      <aside className="no-print border-b border-border bg-ink-900 text-white md:sticky md:top-0 md:h-dvh md:w-60 md:shrink-0 md:border-b-0">
        <div className="flex items-center justify-between px-4 py-4 md:block">
          <div>
            <div className="flex items-center gap-2 text-lg font-bold"><BarChart3 aria-hidden className="h-5 w-5 text-accent-500" />LearnCrew</div>
            {collegeName && <div className="text-xs text-white/70">{collegeName}</div>}
          </div>
        </div>
        <nav aria-label="TPO" className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible">
          {items.map(({ href, label, Icon }) => (
            <Link key={href} href={href} className="flex min-h-11 items-center gap-2 whitespace-nowrap rounded-sm px-4 text-sm text-white/85 hover:bg-ink-700 hover:text-white">
              <Icon aria-hidden className="h-4 w-4" />
              {label}
            </Link>
          ))}
          <form action={logout} className="md:mt-4">
            <button type="submit" className="flex min-h-11 items-center gap-2 rounded-sm px-4 text-sm text-white/85 hover:bg-ink-700"><LogOut aria-hidden className="h-4 w-4" />Sign out</button>
          </form>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">
        {crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="no-print mb-2 text-sm text-text-600">
            {crumbs.map((c, i) => (
              <span key={c.href}>
                <Link href={c.href} className="hover:text-ink-900 hover:underline">{c.label}</Link>
                {i < crumbs.length - 1 && <span aria-hidden> / </span>}
              </span>
            ))}
          </nav>
        )}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-ink-900">{title}</h1>
          {actions}
        </div>
        {children}
      </main>
    </div>
  );
}
