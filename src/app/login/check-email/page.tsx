import { devLinksExposed } from "@/lib/mail";
import { t } from "@/i18n/en";

export const dynamic = "force-dynamic";

export default function CheckEmail() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 text-center">
      <div className="text-5xl" aria-hidden>📬</div>
      <h1 className="mt-4 text-xl font-semibold">{t.login.checkTitle}</h1>
      <p className="mt-2 text-ink-600">{t.login.checkBody}</p>
      {devLinksExposed() && <p className="mt-6 rounded-md bg-warn-50 p-3 text-xs">{t.login.devHint}</p>}
    </main>
  );
}
