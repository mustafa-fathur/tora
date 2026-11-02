import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

// Pages only for signed-out users.
const GUEST_ONLY = ["/login", "/register", "/forgot-password"];
// Reachable without a session. Everything else needs one.
const PUBLIC = [...GUEST_ONLY, "/auth"];

const matches = (pathname: string, routes: string[]) =>
  routes.some((r) => pathname === r || pathname.startsWith(`${r}/`));

export async function proxy(request: NextRequest) {
  const { response, claims } = await updateSession(request);
  const { pathname } = request.nextUrl;
  const signedIn = Boolean(claims);

  const redirectTo = (path: string) => {
    const redirect = NextResponse.redirect(new URL(path, request.url));
    // Keep any refreshed session cookies on the redirect.
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  if (pathname === "/") return redirectTo(signedIn ? "/dashboard" : "/login");
  if (!signedIn && !matches(pathname, PUBLIC)) return redirectTo("/login");
  if (signedIn && matches(pathname, GUEST_ONLY)) return redirectTo("/dashboard");

  return response;
}

export const config = {
  matcher: [
    // Everything except Next.js internals and static files.
    "/((?!_next/static|_next/image|icon.png|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
