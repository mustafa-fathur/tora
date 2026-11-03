import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase session cookies and returns the signed-in user's claims.
// Based on https://supabase.com/docs/guides/auth/server-side/nextjs
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // Don't run code between createServerClient and getClaims(): it can cause
  // hard-to-debug random logouts. getClaims() validates the JWT.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;

  // Signed in with a password but has an authenticator: the 2FA code is still owed.
  // (Reads the session from cookies; no network call.)
  let needsTwoFactor = false;
  if (claims && claims.aal !== "aal2") {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    needsTwoFactor = aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2";
  }

  return { response, claims, needsTwoFactor };
}
