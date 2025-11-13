import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const resourceId = params.id;

  try {
    const mod = await import("@flexslot/db").catch(() => null);
    const prisma: any = (mod as any)?.prisma;

    if (prisma) {
      const slots = await prisma.slot.findMany({
        where: { resourceId, status: "AVAILABLE" },
        orderBy: { startsAt: "asc" },
        select: {
          id: true,
          resourceId: true,
          startsAt: true,
          endsAt: true,
          // add fields here if you later store price, tags, etc.
        },
      });

      // Adapt to UI shape
      const ui = slots.map((s: any) => ({
        id: s.id,
        providerId: resourceId, // for UI compatibility; really it's resourceId
        resourceId: s.resourceId,
        start: s.startsAt.toISOString(),
        end: s.endsAt.toISOString(),
        price: null as number | null,
        location: null as string | null,
        capacity: null as number | null,
        tags: [] as string[],
      }));

      return NextResponse.json(ui);
    }
  } catch {
    // ignore and use fallback
  }

  // Dev fallback: 3 upcoming demo slots
  const now = Date.now();
  const mk = (offsetMin: number) => {
    const start = new Date(now + offsetMin * 60_000);
    const end = new Date(start.getTime() + 60 * 60_000);
    return {
      id: `demo-slot-${offsetMin}`,
      providerId: resourceId,
      resourceId,
      start: start.toISOString(),
      end: end.toISOString(),
      price: null,
      location: null,
      capacity: null,
      tags: [],
    };
  };
  return NextResponse.json([mk(60), mk(180), mk(300)]);
}
