import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";
import { sendMagicLink } from "@/lib/mail";
import { track } from "@/lib/events";
import type { AppRole } from "@/types/next-auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  // v2: 7-day idle expiry, rolled forward at most once a day while active (D18).
  session: { strategy: "database", maxAge: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  trustHost: true,
  providers: [
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY || "console-fallback",
      from: process.env.EMAIL_FROM ?? "LearnCrew <no-reply@learncrew.in>",
      maxAge: 60 * 60 * 24,
      async sendVerificationRequest({ identifier, url }) {
        await sendMagicLink(identifier, url);
      },
    }),
  ],
  pages: { signIn: "/login", verifyRequest: "/login/check-email", error: "/login" },
  events: {
    // Recorded for the 15-minute re-auth rule on superadmin actions (src/server/services/super.ts).
    async signIn({ user }) {
      if (user.id) await track("sign_in", { userId: user.id });
    },
  },
  callbacks: {
    // Invite-only: the email must already exist (seeded, CSV-imported, or invited).
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      if (!email) return false;
      const [row] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      return row ? true : "/login?error=not_invited";
    },
    async session({ session, user }) {
      const u = user as typeof user & {
        role: AppRole;
        collegeId: string | null;
        batchId: string | null;
        consentAt: Date | null;
      };
      session.user.id = u.id;
      session.user.role = u.role;
      session.user.collegeId = u.collegeId;
      session.user.batchId = u.batchId;
      session.user.consentAt = u.consentAt ? new Date(u.consentAt).toISOString() : null;
      return session;
    },
  },
});
