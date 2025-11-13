import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function ensureResourceByName(name: string, capacity = 1) {
  const existing = await prisma.resource.findFirst({ where: { name } });
  if (existing) return existing;
  return prisma.resource.create({ data: { name, capacity } });
}

function* generateWindowsForDay(day: Date, startHour = 9, endHour = 20, slotMinutes = 60) {
  const start = new Date(day);
  start.setHours(startHour, 0, 0, 0);
  const end = new Date(day);
  end.setHours(endHour, 0, 0, 0);

  for (let t = new Date(start); t < end; ) {
    const next = new Date(t.getTime() + slotMinutes * 60_000);
    yield { startsAt: new Date(t), endsAt: next };
    t = next;
  }
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

async function seed() {
  console.log("🌱 Seeding Flexslot demo data...");

  // Demo user
  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: { name: "Demo User" },
    create: { email: "demo@example.com", name: "Demo User" },
  });

  // Resources
  const r1 = await ensureResourceByName("HomeCharger-1", 1);
  const r2 = await ensureResourceByName("HomeCharger-2", 1);

  const today = startOfDay(new Date());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  // Create slots for today & tomorrow
  const windows: Array<{ resourceId: string; startsAt: Date; endsAt: Date }> = [];
  for (const res of [r1, r2]) {
    for (const w of generateWindowsForDay(today, 9, 20, 60)) {
      windows.push({ resourceId: res.id, startsAt: w.startsAt, endsAt: w.endsAt });
    }
    for (const w of generateWindowsForDay(tomorrow, 9, 20, 60)) {
      windows.push({ resourceId: res.id, startsAt: w.startsAt, endsAt: w.endsAt });
    }
  }

  if (windows.length) {
    await prisma.slot.createMany({ data: windows, skipDuplicates: true });
  }

  // One confirmed reservation on the next available slot for r1
  const nextForR1 = await prisma.slot.findFirst({
    where: { resourceId: r1.id, startsAt: { gt: new Date() } },
    orderBy: { startsAt: "asc" },
  });

  if (nextForR1) {
    await prisma.$transaction(async (tx) => {
      await tx.slot.update({ where: { id: nextForR1.id }, data: { status: "RESERVED" } });

      await tx.reservation.upsert({
        where: { slotId: nextForR1.id },
        update: {
          status: "CONFIRMED",
          confirmedAt: new Date(),
          resourceId: r1.id,
          userId: user.id,
        },
        create: {
          slotId: nextForR1.id,
          resourceId: r1.id,
          userId: user.id,
          status: "CONFIRMED",
          confirmedAt: new Date(),
        },
      });
    });
  }

  // One active hold on the following slot for r1
  const heldTarget = await prisma.slot.findFirst({
    where: {
      resourceId: r1.id,
      startsAt: { gt: nextForR1 ? nextForR1.startsAt : new Date() },
      status: "AVAILABLE",
    },
    orderBy: { startsAt: "asc" },
  });

  if (heldTarget) {
    await prisma.$transaction(async (tx) => {
      const existingActiveHold = await tx.hold.findFirst({
        where: { slotId: heldTarget.id, status: "ACTIVE" },
      });

      if (existingActiveHold) {
        await tx.hold.update({
          where: { id: existingActiveHold.id },
          data: { expiresAt: new Date(Date.now() + 15 * 60_000) },
        });
      } else {
        await tx.hold.create({
          data: {
            slotId: heldTarget.id,
            userId: user.id,
            status: "ACTIVE",
            token: randomUUID(),
            expiresAt: new Date(Date.now() + 15 * 60_000),
          },
        });
      }

      await tx.slot.update({ where: { id: heldTarget.id }, data: { status: "HELD" } });
    });
  }

  const counts = {
    users: await prisma.user.count(),
    resources: await prisma.resource.count(),
    slots: await prisma.slot.count(),
    holds: await prisma.hold.count(),
    reservations: await prisma.reservation.count(),
  };
  console.log("✅ Seed complete:", counts);
}

seed()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
