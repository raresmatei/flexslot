import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export type Role = "user" | "provider";
export type Session = {
  role: Role;
  // For "user" you can include email to prefill bookings
  userEmail?: string;
  // For "provider" bind the session to a single resource (MVP assumption)
  resourceId?: string;
};

const COOKIE = "fs_session";
const alg = "HS256";

function getSecret() {
  const s =
    process.env.NEXT_JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "dev-secret-change-me";
  return new TextEncoder().encode(s);
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: [alg],
    });
    return payload as Session;
  } catch {
    return null;
  }
}

export async function createSession(session: Session, maxAgeDays = 14) {
  const token = await new SignJWT(session as any)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeDays}d`)
    .sign(getSecret());
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: maxAgeDays * 24 * 60 * 60,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.set(COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
}
