import { AppShell } from "@/components/AppShell";
import { OfflineBanner } from "@/components/OfflineBanner";
import { SwRegister } from "@/components/SwRegister";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell header={<OfflineBanner />}>
      <SwRegister />
      {children}
    </AppShell>
  );
}
