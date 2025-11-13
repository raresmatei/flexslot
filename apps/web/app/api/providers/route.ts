import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Dynamically import prisma to avoid build-time issues if the package isn't ready
    const mod = await import("@flexslot/db").catch(() => null);
    const prisma: any = (mod as any)?.prisma;

    if (prisma) {
      const resources = await prisma.resource.findMany({
        select: {
          id: true,
          name: true,
          location: true,
          capacity: true,
          updatedAt: true,
        },
        orderBy: { name: "asc" },
      });

      // Map Resource -> Provider-like shape
      const providers = resources.map((r: any) => ({
        id: r.id,
        name: r.name,
        description: r.location
          ? `${r.location} • cap ${r.capacity}`
          : `Capacity ${r.capacity}`,
        avatarUrl: null as string | null,
      }));
      return NextResponse.json(providers);
    }
  } catch {
    // ignore and fall through to mock
  }

  // Dev fallback so the UI isn't empty before DB wiring
  return NextResponse.json([
    {
      id: "demo-res-1",
      name: "Demo Resource A",
      description: "Center • cap 2",
      avatarUrl: null,
    },
    {
      id: "demo-res-2",
      name: "Demo Resource B",
      description: "North • cap 1",
      avatarUrl: null,
    },
  ]);
}
