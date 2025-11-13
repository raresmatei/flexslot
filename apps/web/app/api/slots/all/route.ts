import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const resourceId = url.searchParams.get("resourceId") || undefined;
  const limit = Math.min(Number(url.searchParams.get("limit") || "2000"), 5000);

  if (!resourceId) {
    return Response.json({ error: "resourceId required" }, { status: 400 });
  }

  const slots = await prisma.slot.findMany({
    where: { resourceId },
    orderBy: { startsAt: "asc" },
    include: {
      resource: true,
      holds: true,
      reservations: true,
    },
    take: limit,
  });

  return Response.json({ count: slots.length, slots });
}
