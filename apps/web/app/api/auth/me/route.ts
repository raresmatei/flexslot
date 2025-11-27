import { NextResponse } from "next/server";
import { getAuth } from "../../../../lib/jwt";

export async function GET(req: Request) {
  const claims = await getAuth(req);
  if (!claims)
    return NextResponse.json({ authenticated: false }, { status: 401 });

  const mod = await import("@flexslot/db").catch(() => null);
  const prisma: any = (mod as any)?.prisma;

  if (claims.role === "user") {
    const user = await prisma.user.findUnique({
      where: { id: claims.sub },
      select: { id: true, email: true, name: true },
    });
    if (!user)
      return NextResponse.json({ authenticated: false }, { status: 401 });
    return NextResponse.json({ authenticated: true, role: "user", user });
  }

  if (claims.role === "provider") {
    const provider = await prisma.providerAccount.findUnique({
      where: { id: claims.sub },
      select: { id: true, email: true, name: true },
    });
    if (!provider)
      return NextResponse.json({ authenticated: false }, { status: 401 });
    return NextResponse.json({
      authenticated: true,
      role: "provider",
      provider,
    });
  }

  return NextResponse.json({ authenticated: false }, { status: 401 });
}
