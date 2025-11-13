import { prisma } from "@/lib/db";

export async function GET() {
  const resources = await prisma.resource.findMany({
    select: { id: true, name: true, capacity: true },
    orderBy: { createdAt: "asc" },
  });
  return Response.json({ resources });
}
