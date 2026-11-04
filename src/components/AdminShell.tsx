import Link from "next/link";
import { Briefcase, Building2, ClipboardCheck, Cpu, Library, LogOut, ScrollText, ShieldCheck } from "lucide-react";
import { signOut } from "@/auth";
import { PageHeader } from "@/components/ui/layout";

async function logout() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export function AdminShell({ children, title, subtitle, actions, role }: { children: React.ReactNode; title: string; subtitle?: React.ReactNode; actions?: React.ReactNode; role: string }) {
  const items = [
    ...(role === "superadmin" ? [{ href: "/super", label: "Colleges", Icon: Building2 }] : []),
    { href: "/content/review?status=golden", label: "Question bank", Icon: Library },
    { href: "/content/review", label: "Review queue", Icon: ClipboardCheck },
    { href: "/content/companies", label: "Company profiles", Icon: Briefcase },
    ...(role === "superadmin" ? [{ href: "/super/audit", label: "Audit log", Icon: ScrollText }, { href: "/super/llm", label: "LLM usage", Icon: Cpu }, { href: "/super/privacy", label: "Data requests", Icon: ShieldCheck }] : []),
  ];
  return (
    <div className="flex min-h-dvh flex-col bg-surface md:flex-row">
      <aside className="border-b border-border bg-ink-900 text-white md:sticky md:top-0 md:h-dvh md:w-56 md:shrink-0">
        <div className="px-4 py-4 text-lg font-bold">LearnCrew <span className="text-xs font-normal text-white/70">admin</span></div>
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col">
          {items.map(({ href, label, Icon }) => (
            <Link key={href} href={href} className="flex min-h-11 items-center gap-2 whitespace-nowrap rounded-sm px-4 text-sm text-white/85 hover:bg-ink-700"><Icon aria-hidden className="h-4 w-4" />{label}</Link>
          ))}
          <form action={logout} className="md:mt-4"><button type="submit" className="flex min-h-11 items-center gap-2 rounded-sm px-4 text-sm text-white/85 hover:bg-ink-700"><LogOut aria-hidden className="h-4 w-4" />Sign out</button></form>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1440px]">
          <PageHeader title={title} subtitle={subtitle} actions={actions} />
          {children}
        </div>
      </main>
    </div>
  );
}
