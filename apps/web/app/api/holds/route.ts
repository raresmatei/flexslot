import { NextResponse } from "next/server";
import { getAuth } from "../../../lib/jwt";

const HOLD_TTL_SEC = 120;
function slotLockKey(slotId: string) {
  const safe = slotId.replace(/'/g, "''");
  return `('x' || substr(md5('${safe}'), 1, 16))::bit(64)::bigint`;
}

export async function POST(req: Request) {
  const { slotId, resourceId, userId } = await req.json().catch(() => ({}));
  if (!slotId || !resourceId || !userId) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const auth = await getAuth(req);
  if (!auth || auth.role !== "user" || auth.sub !== userId) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const mod = await import("@flexslot/db").catch(() => null);
  const prisma: any = (mod as any)?.prisma;

  const out = await prisma.$transaction(async (tx: any) => {
    await tx.$executeRawUnsafe(
      `SELECT pg_advisory_xact_lock(${slotLockKey(slotId)})`
    );
    const changed = await tx.slot.updateMany({
      where: { id: slotId, resourceId, status: "AVAILABLE" },
      data: { status: "HELD" },
    });
    if (changed.count === 0) return { type: "conflict" as const };

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + HOLD_TTL_SEC * 1000);

    const hold = await tx.hold.create({
      data: { slotId, userId, status: "ACTIVE", token, expiresAt },
      select: { id: true, token: true, expiresAt: true },
    });

    return { type: "ok" as const, hold };
  });

  if ((out as any).type === "conflict") {
    return NextResponse.json({ error: "NOT_AVAILABLE" }, { status: 409 });
  }

  return NextResponse.json({
    id: (out as any).hold.id,
    token: (out as any).hold.token,
    expiresAt: (out as any).hold.expiresAt.toISOString(),
  });
}
