import { NextResponse } from "next/server";

function ok(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return token && token === process.env.CRON_SECRET;
}

export async function POST(req: Request) {
  if (!ok(req)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  try {
    const mod = await import("@flexslot/db").catch(() => null);
    const prisma: any = (mod as any)?.prisma;
    if (!prisma)
      return NextResponse.json({ expired: 0, freed: 0, leader: true });

    const res = await prisma.$transaction(async (tx: any) => {
      // Leader election for this job (unique number for this cron)
      const got = await tx.$queryRawUnsafe<{ pg_try_advisory_lock: boolean }[]>(
        `SELECT pg_try_advisory_lock(9001) AS pg_try_advisory_lock`
      );
      if (!got?.[0]?.pg_try_advisory_lock) {
        return { expired: 0, freed: 0, leader: false };
      }

      // 1) Expire holds past their TTL
      const expireCount = await tx.$executeRawUnsafe(
        `UPDATE "Hold" 
           SET "status"='EXPIRED', "updatedAt"=now()
         WHERE "status"='ACTIVE' AND "expiresAt" < now()`
      );

      // 2) Free slots stuck in HELD when no active holds remain
      //    and no active reservation exists on that slot
      const freeCount = await tx.$executeRawUnsafe(
        `UPDATE "Slot" s
            SET "status"='AVAILABLE', "updatedAt"=now()
          WHERE s."status"='HELD'
            AND NOT EXISTS (
              SELECT 1 FROM "Hold" h
              WHERE h."slotId" = s."id" AND h."status"='ACTIVE'
            )
            AND NOT EXISTS (
              SELECT 1 FROM "Reservation" r
              WHERE r."slotId" = s."id" AND r."status" IN ('PENDING','CONFIRMED')
            )`
      );

      // (Optional: explicit unlock) SELECT pg_advisory_unlock(9001);

      return {
        expired: Number(expireCount) || 0,
        freed: Number(freeCount) || 0,
        leader: true,
      };
    });

    return NextResponse.json(res ?? { expired: 0, freed: 0, leader: false });
  } catch (e) {
    console.error("holds-expiry error", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
