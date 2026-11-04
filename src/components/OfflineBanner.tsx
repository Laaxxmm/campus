"use client";
import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";
import { t } from "@/i18n/en";

const subscribe = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};
export function useOnline() {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className="bg-accent-50 px-4 py-2 text-center text-sm text-text-900">
      <WifiOff aria-hidden className="mr-2 inline h-4 w-4" /> {t.offline.banner}
    </div>
  );
}
