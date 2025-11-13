import Fastify from "fastify";
import ical from "ical-generator";
import { randomUUID } from "crypto";

const PORT = Number(process.env.PORT ?? 4001);
const TOKEN = process.env.MOCK_PROVIDER_TOKEN ?? "dev-mock-secret";
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

// in-memory storage (per calendarId)
type Event = {
  id: string;
  calendarId: string;
  uid: string;
  start: string; // ISO
  end: string; // ISO
  summary: string;
  description?: string;
  transparency?: "OPAQUE" | "TRANSPARENT";
  status?: "CONFIRMED" | "TENTATIVE" | "CANCELLED";
  etag: string;
  createdAt: string;
  updatedAt: string;
};

type Subscription = {
  id: string;
  calendarId: string;
  callbackUrl: string;
  secret?: string;
};

const events = new Map<string, Event[]>(); // key: calendarId
const subscriptions = new Map<string, Subscription[]>(); // key: calendarId

function auth(req: any, reply: any) {
  const header = req.headers["authorization"] as string | undefined;
  if (!header || !header.startsWith("Bearer ")) {
    reply.code(401).send({ error: "NO_TOKEN" });
    return false;
  }
  const token = header.slice("Bearer ".length);
  if (token !== TOKEN) {
    reply.code(403).send({ error: "BAD_TOKEN" });
    return false;
  }
  return true;
}

async function notify(
  calendarId: string,
  changeType: "created" | "updated" | "deleted",
  ev: Event
) {
  const subs = subscriptions.get(calendarId) ?? [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        await fetch(s.callbackUrl, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-mock-secret": s.secret ?? "",
          },
          body: JSON.stringify({
            subscriptionId: s.id,
            calendarId,
            changeType,
            event: ev,
          }),
        });
      } catch (e) {
        console.error("Webhook notify failed:", e);
      }
    })
  );
}

const app = Fastify();

app.get("/", async () => ({ ok: true, provider: "mock" }));

// Create subscription: {calendarId, callbackUrl, secret?}
app.post("/subscriptions", async (req, reply) => {
  const body = req.body as any;
  if (!body?.calendarId || !body?.callbackUrl) {
    return reply.code(400).send({ error: "calendarId & callbackUrl required" });
  }
  const sub: Subscription = {
    id: randomUUID(),
    calendarId: body.calendarId,
    callbackUrl: body.callbackUrl,
    secret: body.secret,
  };
  const arr = subscriptions.get(sub.calendarId) ?? [];
  arr.push(sub);
  subscriptions.set(sub.calendarId, arr);
  return { subscriptionId: sub.id };
});

// List events ?timeMin=&timeMax=
app.get("/calendars/:calendarId/events", async (req, reply) => {
  const { calendarId } = req.params as any;
  const list = events.get(calendarId) ?? [];
  const url = new URL(req.url, `http://x`);
  const min = url.searchParams.get("timeMin");
  const max = url.searchParams.get("timeMax");
  let out = list;
  if (min || max) {
    const gte = min ? new Date(min).getTime() : -Infinity;
    const lte = max ? new Date(max).getTime() : Infinity;
    out = list.filter(
      (e) =>
        new Date(e.start).getTime() >= gte && new Date(e.end).getTime() <= lte
    );
  }
  return { items: out };
});

// Create event
app.post("/calendars/:calendarId/events", async (req, reply) => {
  if (!auth(req, reply)) return;
  const { calendarId } = req.params as any;
  const body = req.body as Partial<Event>;
  const now = new Date().toISOString();
  const ev: Event = {
    id: randomUUID(),
    calendarId,
    uid: body?.uid ?? `flexslot:${calendarId}:${randomUUID()}`,
    start: body?.start!,
    end: body?.end!,
    summary: body?.summary ?? "Flexslot",
    description: body?.description ?? "",
    transparency: body?.transparency ?? "OPAQUE",
    status: body?.status ?? "CONFIRMED",
    etag: randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  const list = events.get(calendarId) ?? [];
  list.push(ev);
  events.set(calendarId, list);
  await notify(calendarId, "created", ev);
  return { id: ev.id, etag: ev.etag };
});

// Update event
app.patch("/calendars/:calendarId/events/:id", async (req, reply) => {
  if (!auth(req, reply)) return;
  const { calendarId, id } = req.params as any;
  const body = req.body as Partial<Event>;
  const list = events.get(calendarId) ?? [];
  const idx = list.findIndex((e) => e.id === id);
  if (idx < 0) return reply.code(404).send({ error: "NOT_FOUND" });
  const now = new Date().toISOString();
  const updated: Event = {
    ...list[idx],
    ...body,
    updatedAt: now,
    etag: randomUUID(),
  };
  list[idx] = updated;
  events.set(calendarId, list);
  await notify(calendarId, "updated", updated);
  return { id: updated.id, etag: updated.etag };
});

// Delete event
app.delete("/calendars/:calendarId/events/:id", async (req, reply) => {
  if (!auth(req, reply)) return;
  const { calendarId, id } = req.params as any;
  const list = events.get(calendarId) ?? [];
  const idx = list.findIndex((e) => e.id === id);
  if (idx < 0) return reply.code(404).send({ error: "NOT_FOUND" });
  const ev = list[idx];
  list.splice(idx, 1);
  events.set(calendarId, list);
  await notify(calendarId, "deleted", ev);
  return { ok: true };
});

// ICS feed
app.get("/calendars/:calendarId.ics", async (req, reply) => {
  const { calendarId } = req.params as any;
  const list = events.get(calendarId) ?? [];
  const cal = ical({ name: `Mock – ${calendarId}`, timezone: "UTC" });
  list.forEach((e) => {
    cal.createEvent({
      id: e.uid,
      start: new Date(e.start),
      end: new Date(e.end),
      summary: e.summary,
      description: e.description,
      transparency: e.transparency === "OPAQUE" ? "OPAQUE" : "TRANSPARENT",
      status: e.status === "CONFIRMED" ? "CONFIRMED" : "TENTATIVE",
    });
  });
  reply.header("content-type", "text/calendar; charset=utf-8");
  reply.send(cal.toString());
});

app.listen({ port: PORT, host: "0.0.0.0" }).then(() => {
  console.log(`Mock Provider running on http://localhost:${PORT}`);
  console.log(
    `Sub example: POST ${BASE_URL}/api/sync/mock will receive webhooks`
  );
});
