import { Queue, Worker } from "bullmq";
import Redis from "ioredis";
import { prisma } from "@flexslot/db";

const connection = new Redis(process.env.REDIS_URL!);
export const reminders = new Queue("reminders", { connection });

// Example worker: clean expired holds from DB
new Worker(
  "cleanup",
  async () => {
    await prisma.hold.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  },
  { connection }
);

console.log("Worker running.");
