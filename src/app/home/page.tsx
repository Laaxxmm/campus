import { redirect } from "next/navigation";
import { requireUser } from "@/lib/authz";
import { homeFor } from "@/lib/routes";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireUser();
  redirect(homeFor(user.role, Boolean(user.consentAt)));
}
