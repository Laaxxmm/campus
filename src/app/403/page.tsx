import Link from "next/link";
import { ShieldX } from "lucide-react";
import { t } from "@/i18n/en";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/layout";
import { buttonVariants } from "@/components/ui/button";

export default function Forbidden() {
  return (
    <main className="min-h-dvh bg-surface">
      <Container size="reading" className="flex min-h-dvh flex-col justify-center py-12">
        <Card className="flex items-start gap-4">
          <ShieldX aria-hidden className="h-8 w-8 shrink-0 text-coral-500" />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-ink-900">{t.forbidden.title}</h1>
            <p className="mt-2 text-base text-text-600">{t.forbidden.body}</p>
            <Link href="/home" className={`${buttonVariants({ variant: "primary" })} mt-6`} data-cta="primary">
              {t.forbidden.home}
            </Link>
          </div>
        </Card>
      </Container>
    </main>
  );
}
