import { NextResponse } from "next/server";
import { requireUser } from "../../../lib/rbac";
import { verifyOrigin } from "../../../lib/csrf";

const HOLD_TTL_SEC = 120; // 2 minutes

function slotLockKey(slotId: string) {
  const safe = slotId.replace(/'/g, "''");
  return `('x' || substr(md5('${safe}'), 1, 16))::bit(64)::bigint`;
}

// Try to derive the logged-in user's email from headers/cookies.
// Fallback to body.userEmail only if nothing else is available.
function getSessionEmail(req: Request, fallback?: string | null) {
  const h = req.headers;
  const fromHeader = h.get("x-user-email") || h.get("x-dev-email");
  if (fromHeader) return fromHeader;

  const cookie = h.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookie
      .split(/;\s*/)
      .filter(Boolean)
      .map((p) => {
        const i = p.indexOf("=");
        return [
          decodeURIComponent(p.slice(0, i)),
          decodeURIComponent(p.slice(i + 1)),
        ];
      })
  );
  // Common dev cookie names you might be using; add yours if different.
  const fromCookie =
    cookies["fs_dev_email"] ||
    cookies["dev_email"] ||
    cookies["user_email"] ||
    null;

  return (fromCookie as string) || (fallback ?? null);
}

export async function POST(req: Request) {
  // CSRF + must be authenticated
  const csrf = verifyOrigin(req);
  if (csrf) return csrf;
  const authErr = await requireUser();
  if (authErr) return authErr;

  const body = await req.json().catch(() => ({}));
  const { slotId, resourceId, userEmail: bodyEmail } = body || {};
  if (!slotId || !resourceId) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  // Bind hold to the *session* user (so webhook can attach same userId).
  // If you have a formal session helper, swap this with it.
  const sessionEmail = getSessionEmail(req, bodyEmail);

  try {
    const mod = await import("@flexslot/db").catch(() => null);
    const prisma: any = (mod as any)?.prisma;

    if (!prisma) {
      return NextResponse.json({
        id: "demo-hold",
        token: crypto.randomUUID(),
        expiresAt: new Date(Date.now() + HOLD_TTL_SEC * 1000).toISOString(),
      });
    }

    const out = await prisma.$transaction(async (tx: any) => {
      // Single-flight per slot across instances
      await tx.$executeRawUnsafe(
        `SELECT pg_advisory_xact_lock(${slotLockKey(slotId)})`
      );

      // Only move AVAILABLE → HELD
      const changed = await tx.slot.updateMany({
        where: { id: slotId, resourceId, status: "AVAILABLE" },
        data: { status: "HELD" },
      });
      if (changed.count === 0) return { type: "conflict" as const };

      // Upsert the session user (if we could resolve an email)
      let userId: string | null = null;
      if (sessionEmail) {
        const u = await tx.user.upsert({
          where: { email: sessionEmail },
          create: { email: sessionEmail },
          update: {},
          select: { id: true },
        });
        userId = u.id;
      }

      console.log("create hold for userId", userId);

      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + HOLD_TTL_SEC * 1000);

      const hold = await tx.hold.create({
        data: { slotId, userId, status: "ACTIVE", token, expiresAt },
        select: { id: true, token: true, expiresAt: true },
      });

      return { type: "ok" as const, hold };
    });

    if (out.type === "conflict") {
      return NextResponse.json({ error: "NOT_AVAILABLE" }, { status: 409 });
    }

    return NextResponse.json({
      id: out.hold.id,
      token: out.hold.token,
      expiresAt: out.hold.expiresAt.toISOString(),
    });
  } catch (e) {
    console.error("create-hold error", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
