// apps/web/app/api/auth/user/login/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { signAuthToken, AUTH_COOKIE } from "../../../../../lib/jwt";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { email, password } = body || {};

  if (!email || !password) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const mod = await import("@flexslot/db").catch(() => null);
  const prisma: any = (mod as any)?.prisma;
  if (!prisma) {
    return NextResponse.json({ error: "NO_DB" }, { status: 500 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  }

  const token = await signAuthToken({
    sub: user.id,
    email: user.email,
    role: "user",
  });

  const res = NextResponse.json(
    {
      ok: true,
      user: { id: user.id, email: user.email, name: user.name },
    },
    { status: 200 }
  );

  // 👇 Use the shared cookie name
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return res;
}
