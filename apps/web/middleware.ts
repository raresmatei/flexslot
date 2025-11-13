import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "fs_session";
const alg = "HS256";

function getSecret() {
  const s =
    process.env.NEXT_JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "dev-secret-change-me";
  return new TextEncoder().encode(s);
}

export async function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const path = url.pathname;

  // Only check secured paths to keep DX fast
  const needsProvider = [
    /^\/providers\/([^/]+)\/calendar$/,
    /^\/api\/providers\/([^/]+)\/calendar/,
    /^\/api\/providers\/([^/]+)\/blocks(\/.*)?$/,
  ];
  const needsUser = [/^\/api\/book$/, /^\/me(\/.*)?$/, /^\/api\/me(\/.*)?$/];

  const cookie = req.cookies.get(COOKIE)?.value;
  let session: any = null;
  if (cookie) {
    try {
      const { payload } = await jwtVerify(cookie, getSecret(), {
        algorithms: [alg],
      });
      session = payload;
    } catch {
      session = null;
    }
  }

  // Provider-protected
  for (const re of needsProvider) {
    const m = path.match(re);
    if (m) {
      if (!session || session.role !== "provider") {
        return NextResponse.redirect(new URL("/", req.url)); // or 403 JSON for API; we keep UX simple here
      }
      const rid = m[1];
      if (session.resourceId && session.resourceId !== rid) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next();
    }
  }

  // User-protected
  for (const re of needsUser) {
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/providers/:path*/calendar",
    "/api/providers/:path*/calendar",
    "/api/providers/:path*/blocks",
    "/api/providers/:path*/blocks/:path*",
    "/api/book",
    "/me/:path*",
    "/api/me/:path*",
  ],
};
