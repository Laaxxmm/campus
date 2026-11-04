import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/layout";

/**
 * Student page frame (v4): container + gutters + page header.
 * width="reading" (720, default) for single-column pages; width="app" (1120) for pages with real columns.
 */
export function StudentPage({
  title,
  subtitle,
  actions,
  eyebrow,
  width = "reading",
  className,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
  width?: "reading" | "app";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", width === "app" ? "max-w-[1120px]" : "max-w-[720px]")}>
      <PageHeader title={title} subtitle={subtitle} actions={actions} eyebrow={eyebrow} />
      <div className={cn("space-y-6", className)}>{children}</div>
    </div>
  );
}
