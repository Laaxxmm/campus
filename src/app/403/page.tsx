import Link from "next/link";
import { t } from "@/i18n/en";

export default function Forbidden() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 text-center">
      <div className="text-5xl" aria-hidden>🚫</div>
      <h1 className="mt-4 text-xl font-semibold">{t.forbidden.title}</h1>
      <p className="mt-2 text-ink-600">{t.forbidden.body}</p>
      <Link href="/home" className="mt-6 text-brand-600 underline">
        {t.forbidden.home}
      </Link>
    </main>
  );
}
