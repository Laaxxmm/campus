import type { DefaultSession } from "next-auth";

export type AppRole = "student" | "tpo" | "admin" | "content" | "superadmin";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AppRole;
      collegeId: string | null;
      batchId: string | null;
      consentAt: string | null;
    } & DefaultSession["user"];
  }
}
