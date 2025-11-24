import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/rbac";
import { verifyOrigin } from "../../../lib/csrf";

/** Make a stable 64-bit bigint from a resourceId (Postgres advisory locks) */
function advisoryKey(resourceId: string) {
  // First 16 hex chars of md5 → bigint
  return `('x' || substr(md5('${resourceId.replace(/'/g, "''")}'), 1, 16))::bit(64)::bigint`;
}

export async function POST(req: Request) {
  // CSRF/Origin
  const csrf = verifyOrigin(req);
  if (csrf) return csrf;

  // RBAC
  const authErr = await requireUser();
  if (authErr) return authErr;

  const body = await req.json().catch(() => ({}));
  const { slotId, resourceId, userEmail } = body || {};
  if (!slotId || !resourceId) {
    return NextResponse.json(
      { error: "INVALID_BODY", message: "slotId and resourceId are required" },
      { status: 400 }
    );
  }

  const idemKey = req.headers.get("Idempotency-Key") || null;
  const route = "/api/book";

  try {
    const mod = await import("@flexslot/db").catch(() => null);
    const prisma: any = (mod as any)?.prisma;
    if (!prisma) return NextResponse.json({ ok: true, id: "demo-reservation" });

    // If idempotent and exists → short-circuit
    if (idemKey) {
      const exists = await prisma.idempotency.findUnique({
        where: { key_route: { key: idemKey, route } },
      });
      if (exists?.response) {
        return NextResponse.json(exists.response as any, { status: 200 });
      }
    }

    const result = await prisma.$transaction(async (tx: any) => {
      // Single-flight per resource across instances
      await tx.$executeRawUnsafe(
        `SELECT pg_advisory_xact_lock(${advisoryKey(resourceId)})`
      );

      // Optional: create/find user first
      let userId: string | null = null;
      if (userEmail) {
        const u = await tx.user.upsert({
          where: { email: userEmail },
          create: { email: userEmail },
          update: {},
          select: { id: true },
        });
        userId = u.id;
      }

      // Flip AVAILABLE → RESERVED atomically
      const updated = await tx.slot.updateMany({
        where: { id: slotId, resourceId, status: "AVAILABLE" },
        data: { status: "RESERVED" },
      });
      if (updated.count === 0) {
        const response = {
          error: "NOT_AVAILABLE",
          message: "Slot is no longer available.",
        };
        return { type: "conflict" as const, response };
      }

      // Create reservation
      const reservation = await tx.reservation.create({
        data: {
          slotId,
          resourceId,
          status: "CONFIRMED",
          confirmedAt: new Date(),
          ...(userId ? { userId } : {}),
        },
        select: { id: true },
      });

      const response = { ok: true, id: reservation.id };
      return { type: "ok" as const, response };
    });

    // Persist idempotency outcome
    if (idemKey) {
      await prisma.idempotency.upsert({
        where: { key_route: { key: idemKey, route } },
        update: {
          response: result.response,
          status: result.type === "ok" ? "succeeded" : "failed",
        },
        create: {
          key: idemKey,
          route,
          response: result.response,
          status: result.type === "ok" ? "succeeded" : "failed",
        },
      });
    }

    if (result.type === "conflict") {
      return NextResponse.json(result.response, { status: 409 });
    }
    return NextResponse.json(result.response);
  } catch (e) {
    console.error("book POST error", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
