"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { t } from "@/i18n/en";

const items = [
  { href: "/today", label: t.nav.today, icon: "🏠" },
  { href: "/mocks", label: t.nav.mocks, icon: "📝" },
  { href: "/progress", label: t.nav.progress, icon: "📈" },
  { href: "/leaderboard", label: t.nav.board, icon: "🏆" },
];

export function AppShell({ children, header }: { children: React.ReactNode; header?: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-bg">
      {header}
      <main className="flex-1 px-4 pb-24 pt-3">{children}</main>
      <nav aria-label="Primary" className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface">
        <ul className="mx-auto grid max-w-md grid-cols-4">
          {items.map((it) => {
            const active = path?.startsWith(it.href);
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  className={cn("flex min-h-14 flex-col items-center justify-center text-xs", active ? "font-semibold text-brand-600" : "text-ink-600")}
                  aria-current={active ? "page" : undefined}
                >
                  <span aria-hidden className="text-lg leading-none">{it.icon}</span>
                  {it.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
