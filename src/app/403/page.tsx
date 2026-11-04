import Link from "next/link";
import { ShieldX } from "lucide-react";
import { t } from "@/i18n/en";

export default function Forbidden() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 text-center">
      <ShieldX aria-hidden className="mx-auto h-12 w-12 text-coral-500" />
      <h1 className="mt-4 text-xl font-semibold">{t.forbidden.title}</h1>
      <p className="mt-2 text-text-600">{t.forbidden.body}</p>
      <Link href="/home" className="mt-6 text-ink-900 underline">
        {t.forbidden.home}
      </Link>
    </main>
  );
}
