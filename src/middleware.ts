import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { homeFor, rolesFor } from "@/lib/routes";

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const roles = rolesFor(pathname);
  if (!roles) return NextResponse.next();

  const user = req.auth?.user;
  if (!user?.id) {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (!roles.includes(user.role)) {
    return NextResponse.rewrite(new URL("/403", req.nextUrl), { status: 403 });
  }
  if (user.role === "student" && !user.consentAt && !pathname.startsWith("/onboarding")) {
    return NextResponse.redirect(new URL("/onboarding", req.nextUrl));
  }
  if (user.role === "student" && user.consentAt && pathname.startsWith("/onboarding")) {
    return NextResponse.redirect(new URL(homeFor("student", true), req.nextUrl));
  }
  return NextResponse.next();
});

export const config = {
  runtime: "nodejs",
  matcher: ["/onboarding", "/today/:path*", "/drill/:path*", "/mocks/:path*", "/progress/:path*", "/leaderboard/:path*", "/tpo/:path*", "/admin/:path*", "/content/:path*", "/super/:path*"],
};
