import { prisma } from "@/lib/db";

function maskDbUrl(url?: string) {
  if (!url) return null;
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}:${u.port}${u.pathname}`;
  } catch {
    return "unparsable";
  }
}

export async function GET() {
  const out: any = { db: "down" as const };

  try {
    await prisma.$queryRaw`SELECT 1`;
    out.db = "up";
  } catch (e) {
    out.error = String(e);
    return Response.json(out, { status: 500 });
  }

  const [resources, slots, holds, reservations] = await Promise.all([
    prisma.resource.count(),
    prisma.slot.count(),
    prisma.hold.count(),
    prisma.reservation.count(),
  ]);

  const firstSlots = await prisma.slot.findMany({
    take: 5,
    orderBy: { startsAt: "asc" },
    include: { resource: { select: { id: true, name: true } } },
  });

  const lastSlots = await prisma.slot.findMany({
    take: 5,
    orderBy: { startsAt: "desc" },
    include: { resource: { select: { id: true, name: true } } },
  });

  out.counts = { resources, slots, holds, reservations };
  out.sample = { firstSlots, lastSlots };
  out.env = { databaseUrlMasked: maskDbUrl(process.env.DATABASE_URL) };

  return Response.json(out);
}
