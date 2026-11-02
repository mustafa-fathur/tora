import { headers } from "next/headers";

// The site's own origin (localhost, a deploy preview, or production), so email
// links come back to wherever the request came from. No hard-coded domains.
export async function getOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

// Only allow same-site relative paths, to prevent open redirects.
export function safeNextPath(next: string | null, fallback = "/dashboard") {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}
