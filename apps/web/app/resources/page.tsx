import { prisma } from "@/lib/db";
import Link from "next/link";
import { CalendarDays } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ResourcesPage() {
  const resources = await prisma.resource.findMany({
    select: { id: true, name: true, capacity: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Providers</h1>
          <p className="text-sm text-gray-500">
            Pick a provider to see all its slots.
          </p>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {resources.map((r) => (
          <article
            key={r.id}
            className="rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md transition"
          >
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-medium">{r.name}</h2>
                <p className="text-xs text-gray-500">
                  id: <code className="text-[11px]">{r.id}</code>
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-[11px] text-gray-700">
                <CalendarDays className="size-3.5" /> cap {r.capacity}
              </span>
            </div>

            <Link
              href={`/resources/${r.id}`}
              className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
            >
              View slots
            </Link>
          </article>
        ))}
        {resources.length === 0 && (
          <div className="col-span-full rounded-2xl border p-12 text-center text-gray-500">
            No providers yet.
          </div>
        )}
      </section>
    </main>
  );
}
