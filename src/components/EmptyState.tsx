import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

export function EmptyState({ icon: Icon = Inbox, title, body, children }: { icon?: LucideIcon; title: string; body?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-bg p-6 text-center">
      <Icon aria-hidden className="mx-auto h-8 w-8 text-text-400" />
      <p className="mt-2 font-semibold">{title}</p>
      {body && <p className="mt-1 text-sm text-text-600">{body}</p>}
      {children}
    </div>
  );
}
