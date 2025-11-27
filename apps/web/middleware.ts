// apps/web/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, verifyAuthToken } from "./lib/jwt";

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  const needsProvider = [
    /^\/providers\/([^/]+)\/calendar$/,
    /^\/api\/providers\/([^/]+)\/calendar/,
    /^\/api\/providers\/([^/]+)\/blocks(\/.*)?$/,
  ];

  // Distinguish API vs page for user
  const needsUserApi = [/^\/api\/book$/, /^\/api\/me(\/.*)?$/];
  const needsUserPage = [/^\/me(\/.*)?$/];

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  let session = null as Awaited<ReturnType<typeof verifyAuthToken>> | null;

  if (token) {
    session = await verifyAuthToken(token);
  }

  // ---- Provider-protected routes ----
  for (const re of needsProvider) {
    const m = path.match(re);
    if (m) {
      if (!session || session.role !== "provider") {
        return NextResponse.redirect(new URL("/", req.url));
      }
      const rid = m[1];
      if ((session as any).resourceId && (session as any).resourceId !== rid) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next();
    }
  }

  // ---- User-protected API routes → JSON 403 ----
  for (const re of needsUserApi) {
    if (re.test(path)) {
      if (!session || session.role !== "user") {
        return NextResponse.json(
          { error: "FORBIDDEN", message: "User role required" },
          { status: 403 }
        );
      }
      return NextResponse.next();
    }
  }

  // ---- User-protected pages → redirect to login ----
  for (const re of needsUserPage) {
    if (re.test(path)) {
      if (!session || session.role !== "user") {
        return NextResponse.redirect(new URL("/login", req.url));
      }
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/providers/:path*/calendar",
    "/api/providers/:path*/calendar",
    "/api/providers/:path*/blocks",
    "/api/providers/:path*/blocks/:path*",
    "/me/:path*",
    "/api/me/:path*",
    "/api/book",
  ],
};
