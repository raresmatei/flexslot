export async function POST(req: Request) {
  const { resourceId } = await req.json().catch(() => ({}));
  if (!resourceId)
    return Response.json({ error: "resourceId required" }, { status: 400 });

  const base = process.env.MOCK_PROVIDER_URL!;
  const secret = process.env.MOCK_PROVIDER_TOKEN!;
  const callback = `${process.env.BASE_URL}/api/sync/mock`;

  const res = await fetch(`${base}/subscriptions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      calendarId: resourceId,
      callbackUrl: callback,
      secret,
    }),
  });

  const j = await res.json().catch(() => ({}));
  if (!res.ok)
    return Response.json(
      { error: j?.error || "subscribe failed" },
      { status: 500 }
    );
  return Response.json(j);
}
