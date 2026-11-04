"use client";
import { useRef, useState, useTransition } from "react";
import { FileUp } from "lucide-react";
import type { Preview } from "@/server/services/roster";
import { commitAction, previewAction } from "@/app/admin/import/actions";
import { cn } from "@/lib/utils";

type Done = Awaited<ReturnType<typeof commitAction>>;

export function CsvDropzone({ collegeId }: { collegeId?: string }) {
  const [text, setText] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [createBatches, setCreateBatches] = useState(false);
  const [sendInvites, setSendInvites] = useState(true);
  const [preview, setPreview] = useState<Preview | { fatal: string } | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [drag, setDrag] = useState(false);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  async function load(f: File) {
    setDone(null);
    setFileName(f.name);
    const t = await f.text();
    setText(t);
    start(async () => setPreview(await previewAction(t, createBatches, collegeId)));
  }
  function refresh(cb: boolean) {
    setCreateBatches(cb);
    if (text) start(async () => setPreview(await previewAction(text, cb, collegeId)));
  }
  const p = preview && "rows" in preview ? preview : null;
  const fatal = preview?.fatal ?? null;
  const importable = p ? p.counts.new + p.counts.update : 0;

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files[0];
          if (f) void load(f);
        }}
        className={cn("flex flex-col items-center justify-center rounded-md border-2 border-dashed bg-bg p-8 text-center", drag ? "border-info-500 bg-ink-50" : "border-border")}
      >
        <FileUp aria-hidden className="h-8 w-8 text-ink-900" />
        <p className="mt-2 font-semibold">Drop your roster CSV here</p>
        <p className="text-sm text-text-600">Columns: name, email, roll_no, batch (Excel → Save as CSV)</p>
        <button type="button" onClick={() => input.current?.click()} className="mt-3 min-h-11 rounded-sm bg-ink-900 px-4 text-sm font-semibold text-white hover:bg-ink-700">
          Choose file
        </button>
        <input
          ref={input}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          aria-label="Roster CSV file"
          data-testid="csv-input"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void load(f);
          }}
        />
        {fileName && <p className="mt-2 text-xs text-text-600">{fileName}</p>}
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex min-h-11 items-center gap-2">
          <input type="checkbox" checked={createBatches} onChange={(e) => refresh(e.target.checked)} className="h-5 w-5 accent-ink-900" />
          Create batches that don&apos;t exist yet
        </label>
        <label className="flex min-h-11 items-center gap-2">
          <input type="checkbox" checked={sendInvites} onChange={(e) => setSendInvites(e.target.checked)} className="h-5 w-5 accent-ink-900" />
          Email invites to new students
        </label>
      </div>
      {pending && <div className="h-24 animate-pulse rounded-md bg-ink-50" aria-label="Checking file" />}
      {fatal && (
        <p role="alert" className="rounded-sm bg-danger-50 p-3 text-sm text-danger-700">
          {fatal}
        </p>
      )}
      {p && !pending && (
        <section className="space-y-3" data-testid="import-preview">
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-pill bg-success-50 px-3 py-1">{p.counts.new} new</span>
            <span className="rounded-pill bg-ink-50 px-3 py-1">{p.counts.update} updates</span>
            <span className="rounded-pill bg-surface px-3 py-1">{p.counts.unchanged} unchanged</span>
            <span className={cn("rounded-pill px-3 py-1", p.counts.error ? "bg-coral-50 text-ink-900" : "bg-surface")} data-testid="error-count">
              {p.counts.error} with errors
            </span>
            <span className={cn("rounded-pill px-3 py-1", p.overSeats ? "bg-danger-50 text-danger-700" : "bg-surface")}>
              Seats {p.seats.after}/{p.seats.limit}
            </span>
            {p.newBatches.length > 0 && <span className="rounded-pill bg-accent-50 px-3 py-1">New batches: {p.newBatches.join(", ")}</span>}
          </div>
          {p.overSeats && (
            <p role="alert" className="text-sm text-danger-500">
              This import would exceed your seat limit. Remove rows or ask LearnCrew to add seats.
            </p>
          )}
          <div className="max-h-96 overflow-auto rounded-md border border-border bg-bg">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface text-left text-xs text-text-600">
                <tr>
                  <th className="px-3 py-2">Line</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Roll no</th>
                  <th className="px-3 py-2">Batch</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {[...p.rows]
                  .sort((a, b) => Number(b.status === "error") - Number(a.status === "error") || a.line - b.line)
                  .slice(0, 500)
                  .map((r) => (
                    <tr key={r.line} className={cn("border-t border-border", r.status === "error" && "bg-coral-50")}>
                      <td className="px-3 py-1.5 tabular">{r.line}</td>
                      <td className="px-3 py-1.5">{r.name}</td>
                      <td className="px-3 py-1.5">{r.email}</td>
                      <td className="px-3 py-1.5">{r.rollNo}</td>
                      <td className="px-3 py-1.5">{r.batch}</td>
                      <td className="px-3 py-1.5">{r.status === "error" ? <span className="text-ink-900">{r.errors.join("; ")}</span> : r.status}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            disabled={!importable || p.overSeats || pending}
            onClick={() =>
              text &&
              start(async () => {
                const r = await commitAction(text, createBatches, sendInvites, collegeId);
                setDone(r);
                if (r.ok) setPreview(await previewAction(text, createBatches, collegeId));
              })
            }
            className="min-h-12 rounded-sm bg-accent-500 px-6 font-semibold text-ink-900 hover:bg-accent-600 disabled:opacity-40"
            data-testid="confirm-import"
          >
            Import {importable} student{importable === 1 ? "" : "s"}
            {p.counts.error ? ` (skip ${p.counts.error} with errors)` : ""}
          </button>
        </section>
      )}
      {done &&
        (done.ok ? (
          <p role="status" className="rounded-sm bg-success-50 p-3 text-sm" data-testid="import-result">
            Imported: {done.created} new, {done.updated} updated, {done.unchanged} unchanged, {done.skipped} skipped. {done.invited ? `${done.invited} invites sent.` : ""}
          </p>
        ) : (
          <p role="alert" className="rounded-sm bg-danger-50 p-3 text-sm text-danger-700">
            {done.error}
          </p>
        ))}
    </div>
  );
}
