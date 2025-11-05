import { prisma } from "@/lib/db";

// Very naive: return next 5 open slots for a resource by reading GeneratedSlot
export async function POST(req: Request) {
  const { resourceId, from } = await req.json();
  const start = from ? new Date(from) : new Date();
  const slots = await prisma.generatedSlot.findMany({
    where: { resourceId, startAt: { gte: start } },
    orderBy: { startAt: "asc" },
    take: 5,
  });
  return Response.json({ slots });
}
