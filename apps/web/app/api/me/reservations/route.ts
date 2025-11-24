import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Derive the logged-in user's email the same way you do in create-hold.
 * If you have a proper getSession(), use that instead.
 */
function getSessionEmail(req: Request) {
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

  return (
    (cookies["fs_dev_email"] as string) ||
    (cookies["dev_email"] as string) ||
    (cookies["user_email"] as string) ||
    null
  );
}

export async function GET(req: Request) {
  // must be authenticated
  const authErr = await requireUser();
  if (authErr) return authErr;

  try {
    const mod = await import("@flexslot/db").catch(() => null);
    const prisma: any = (mod as any)?.prisma;
    if (!prisma) {
      // demo shape
      return NextResponse.json(
        [
          {
            id: "demo",
            status: "CONFIRMED",
            start: new Date().toISOString(),
            end: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            resourceId: "r1",
            resourceName: "Demo Resource",
            location: "Demo",
          },
        ],
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const email = getSessionEmail(req);
    if (!email) {
      // no user context => nothing to show
      return NextResponse.json([], {
        headers: { "Cache-Control": "no-store" },
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    console.log("user:", user);

    if (!user) {
      return NextResponse.json([], {
        headers: { "Cache-Control": "no-store" },
      });
    }

    // Fetch this user's active bookings and hydrate with slot/resource details
    const rows = await prisma.reservation.findMany({
      where: {
        userId: user.id,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        status: true,
        slot: {
          select: {
            startsAt: true,
            endsAt: true,
            resourceId: true,
            resource: { select: { name: true, location: true } },
          },
        },
      },
    });

    const data = rows
      .filter((r: any) => r.slot) // safety
      .map((r: any) => ({
        id: r.id,
        status: r.status,
        start: r.slot.startsAt.toISOString(),
        end: r.slot.endsAt.toISOString(),
        resourceId: r.slot.resourceId,
        resourceName: r.slot.resource?.name ?? "Resource",
        location: r.slot.resource?.location ?? null,
      }));

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("/api/me/reservations error", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
