// apps/web/app/api/me/reservations/route.ts
import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/rbac";
import { getSession } from "../../../../lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  console.log("in reservations");
  const authErr = await requireUser();
  if (authErr) return authErr;

  const session = await getSession();
  if (!session) {
    return NextResponse.json([], {
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    const mod = await import("@flexslot/db").catch(() => null);
    const prisma: any = (mod as any)?.prisma;

    if (!prisma) {
      return NextResponse.json(
        [
          {
            id: "demo",
            status: "CONFIRMED",
            start: new Date().toISOString(),
            end: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            resourceId: "r1",
            resourceName: "Demo Resource",
            location: "Demo",
          },
        ],
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const rows = await prisma.reservation.findMany({
      where: {
        userId: session.sub, // <-- userId from JWT
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        status: true,
        slot: {
          select: {
            startsAt: true,
            endsAt: true,
            resourceId: true,
            resource: { select: { name: true, location: true } },
          },
        },
      },
    });

    const data = rows
      .filter((r: any) => r.slot)
      .map((r: any) => ({
        id: r.id,
        status: r.status,
        start: r.slot.startsAt.toISOString(),
        end: r.slot.endsAt.toISOString(),
        resourceId: r.slot.resourceId,
        resourceName: r.slot.resource?.name ?? "Resource",
        location: r.slot.resource?.location ?? null,
      }));

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("/api/me/reservations error", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
