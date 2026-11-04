"use client";
import Link from "next/link";
import { Building2, ClipboardList, Home, Lightbulb, User } from "lucide-react";
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

export function AppShell({ children, header }: { children: React.ReactNode; header?: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-surface">
      {header}
      <main className="flex-1 px-4 pb-24 pt-3">{children}</main>
      <nav aria-label="Primary" className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg">
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {items.map((it) => {
            const active = path?.startsWith(it.href);
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  className={cn("flex min-h-14 flex-col items-center justify-center text-xs", active ? "font-semibold text-ink-900" : "text-text-600")}
                  aria-current={active ? "page" : undefined}
                >
                  <it.Icon aria-hidden className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
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
