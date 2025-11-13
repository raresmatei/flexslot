import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const secret = req.headers.get("x-mock-secret") ?? "";
  if (secret && secret !== process.env.MOCK_PROVIDER_TOKEN) {
    return new Response("forbidden", { status: 403 });
  }

  const body = await req.json();
  // { subscriptionId, calendarId, changeType, event: { id, uid, start, end, ... } }
  const { calendarId, changeType, event } = body;

  // Find mapping by UID if you store it, or by externalEventId (for simplicity, use UID)
  const map = await prisma.externalEventMap.findFirst({
    where: { provider: "mock", externalCalendarId: calendarId, uid: event.uid },
  });

  if (!map) {
    // Unknown event -> optional: create BLOCKED slots / mark needsReview
    return Response.json({ ignored: true });
  }

  if (changeType === "deleted") {
    // cancel reservation and free slot
    await prisma.$transaction(async (tx) => {
      if (map.reservationId) {
        await tx.reservation.update({
          where: { id: map.reservationId },
          data: { status: "CANCELED" },
        });
        const resv = await tx.reservation.findUnique({
          where: { id: map.reservationId },
          select: { slotId: true },
        });
        if (resv)
          await tx.slot.update({
            where: { id: resv.slotId },
            data: { status: "AVAILABLE" },
          });
      }
      await tx.externalEventMap.delete({ where: { id: map.id } });
    });
    return Response.json({ ok: true });
  }

  // update times if changed
  await prisma.$transaction(async (tx) => {
    if (!map.reservationId) return;
    const resv = await tx.reservation.findUnique({
      where: { id: map.reservationId },
      include: { slot: true },
    });
    if (!resv) return;

    const newStart = new Date(event.start);
    const newEnd = new Date(event.end);

    // naive PoC: just update slot timestamps if free (no collision checks)
    await tx.slot.update({
      where: { id: resv.slotId },
      data: { startsAt: newStart, endsAt: newEnd },
    });
  });

  return Response.json({ ok: true });
}
