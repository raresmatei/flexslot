import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { signAuthToken } from "../../../../../lib/jwt";

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json({ error: "MISSING_CREDENTIALS" }, { status: 400 });
  }

  const mod = await import("@flexslot/db").catch(() => null);
  const prisma: any = (mod as any)?.prisma;

  const provider = await prisma.providerAccount.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, passwordHash: true },
  });
  if (!provider || !(await bcrypt.compare(password, provider.passwordHash))) {
    return NextResponse.json({ error: "INVALID_LOGIN" }, { status: 401 });
  }

  const token = await signAuthToken({
    sub: provider.id,
    email: provider.email,
    role: "provider",
  });
  const res = NextResponse.json({
    provider: { id: provider.id, email: provider.email, name: provider.name },
  });
  res.cookies.set("auth", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
