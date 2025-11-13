import { z } from "zod";
import { prisma } from "@/lib/db";

const Query = z.object({
  resourceId: z.string().optional(),
  day: z.string().optional(), // "today" | "tomorrow" | "YYYY-MM-DD"
  from: z.string().optional(), // ISO
  to: z.string().optional(), // ISO
  limit: z.coerce.number().int().positive().max(1000).optional(),
});

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  return new Date(d.getTime() + n * 24 * 60 * 60 * 1000);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = Query.safeParse(
    Object.fromEntries(url.searchParams.entries())
  );
  if (!parsed.success)
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const { resourceId, day, from, to, limit = 200 } = parsed.data;

  let gte: Date, lt: Date;
  if (from && to) {
    gte = new Date(from);
    lt = new Date(to);
  } else {
    const base =
      day === "tomorrow"
        ? addDays(new Date(), 1)
        : day && /^\d{4}-\d{2}-\d{2}$/.test(day)
          ? new Date(`${day}T00:00:00`)
          : new Date();
    gte = startOfDay(base);
    lt = addDays(gte, 1);
  }

  const where: any = {
    startsAt: { gte, lt },
  };
  if (resourceId) where.resourceId = resourceId;

  const slots = await prisma.slot.findMany({
    where,
    orderBy: { startsAt: "asc" },
    include: { resource: true, reservations: true, holds: true },
    take: limit,
  });

  return Response.json({ count: slots.length, window: { gte, lt }, slots });
}
