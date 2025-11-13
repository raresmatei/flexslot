import { headers } from "next/headers";

/** Build an absolute base URL that works in dev and prod (SSR-safe). */
export function getBaseUrl() {
  const h = headers();
  const proto =
    h.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "production" ? "https" : "http");
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) return `${proto}://${host}`;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  return "http://localhost:3000";
}
