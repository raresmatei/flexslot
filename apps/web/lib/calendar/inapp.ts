import type { CalendarProvider, CalEvent } from "./index";

export class InAppCalendar implements CalendarProvider {
  async list(resourceId: string): Promise<CalEvent[]> {
    const mod = await import("@flexslot/db").catch(() => null);
    const prisma: any = (mod as any)?.prisma;

    if (!prisma) {
      const now = Date.now();
      const mk = (min: number, type: CalEvent["type"], title: string) => {
        const s = new Date(now + min * 60_000);
        const e = new Date(s.getTime() + 60 * 60_000);
        return { id: `${type}-${min}`, start: s, end: e, title, type };
      };
      return [mk(60, "booked", "Booked"), mk(180, "blocked", "Blocked")];
    }

    const reservations = await prisma.reservation.findMany({
      where: { resourceId, status: "CONFIRMED" },
      select: {
        id: true,
        slot: { select: { startsAt: true, endsAt: true } },
        user: { select: { name: true, email: true } },
      },
    });

    const booked: CalEvent[] = reservations
      .filter((r: any) => r.slot?.startsAt && r.slot?.endsAt)
      .map((r: any) => ({
        id: r.id,
        start: r.slot.startsAt,
        end: r.slot.endsAt,
        title: r.user?.name || r.user?.email || "Booked",
        type: "booked",
      }));

    const blockedSlots = await prisma.slot.findMany({
      where: { resourceId, status: "BLOCKED" },
      select: { id: true, startsAt: true, endsAt: true },
    });

    const blocked: CalEvent[] = blockedSlots.map((s: any) => ({
      id: s.id,
      start: s.startsAt,
      end: s.endsAt,
      title: "Blocked",
      type: "blocked",
    }));

    return [...booked, ...blocked].sort(
      (a, b) => a.start.getTime() - b.start.getTime()
    );
  }

  async createBlock(
    resourceId: string,
    start: Date,
    end: Date
  ): Promise<CalEvent> {
    const mod = await import("@flexslot/db").catch(() => null);
    const prisma: any = (mod as any)?.prisma;

    if (!prisma) {
      return {
        id: "demo-block",
        start,
        end,
        title: "Blocked",
        type: "blocked",
      };
    }

    // Overlap check
    const overlap = await prisma.slot.findFirst({
      where: {
        resourceId,
        startsAt: { lt: end },
        endsAt: { gt: start },
      },
      select: { id: true },
    });
    if (overlap) {
      throw Object.assign(
        new Error("Time overlaps an existing slot/reservation/block"),
        { code: "OVERLAP" }
      );
    }

    const slot = await prisma.slot.create({
      data: { resourceId, startsAt: start, endsAt: end, status: "BLOCKED" },
    });

    return { id: slot.id, start, end, title: "Blocked", type: "blocked" };
  }

  async deleteBlock(resourceId: string, slotId: string): Promise<void> {
    const mod = await import("@flexslot/db").catch(() => null);
    const prisma: any = (mod as any)?.prisma;
    if (!prisma) return;

    const slot = await prisma.slot.findFirst({
      where: { id: slotId, resourceId, status: "BLOCKED" },
      select: { id: true },
    });
    if (!slot)
      throw Object.assign(new Error("Not found"), { code: "NOT_FOUND" });

    await prisma.slot.delete({ where: { id: slotId } });
  }
}
