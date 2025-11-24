import SlotsView from "../../../components/slots/SlotsView";

export default async function ProviderPage({
  params,
}: {
  params: { providerId: string };
}) {
  const id = await params.providerId;
  return (
    <main className="container-resp py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Provider</h1>
        <div className="flex items-center gap-2">
          <a className="btn" href={`/providers/${id}/calendar`}>
            Calendar
          </a>
        </div>
      </div>
      <SlotsView providerId={id} />
    </main>
  );
}
