import { NextResponse } from "next/server";

// TODO: verify the webhook signature per your PSP.
function parseEvent(
  req: Request
): Promise<{ type: string; id: string; metadata?: Record<string, string> }> {
  // Stripe example: const event = stripe.webhooks.constructEvent(rawBody, sig, secret)
  // Return { type: 'payment_succeeded', id: paymentIntent.id, metadata: paymentIntent.metadata }
  return req.json();
}

export async function POST(req: Request) {
  try {
    const evt = await parseEvent(req);

    if (evt.type === "payment_succeeded") {
      const paymentId = evt.id;
      const holdId = evt.metadata?.holdId;
      if (!holdId) return NextResponse.json({ ok: true });

      // Run the same transaction you use in /holds/:id/confirm,
      // but *idempotently* using paymentId as the Idempotency-Key.
      const mod = await import("@flexslot/db").catch(() => null);
      const prisma: any = (mod as any)?.prisma;
      if (!prisma) return NextResponse.json({ ok: true });

      // Idempotency short-circuit
      const exists = await prisma.idempotency.findUnique({
        where: { key_route: { key: paymentId, route: "webhook_confirm" } },
      });
      if (exists?.response) return NextResponse.json(exists.response as any);

      // === BEGIN TX ===
      const out = await prisma.$transaction(async (tx: any) => {
        // Load hold+slot, verify ACTIVE & not expired
        const hold = await tx.hold.findUnique({
          where: { id: holdId },
          select: {
            id: true,
            status: true,
            expiresAt: true,
            slotId: true,
            slot: { select: { resourceId: true, status: true } },
          },
        });
        if (!hold || hold.status !== "ACTIVE" || hold.expiresAt <= new Date()) {
          return { ok: false, error: "HOLD_EXPIRED_OR_INVALID" };
        }

        // Flip slot to RESERVED (tolerate HELD or AVAILABLE if a sweeper reset it)
        const ok = await tx.slot.updateMany({
          where: { id: hold.slotId, status: { in: ["HELD", "AVAILABLE"] } },
          data: { status: "RESERVED" },
        });
        if (ok.count === 0) {
          return { ok: false, error: "NOT_AVAILABLE" }; // rare edge case
        }

        // Create reservation; you can attach userId if hold.userId is set
        const res = await tx.reservation.create({
          data: {
            slotId: hold.slotId,
            resourceId: hold.slot!.resourceId,
            status: "CONFIRMED",
            confirmedAt: new Date(),
          },
          select: { id: true },
        });

        await tx.hold.update({
          where: { id: hold.id },
          data: { status: "CONVERTED" },
        });
        return { ok: true, reservationId: res.id };
      });
      // === END TX ===

      await prisma.idempotency.upsert({
        where: { key_route: { key: paymentId, route: "webhook_confirm" } },
        update: { response: out },
        create: {
          key: paymentId,
          route: "webhook_confirm",
          response: out,
          status: out.ok ? "succeeded" : "failed",
        },
      });

      return NextResponse.json(out);
    }

    if (evt.type === "payment_failed") {
      // Optionally cancel the hold immediately (or let sweeper expire it)
      // await prisma.hold.update({ where: { id: holdId }, data: { status: "CANCELED" } });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("payments webhook error", e);
    return NextResponse.json({ ok: true });
  }
}
