import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-11-20.acacia",
});
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

function slotLockKey(slotId: string) {
  const safe = slotId.replace(/'/g, "''");
  return `('x' || substr(md5('${safe}'), 1, 16))::bit(64)::bigint`;
}

export async function POST(req: Request) {
  let event: Stripe.Event;
  try {
    const sig = req.headers.get("stripe-signature") || "";
    const raw = await req.text();
    event = stripe.webhooks.constructEvent(raw, sig, WEBHOOK_SECRET);
  } catch (err: any) {
    console.error("stripe webhook verify fail", err?.message);
    return new NextResponse("Bad signature", { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const paymentId = pi.id;
    const holdId = (pi.metadata?.holdId as string) || null;
    if (!holdId) return NextResponse.json({ ok: true });

    try {
      const mod = await import("@flexslot/db").catch(() => null);
      const prisma: any = (mod as any)?.prisma;
      if (!prisma) return NextResponse.json({ ok: true });

      // Idempotency
      const exists = await prisma.idempotency.findUnique({
        where: { key_route: { key: paymentId, route: "webhook_confirm" } },
      });
      if (exists?.response) return NextResponse.json(exists.response as any);

      const out = await prisma.$transaction(async (tx: any) => {
        const hold = await tx.hold.findUnique({
          where: { id: holdId },
          select: {
            id: true,
            status: true,
            expiresAt: true,
            userId: true, // 🔑 we need this
            slotId: true,
            slot: { select: { resourceId: true, status: true } },
          },
        });
        if (
          !hold ||
          hold.status !== "ACTIVE" ||
          (hold.expiresAt && hold.expiresAt <= new Date())
        ) {
          return { ok: false, error: "HOLD_EXPIRED_OR_INVALID" };
        }

        // Lock by slotId so two confirms can't race
        await tx.$executeRawUnsafe(
          `SELECT pg_advisory_xact_lock(${slotLockKey(hold.slotId)})`
        );

        // Flip HELD/AVAILABLE → RESERVED
        const updated = await tx.slot.updateMany({
          where: { id: hold.slotId, status: { in: ["HELD", "AVAILABLE"] } },
          data: { status: "RESERVED" },
        });
        if (updated.count === 0) {
          return { ok: false, error: "NOT_AVAILABLE" };
        }

        console.log("hold.userId in STRIPE:", hold.userId);
        const res = await tx.reservation.create({
          data: {
            slotId: hold.slotId,
            resourceId: hold.slot!.resourceId,
            status: "CONFIRMED",
            confirmedAt: new Date(),
            ...(hold.userId ? { userId: hold.userId } : {}),
          },
          select: { id: true },
        });

        await tx.hold.update({
          where: { id: hold.id },
          data: { status: "CONVERTED" },
        });

        return { ok: true, reservationId: res.id };
      });

      await prisma.idempotency.upsert({
        where: { key_route: { key: paymentId, route: "webhook_confirm" } },
        update: { response: out, status: out.ok ? "succeeded" : "failed" },
        create: {
          key: paymentId,
          route: "webhook_confirm",
          response: out,
          status: out.ok ? "succeeded" : "failed",
        },
      });

      return NextResponse.json(out);
    } catch (e) {
      console.error("webhook confirm error", e);
      return NextResponse.json({ ok: true });
    }
  }

  return NextResponse.json({ ok: true });
}
