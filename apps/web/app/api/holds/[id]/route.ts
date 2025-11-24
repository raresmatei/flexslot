import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/rbac";

function slotLockKey(slotId: string) {
  const safe = slotId.replace(/'/g, "''");
  return `('x' || substr(md5('${safe}'), 1, 16))::bit(64)::bigint`;
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const authErr = await requireUser();
  if (authErr) return authErr;

  try {
    const mod = await import("@flexslot/db").catch(() => null);
    const prisma: any = (mod as any)?.prisma;
    if (!prisma) return NextResponse.json({ ok: true });

    const hold = await prisma.hold.findUnique({
      where: { id: params.id },
      select: { id: true, status: true, slotId: true },
    });
    if (!hold) return NextResponse.json({ ok: true });

    await prisma.$transaction(async (tx: any) => {
      await tx.$executeRawUnsafe(
        `SELECT pg_advisory_xact_lock(${slotLockKey(hold.slotId)})`
      );
      await tx.hold.update({
        where: { id: params.id },
        data: { status: "CANCELED" },
      });
      await tx.$executeRawUnsafe(
        `UPDATE "Slot" s
           SET "status"='AVAILABLE', "updatedAt"=now()
         WHERE s."id" = $1
           AND s."status"='HELD'
           AND NOT EXISTS (SELECT 1 FROM "Hold" h WHERE h."slotId"=s."id" AND h."status"='ACTIVE')
           AND NOT EXISTS (SELECT 1 FROM "Reservation" r WHERE r."slotId"=s."id" AND r."status" IN ('PENDING','CONFIRMED'))`,
        hold.slotId
      );
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("cancel-hold error", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
