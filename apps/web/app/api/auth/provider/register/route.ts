import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { signAuthToken } from "../../../../../lib/jwt";

export async function POST(req: Request) {
  const { email, password, name } = await req.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json({ error: "MISSING_CREDENTIALS" }, { status: 400 });
  }

  const mod = await import("@flexslot/db").catch(() => null);
  const prisma: any = (mod as any)?.prisma;

  const hash = await bcrypt.hash(password, 10);

  const provider = await prisma.providerAccount.upsert({
    where: { email },
    create: { email, name: name || null, passwordHash: hash },
    update: { name: name || undefined, ...(password ? { passwordHash: hash } : {}) },
    select: { id: true, email: true, name: true },
  });

  const token = await signAuthToken({ sub: provider.id, email: provider.email, role: "provider" });
  const res = NextResponse.json({ provider });
  res.cookies.set("auth", token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
