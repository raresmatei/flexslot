import { NextResponse } from "next/server";
import { requireUser } from "../../../../../lib/rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requireUser();
  if (authErr) return authErr;

  const { id } = await params;

  try {
    const mod = await import("@flexslot/db").catch(() => null);
    const prisma: any = (mod as any)?.prisma;

    if (!prisma) {
      return NextResponse.json(
        { status: "CONVERTED", reservationId: "demo-res" },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const hold = await prisma.hold.findUnique({
      where: { id },
      select: {
        status: true,
        expiresAt: true,
        slotId: true,
        slot: { select: { id: true } },
      },
    });
    if (!hold) {
      return NextResponse.json(
        { status: "NOT_FOUND" },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    let reservationId: string | null = null;
    if (hold.slotId) {
      const r = await prisma.reservation.findFirst({
        where: {
          slotId: hold.slotId,
          status: { in: ["PENDING", "CONFIRMED"] },
        },
        select: { id: true },
      });
      reservationId = r?.id ?? null;
    }

    return NextResponse.json(
      {
        status: hold.status,
        expiresAt: hold.expiresAt?.toISOString() ?? null,
        reservationId,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error("hold status error", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
