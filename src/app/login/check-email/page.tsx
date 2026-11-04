import { devLinksExposed } from "@/lib/mail";
import { MailCheck } from "lucide-react";
import { t } from "@/i18n/en";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/layout";

export const dynamic = "force-dynamic";

export default function CheckEmail() {
  return (
    <main className="min-h-dvh bg-surface">
      <Container size="reading" className="flex min-h-dvh flex-col justify-center py-12">
        <Card className="flex items-start gap-4">
          <MailCheck aria-hidden className="h-8 w-8 shrink-0 text-ink-900" />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-ink-900">{t.login.checkTitle}</h1>
            <p className="mt-2 text-base text-text-600">{t.login.checkBody}</p>
            {devLinksExposed() && <p className="mt-6 rounded-sm bg-accent-50 p-4 text-sm text-text-900">{t.login.devHint}</p>}
          </div>
        </Card>
      </Container>
    </main>
  );
}
