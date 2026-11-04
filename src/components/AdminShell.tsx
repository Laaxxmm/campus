import Link from "next/link";
import { Building2, ClipboardCheck, Library, LogOut, ScrollText, ShieldCheck } from "lucide-react";
import { signOut } from "@/auth";

async function logout() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export function AdminShell({ children, title, role }: { children: React.ReactNode; title: string; role: string }) {
  const items = [
    ...(role === "superadmin" ? [{ href: "/super", label: "Colleges", Icon: Building2 }] : []),
    { href: "/content/review?status=golden", label: "Question bank", Icon: Library },
    { href: "/content/review", label: "Review queue", Icon: ClipboardCheck },
    ...(role === "superadmin" ? [{ href: "/super/audit", label: "Audit log", Icon: ScrollText }, { href: "/super/privacy", label: "Data requests", Icon: ShieldCheck }] : []),
  ];
  return (
    <div className="flex min-h-dvh flex-col bg-surface md:flex-row">
      <aside className="border-b border-border bg-ink-900 text-white md:sticky md:top-0 md:h-dvh md:w-56 md:shrink-0">
        <div className="px-4 py-4 text-lg font-bold">LearnCrew <span className="text-xs font-normal text-white/70">admin</span></div>
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col">
          {items.map(({ href, label, Icon }) => (
            <Link key={href} href={href} className="flex min-h-11 items-center gap-2 whitespace-nowrap rounded-sm px-3 text-sm text-white/85 hover:bg-ink-700"><Icon aria-hidden className="h-4 w-4" />{label}</Link>
          ))}
          <form action={logout} className="md:mt-4"><button type="submit" className="flex min-h-11 items-center gap-2 rounded-sm px-3 text-sm text-white/85 hover:bg-ink-700"><LogOut aria-hidden className="h-4 w-4" />Sign out</button></form>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">
        <h1 className="mb-6 text-2xl font-bold text-ink-900">{title}</h1>
        {children}
      </main>
    </div>
  );
}
