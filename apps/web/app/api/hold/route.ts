import { HoldRequest } from "@flexslot/types";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/db";

// Uses Redis SET NX EX as a fast mutex; mirrors to DB for audit/visibility.
export async function POST(req: Request) {
  const body = await req.json();
  const parsed = HoldRequest.safeParse(body);
  if (!parsed.success) return new Response("Invalid payload", { status: 400 });
  const { resourceId, startAt, endAt, customerEmail } = parsed.data;

  const key = `hold:${resourceId}:${startAt}`;
  const ttlSec = 10 * 60; // 10 minutes

  const lock = await redis.set(key, customerEmail, "NX", "EX", ttlSec);
  if (!lock) return new Response("Slot already held", { status: 409 });

  // Mirror to DB (unique(resourceId,startAt) ensures no dup holds)
  try {
    await prisma.hold.create({
      data: {
        resourceId,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        customerEmail,
        expiresAt: new Date(Date.now() + ttlSec * 1000),
      },
    });
  } catch (e) {
    // If DB uniqueness fails, release Redis lock
    await redis.del(key);
    return new Response("Hold conflict", { status: 409 });
  }

  return Response.json({ ok: true, expiresIn: ttlSec });
}
