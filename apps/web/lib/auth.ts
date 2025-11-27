// apps/web/lib/auth.ts
import { cookies } from "next/headers";
import {
  AUTH_COOKIE,
  signAuthToken,
  verifyAuthToken,
  type AuthClaims,
} from "./jwt";

// Session = JWT claims + optional provider resourceId
export type Session = AuthClaims & {
  resourceId?: string;
};

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE)?.value;
  if (!token) return null;

  const claims = await verifyAuthToken(token);
  if (!claims) return null;

  return claims as Session;
}

export async function clearSession() {
  const jar = await cookies();
  jar.set(AUTH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
}
