export type ProviderEventPayload = {
  uid: string;
  start: string;
  end: string;
  summary: string;
  description?: string;
  transparency?: "OPAQUE" | "TRANSPARENT";
  status?: "CONFIRMED" | "TENTATIVE";
};

const base = process.env.MOCK_PROVIDER_URL!;
const token = process.env.MOCK_PROVIDER_TOKEN!;

export async function mockCreateEvent(
  calendarId: string,
  payload: ProviderEventPayload
) {
  const res = await fetch(`${base}/calendars/${calendarId}/events`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`mockCreateEvent failed ${res.status}`);
  return res.json() as Promise<{ id: string; etag: string }>;
}

export async function mockUpdateEvent(
  calendarId: string,
  id: string,
  patch: Partial<ProviderEventPayload>
) {
  const res = await fetch(`${base}/calendars/${calendarId}/events/${id}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`mockUpdateEvent failed ${res.status}`);
  return res.json() as Promise<{ id: string; etag: string }>;
}

export async function mockDeleteEvent(calendarId: string, id: string) {
  const res = await fetch(`${base}/calendars/${calendarId}/events/${id}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`mockDeleteEvent failed ${res.status}`);
}
