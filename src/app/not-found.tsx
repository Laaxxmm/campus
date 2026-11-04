import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 text-center">
      <SearchX aria-hidden className="mx-auto h-12 w-12 text-ink-900" />
      <h1 className="mt-4 text-xl font-semibold text-ink-900">Page not found</h1>
      <p className="mt-2 text-text-600">It may have moved, or you may not have access to it.</p>
      <Link href="/home" className="mt-6 text-info-500 underline">Go to my home</Link>
    </main>
  );
}
