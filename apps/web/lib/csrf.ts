import { NextResponse } from "next/server";

/** Returns NextResponse 403 if invalid, or null if OK. */
export function verifyOrigin(req: Request) {
  const base = process.env.PUBLIC_BASE_URL?.toLowerCase();
  if (!base) return null; // nothing to check if not configured

  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  const ok = (url: string | null) => {
    if (!url) return false;
    try {
      const u = new URL(url);
      const a = new URL(base);
      return u.host === a.host && u.protocol === a.protocol;
    } catch {
      return false;
    }
  };

  if (ok(origin) || ok(referer)) return null;
  return NextResponse.json(
    { error: "CSRF", message: "Invalid origin" },
    { status: 403 }
  );
}
