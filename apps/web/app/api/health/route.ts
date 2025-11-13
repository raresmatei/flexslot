import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";

export async function GET() {
  const health = { db: "down" , redis: "down"  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    health.db = "up";
  } catch {}

  try {
    if ("ping" in redis && typeof (redis as any).ping === "function") {
      await (redis as any).ping();
    } else {
      // fallback: set/get
      await (redis as any).set?.("flexslot:health", "ok", { EX: 5 });
      await (redis as any).get?.("flexslot:health");
    }
    health.redis = "up";
  } catch {}

  return Response.json(health);
}
