"use client";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(JSON.stringify({ level: "error", msg: "client render error", digest: error.digest }));
  }, [error]);
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 text-center">
      <h1 className="text-xl font-semibold text-ink-900">Something went wrong</h1>
      <p className="mt-2 text-text-600">Your answers are safe — they&apos;re saved as you go. Try again, or go back to Today.</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-text-600">Ref: {error.digest}</p>}
      <div className="mt-6 flex justify-center gap-2">
        <button type="button" onClick={reset} className="min-h-11 rounded-sm bg-ink-900 px-4 font-semibold text-white">Try again</button>
        <a href="/home" className="inline-flex min-h-11 items-center rounded-sm border border-border px-4 font-semibold">Home</a>
      </div>
    </main>
  );
}
