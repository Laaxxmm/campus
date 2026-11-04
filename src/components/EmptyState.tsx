import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

/** v4 empty state: left-aligned, quiet dashed card; icon beside the copy (no centred-everything). */
export function EmptyState({ icon: Icon = Inbox, title, body, children }: { icon?: LucideIcon; title: string; body?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 rounded-md border border-dashed border-border bg-bg p-6 lg:p-8">
      <Icon aria-hidden className="h-6 w-6 shrink-0 text-text-400" />
      <div className="min-w-0">
        <p className="text-base font-semibold text-text-900">{title}</p>
        {body && <p className="mt-2 text-sm text-text-600">{body}</p>}
        {children}
      </div>
    </div>
  );
}
