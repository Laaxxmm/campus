import { devLinksExposed } from "@/lib/mail";
import { MailCheck } from "lucide-react";
import { t } from "@/i18n/en";

export const dynamic = "force-dynamic";

export default function CheckEmail() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 text-center">
      <MailCheck aria-hidden className="mx-auto h-12 w-12 text-ink-900" />
      <h1 className="mt-4 text-xl font-semibold">{t.login.checkTitle}</h1>
      <p className="mt-2 text-text-600">{t.login.checkBody}</p>
      {devLinksExposed() && <p className="mt-6 rounded-md bg-accent-50 p-4 text-xs">{t.login.devHint}</p>}
    </main>
  );
}
