export type Slot = {
  id: string;
  providerId: string; // equals resourceId (kept for compatibility with UI)
  resourceId?: string | null;
  start: string; // ISO (from Slot.startsAt)
  end: string; // ISO (from Slot.endsAt)
  price?: number | null;
  location?: string | null;
  capacity?: number | null;
  tags?: string[] | null;
};

export type Provider = {
  id: string;
  name: string;
  description?: string | null;
  avatarUrl?: string | null;
};

export async function getProviders(): Promise<Provider[]> {
  const res = await fetch("/api/providers", { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export async function getSlots(resourceId: string) {
  const res = await fetch(`/api/providers/${resourceId}/slots`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to fetch slots: ${res.status}`);
  const data = (await res.json()) as Slot[];
  return data.sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );
}

export async function bookSlot(payload: {
  slotId: string;
  resourceId: string;
  userEmail: string;
}) {
  const res = await fetch(`/api/book`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const code =
      (body as any)?.code || (body as any)?.error || `HTTP_${res.status}`;
    const message =
      (body as any)?.message || res.statusText || "Booking failed";
    const err = new Error(message) as Error & { code?: string };
    err.code = code;
    throw err;
  }
  return res.json();
}
