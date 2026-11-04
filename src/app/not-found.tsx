import Link from "next/link";
import { SearchX } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/layout";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="min-h-dvh bg-surface">
      <Container size="reading" className="flex min-h-dvh flex-col justify-center py-12">
        <Card className="flex items-start gap-4">
          <SearchX aria-hidden className="h-8 w-8 shrink-0 text-ink-900" />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-ink-900">Page not found</h1>
            <p className="mt-2 text-base text-text-600">It may have moved, or you may not have access to it.</p>
            <Link href="/home" className={`${buttonVariants({ variant: "primary" })} mt-6`} data-cta="primary">
              Go to my home
            </Link>
          </div>
        </Card>
      </Container>
    </main>
  );
}
