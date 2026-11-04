export function EmptyState({ icon = "🗂️", title, body, children }: { icon?: string; title: string; body?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface p-6 text-center">
      <div className="text-3xl" aria-hidden>{icon}</div>
      <p className="mt-2 font-semibold">{title}</p>
      {body && <p className="mt-1 text-sm text-ink-600">{body}</p>}
      {children}
    </div>
  );
}
