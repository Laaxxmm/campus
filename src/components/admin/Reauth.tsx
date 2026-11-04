import { signIn } from "@/auth";
import { requireUser } from "@/lib/authz";
import { Button } from "@/components/ui/button";

async function reauth(formData: FormData) {
  "use server";
  const user = await requireUser();
  await signIn("resend", { email: user.email, redirectTo: String(formData.get("back") ?? "/super") });
}

export function ReauthNotice({ back }: { back: string }) {
  return (
    <form action={reauth} className="mb-4 flex flex-wrap items-center gap-4 rounded-md border border-accent-500 bg-accent-50 p-4 text-sm" data-testid="reauth">
      <span className="flex-1">Admin changes need a sign-in from the last 15 minutes. We&apos;ll email you a fresh link.</span>
      <input type="hidden" name="back" value={back} />
      <Button type="submit" variant="secondary">Confirm it&apos;s me</Button>
    </form>
  );
}
