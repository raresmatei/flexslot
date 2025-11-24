import { NextResponse } from "next/server";
import { requireUser } from "@/lib/rbac";
import { verifyOrigin } from "@/lib/csrf";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-11-20.acacia", // use your installed version; safe to keep recent
});

export async function POST(req: Request) {
  const csrf = verifyOrigin(req);
  if (csrf) return csrf;
  const authErr = await requireUser();
  if (authErr) return authErr;

  const {
    holdId,
    amountCents,
    currency = "eur",
  } = await req.json().catch(() => ({}));
  if (!holdId || !amountCents) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  try {
    // Optional: ensure the hold exists & still ACTIVE
    const mod = await import("@flexslot/db").catch(() => null);
    const prisma: any = (mod as any)?.prisma;
    if (prisma) {
      const h = await prisma.hold.findUnique({
        where: { id: holdId },
        select: { status: true, expiresAt: true },
      });
      if (
        !h ||
        h.status !== "ACTIVE" ||
        (h.expiresAt && h.expiresAt <= new Date())
      ) {
        return NextResponse.json({ error: "HOLD_EXPIRED" }, { status: 409 });
      }
    }

    const pi = await stripe.paymentIntents.create({
      amount: Math.max(1, Math.floor(Number(amountCents))),
      currency,
      metadata: { holdId },
      automatic_payment_methods: { enabled: true },
    });

    return NextResponse.json({
      paymentId: pi.id,
      clientSecret: pi.client_secret,
    });
  } catch (e: any) {
    console.error("create PI error", e);
    return NextResponse.json(
      { error: "PAYMENT_ERROR", message: e?.message },
      { status: 500 }
    );
  }
}
