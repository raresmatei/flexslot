import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/rbac";
import { getSession } from "../../../../lib/auth";

export async function GET() {
  const authErr = await requireUser();
  if (authErr) return authErr;

  try {
    const mod = await import("@flexslot/db").catch(() => null);
    const prisma: any = (mod as any)?.prisma;

    // Dev fallback when DB isn’t wired
    if (!prisma) {
      const now = Date.now();
      const mk = (
        min: number,
        status: "CONFIRMED" | "PENDING" | "CANCELED"
      ) => {
        const start = new Date(now + min * 60_000);
        const end = new Date(start.getTime() + 60 * 60_000);
        return {
          id: `demo-${min}`,
          start: start.toISOString(),
          end: end.toISOString(),
          status,
          resourceId: "demo-res-1",
          resourceName: "Demo Resource A",
          location: "Center",
        };
      };
      return NextResponse.json([mk(60, "CONFIRMED"), mk(180, "PENDING")]);
    }

    const session = await getSession();
    const email = session?.userEmail;
    if (!email) return NextResponse.json([]);

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) return NextResponse.json([]);

    const reservations = await prisma.reservation.findMany({
      where: { userId: user.id, status: { in: ["CONFIRMED", "PENDING"] } },
      orderBy: { slot: { startsAt: "asc" } },
      select: {
        id: true,
        status: true,
        slot: {
          select: {
            startsAt: true,
            endsAt: true,
            resource: { select: { id: true, name: true, location: true } },
          },
        },
      },
    });

    const data = reservations
      .filter((r: any) => r.slot?.startsAt && r.slot?.endsAt)
      .map((r: any) => ({
        id: r.id,
        start: r.slot.startsAt.toISOString(),
        end: r.slot.endsAt.toISOString(),
        status: r.status as "CONFIRMED" | "PENDING" | "CANCELED",
        resourceId: r.slot.resource.id as string,
        resourceName: (r.slot.resource.name as string) ?? "Resource",
        location: (r.slot.resource.location as string) ?? null,
      }));

    return NextResponse.json(data);
  } catch (e) {
    console.error("me/reservations GET error", e);
    return NextResponse.json([], { status: 200 });
  }
}
