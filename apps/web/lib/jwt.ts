// apps/web/lib/jwt.ts
import { SignJWT, jwtVerify, JWTPayload } from "jose";

export type Role = "user" | "provider";
export type AuthClaims = { sub: string; email: string; role: Role };

// 👇 canonical auth cookie name
export const AUTH_COOKIE = "auth";

const ALG = "HS256";

// Always derive secret from a *string* (with dev fallback)
function getSecretKey() {
  const raw = process.env.JWT_SECRET || "dev-secret-change-me";
  return new TextEncoder().encode(raw);
}

export async function signAuthToken(
  claims: AuthClaims,
  maxAgeSec = 60 * 60 * 24 * 30
) {
  const secret = getSecretKey();

  return await new SignJWT(claims as unknown as JWTPayload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSec}s`)
    .sign(secret);
}

export async function verifyAuthToken(
  token: string
): Promise<AuthClaims | null> {
  const secret = getSecretKey();

  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: [ALG] });
    return {
      sub: String(payload.sub),
      email: String(payload.email),
      role: (payload as any).role as Role,
    };
  } catch (err) {
    console.log("Error verifying token:", err);
    return null;
  }
}

// Read token from Authorization: Bearer or cookie "auth"
export function readAuthToken(req: Request): string | null {
  const h = req.headers.get("authorization");
  if (h?.startsWith("Bearer ")) return h.slice(7);

  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;\s*)auth=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export async function getAuth(req: Request): Promise<AuthClaims | null> {
  const token = readAuthToken(req);
  if (!token) return null;
  return await verifyAuthToken(token);
}
