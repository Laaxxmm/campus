"use client";
import Link from "next/link";
import { Building2, ClipboardList, Flame, Home, Lightbulb, User } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { t } from "@/i18n/en";

const items = [
  { href: "/today", label: t.nav.today, Icon: Home },
  { href: "/mocks", label: t.nav.mocks, Icon: ClipboardList },
  { href: "/insights", label: t.nav.insights, Icon: Lightbulb },
  { href: "/companies", label: t.nav.companies, Icon: Building2 },
  { href: "/profile", label: t.nav.me, Icon: User },
];

/**
 * Student shell (v4). Mobile/tablet: bottom tab bar. Desktop ≥1024: quiet 64px top bar, no bottom bar.
 * Pages render their own container (StudentPage) so single-column pages centre in the 720 reading width
 * and multi-column pages use the 1120 app width — no orphan right column.
 */
export function AppShell({ children, header }: { children: React.ReactNode; header?: React.ReactNode }) {
  const path = usePathname();
  const active = (href: string) => Boolean(path?.startsWith(href));
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      {header}
      <header className="no-print sticky top-0 z-20 hidden border-b border-border bg-bg/95 backdrop-blur lg:block">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between gap-8 px-8">
          <Link href="/today" className="flex h-11 items-center gap-2 text-lg font-bold text-ink-900">
            <Flame aria-hidden className="h-5 w-5 text-accent-500" />
            LearnCrew
          </Link>
          <nav aria-label="Primary">
            <ul className="flex items-center gap-2">
              {items.map((it) => (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    aria-current={active(it.href) ? "page" : undefined}
                    className={cn(
                      "flex h-11 items-center gap-2 rounded-sm px-4 text-sm",
                      active(it.href) ? "bg-ink-50 font-semibold text-ink-900" : "text-text-600 hover:bg-surface hover:text-ink-900",
                    )}
                  >
                    <it.Icon aria-hidden className="h-4 w-4" />
                    {it.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      <main className="flex-1 pb-24 lg:pb-16">{children}</main>
      <nav aria-label="Primary" className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg lg:hidden">
        <ul className="mx-auto grid max-w-[720px] grid-cols-5">
          {items.map((it) => (
            <li key={it.href}>
              <Link
                href={it.href}
                className={cn("flex min-h-14 flex-col items-center justify-center gap-1 text-xs", active(it.href) ? "font-semibold text-ink-900" : "text-text-600")}
                aria-current={active(it.href) ? "page" : undefined}
              >
                <it.Icon aria-hidden className="h-5 w-5" strokeWidth={active(it.href) ? 2.5 : 2} />
                {it.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
