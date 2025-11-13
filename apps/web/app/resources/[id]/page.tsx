import { prisma } from "@/lib/db";
import SlotsView from "@/components/SlotsView";

export default async function ResourceDetail({
  params,
}: {
  params: { id: string };
}) {
  const resource = await prisma.resource.findUnique({
    where: { id: params.id },
  });
  if (!resource) return <main className="p-8">Resource not found.</main>;

  return (
    <main className="mx-auto max-w-7xl p-6 space-y-6">
      <header className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">
          {resource.name}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          id: <code className="text-[11px]">{resource.id}</code> · capacity:{" "}
          {resource.capacity}
        </p>
      </header>

      <SlotsView resourceId={resource.id} resourceName={resource.name} />
    </main>
  );
}
