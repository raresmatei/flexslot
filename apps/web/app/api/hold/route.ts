import { z } from "zod";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

const Body = z.object({
  slotId: z.string(),
  userEmail: z.string().email().optional(),
  ttlSeconds: z.number().int().positive().max(3600).optional(), // default 15 min
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(json);
  if (!parsed.success)
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const { slotId, userEmail, ttlSeconds = 900 } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // ensure slot exists & is AVAILABLE
      const slot = await tx.slot.findUnique({ where: { id: slotId } });
      if (!slot) throw new Error("SLOT_NOT_FOUND");
      if (slot.status !== "AVAILABLE") throw new Error("SLOT_NOT_AVAILABLE");

      // optional user
      let userId: string | undefined;
      if (userEmail) {
        const user = await tx.user.upsert({
          where: { email: userEmail },
          update: {},
          create: { email: userEmail },
          select: { id: true },
        });
        userId = user.id;
      }

      // mark HELD
      await tx.slot.update({ where: { id: slotId }, data: { status: "HELD" } });

      // create hold
      const hold = await tx.hold.create({
        data: {
          slotId,
          userId,
          status: "ACTIVE",
          token: randomUUID(),
          expiresAt: new Date(Date.now() + ttlSeconds * 1000),
        },
      });

      return { hold };
    });

    return Response.json({
      holdId: result.hold.id,
      token: result.hold.token,
      expiresAt: result.hold.expiresAt,
    });
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (msg === "SLOT_NOT_FOUND")
      return Response.json({ error: msg }, { status: 404 });
    if (msg === "SLOT_NOT_AVAILABLE")
      return Response.json({ error: msg }, { status: 409 });
    return Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
