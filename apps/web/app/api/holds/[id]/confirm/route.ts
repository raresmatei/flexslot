import { NextResponse } from "next/server";
import { requireUser } from "../../../../../lib/rbac";
import { verifyOrigin } from "../../../../../lib/csrf";

function slotLockKey(slotId: string) {
  const safe = slotId.replace(/'/g, "''");
  return `('x' || substr(md5('${safe}'), 1, 16))::bit(64)::bigint`;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrf = verifyOrigin(req);
  if (csrf) return csrf;
  const authErr = await requireUser();
  if (authErr) return authErr;

  const { id: holdId } = await params;

  const body = await req.json().catch(() => ({}));
  const { token, userEmail } = body || {};
  if (!token) {
    return NextResponse.json(
      { error: "INVALID_BODY", message: "token is required" },
      { status: 400 }
    );
  }

  try {
    const mod = await import("@flexslot/db").catch(() => null);
    const prisma: any = (mod as any)?.prisma;
    if (!prisma) return NextResponse.json({ ok: true, id: "demo-reservation" });

    const result = await prisma.$transaction(async (tx: any) => {
      // Load hold + slot to get slotId and userId
      const hold = await tx.hold.findUnique({
        where: { id: holdId },
        select: {
          id: true,
          token: true,
          status: true,
          expiresAt: true,
          userId: true, // 🔑 make userId available
          slotId: true,
          slot: { select: { id: true, resourceId: true, status: true } },
        },
      });
      if (!hold || hold.token !== token) return { type: "notfound" as const };
      if (hold.status !== "ACTIVE" || hold.expiresAt <= new Date())
        return { type: "expired" as const };

      // Lock this slot
      await tx.$executeRawUnsafe(
        `SELECT pg_advisory_xact_lock(${slotLockKey(hold.slotId)})`
      );

      // Check again inside lock
      const fresh = await tx.hold.findUnique({
        where: { id: holdId },
        select: {
          status: true,
          expiresAt: true,
          slotId: true,
          slot: { select: { status: true, resourceId: true } },
        },
      });
      if (!fresh || fresh.status !== "ACTIVE" || fresh.expiresAt <= new Date())
        return { type: "expired" as const };

      // Ensure slot is not already reserved/blocked
      const updatedSlot = await tx.slot.updateMany({
        where: { id: fresh.slotId, status: { in: ["HELD", "AVAILABLE"] } },
        data: { status: "RESERVED" },
      });
      if (updatedSlot.count === 0) return { type: "conflict" as const };

      // Optional: attach user (fallback if you want to support email-based)
      let userId: string | null = hold.userId ?? null;
      if (!userId && userEmail) {
        const u = await tx.user.upsert({
          where: { email: userEmail },
          create: { email: userEmail },
          update: {},
          select: { id: true },
        });
        userId = u.id;
      }

      // Create reservation
      const reservation = await tx.reservation.create({
        data: {
          slotId: fresh.slotId,
          resourceId: fresh.slot!.resourceId,
          status: "CONFIRMED",
          confirmedAt: new Date(),
          ...(userId ? { userId } : {}),
        },
        select: { id: true },
      });

      // Convert hold
      await tx.hold.update({
        where: { id: holdId },
        data: { status: "CONVERTED" },
      });

      return { type: "ok" as const, id: reservation.id };
    });

    if (result.type === "notfound")
      return NextResponse.json({ error: "HOLD_NOT_FOUND" }, { status: 404 });
    if (result.type === "expired")
      return NextResponse.json({ error: "HOLD_EXPIRED" }, { status: 409 });
    if (result.type === "conflict")
      return NextResponse.json({ error: "NOT_AVAILABLE" }, { status: 409 });

    return NextResponse.json({ ok: true, id: result.id });
  } catch (e) {
    console.error("confirm-hold error", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
