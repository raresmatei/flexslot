import SlotsView from "../../../components/slots/SlotsView";

export default async function ProviderPage({
  params,
}: {
  params: Promise<{ providerId: string }>;
}) {
  const { providerId } = await params;

  return (
    <main className="container-resp py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Provider</h1>
      </div>
      <SlotsView providerId={providerId} />
    </main>
  );
}
