import { WifiOff } from "lucide-react";

export default function Offline() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 text-center">
      <WifiOff aria-hidden className="mx-auto h-12 w-12 text-ink-900" />
      <h1 className="mt-4 text-xl font-semibold">You&apos;re offline</h1>
      <p className="mt-2 text-text-600">Open today&apos;s drill once while online and it will keep working offline. Your answers sync automatically.</p>
      <a href="/today" className="mt-6 text-ink-900 underline">Try again</a>
    </main>
  );
}
