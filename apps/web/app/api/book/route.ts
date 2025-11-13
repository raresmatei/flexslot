import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/rbac";

export async function POST(req: Request) {
  const authErr = await requireUser();
  if (authErr) return authErr;

  const body = await req.json().catch(() => ({}));
  const { slotId, resourceId, userEmail } = body || {};

  if (!slotId || !resourceId) {
    return NextResponse.json(
      { error: "INVALID_BODY", message: "slotId and resourceId are required" },
      { status: 400 }
    );
  }

  try {
    const mod = await import("@flexslot/db").catch(() => null);
    const prisma: any = (mod as any)?.prisma;

    // Dev fallback (no DB wired)
    if (!prisma) return NextResponse.json({ ok: true, id: "demo-reservation" });

    const result = await prisma.$transaction(async (tx: any) => {
      // Optional: create/find a user id first (no nested write)
      let userId: string | null = null;
      if (userEmail) {
        const u = await tx.user.upsert({
          where: { email: userEmail },
          create: { email: userEmail },
          update: {},
          select: { id: true },
        });
        userId = u.id;
      }

      // Race-safe: only flip to RESERVED if it's still AVAILABLE
      const updated = await tx.slot.updateMany({
        where: { id: slotId, resourceId, status: "AVAILABLE" },
        data: { status: "RESERVED" },
      });
      if (updated.count === 0) {
        return { conflict: true as const };
      }

      const reservation = await tx.reservation.create({
        data: {
          slotId,
          resourceId,
          status: "CONFIRMED",
          confirmedAt: new Date(),
          ...(userId ? { userId } : {}),
        },
        select: { id: true },
      });

      return { id: reservation.id };
    });

    if ("conflict" in result) {
      return NextResponse.json(
        { error: "NOT_AVAILABLE", message: "Slot is no longer available." },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: true, id: result.id });
  } catch (e) {
    console.error("book POST error", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
