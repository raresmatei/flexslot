"use client";
import * as React from "react";

type Event = {
  id: string;
  start: string;
  end: string;
  title: string;
  type: "booked" | "blocked";
};

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}
function rangeDays(monthDate: Date) {
  const first = new Date(
    Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth(), 1)
  );
  const start = new Date(first);
  const day = (first.getUTCDay() + 6) % 7; // Monday=0
  start.setUTCDate(first.getUTCDate() - day);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    days.push(d);
  }
  return days;
}

export default function ProviderCalendarPage({
  params,
}: {
  params: { providerId: string };
}) {
  const resourceId = params.providerId;
  const [month, setMonth] = React.useState(() => {
    const n = new Date();
    return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1));
  });
  const [events, setEvents] = React.useState<Event[] | null>(null);

  // Bottom sheet state
  const [open, setOpen] = React.useState(false);
  const [start, setStart] = React.useState<string>(""); // datetime-local
  const [end, setEnd] = React.useState<string>("");
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceId]);

  function refresh() {
    setEvents(null);
    fetch(`/api/providers/${resourceId}/calendar`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setEvents)
      .catch(() => setEvents([]));
  }

  const days = rangeDays(month);
  const eventsByDay = React.useMemo(() => {
    const m = new Map<string, Event[]>();
    (events ?? []).forEach((ev) => {
      const k = dayKey(new Date(ev.start));
      const arr = m.get(k) ?? [];
      arr.push(ev);
      m.set(k, arr);
    });
    return m;
  }, [events]);

  function nav(offset: number) {
    setMonth(
      (prev) =>
        new Date(
          Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth() + offset, 1)
        )
    );
  }

  async function createBlock() {
    setErr(null);
    if (!start || !end) {
      setErr("Pick start and end");
      return;
    }
    const s = new Date(start);
    const e = new Date(end);
    if (
      !(s instanceof Date) ||
      isNaN(+s) ||
      !(e instanceof Date) ||
      isNaN(+e) ||
      e <= s
    ) {
      setErr("Invalid range");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/providers/${resourceId}/blocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start: s.toISOString(), end: e.toISOString() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j?.message || "Failed to create block");
        return;
      }
      setOpen(false);
      setStart("");
      setEnd("");
      refresh();
    } finally {
      setBusy(false);
    }
  }

  async function deleteBlock(slotId: string) {
    if (!confirm("Remove this block?")) return;
    const res = await fetch(`/api/providers/${resourceId}/blocks/${slotId}`, {
      method: "DELETE",
    });
    if (res.ok) refresh();
  }

  const monthName = month.toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <main className="container-resp py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Calendar · {monthName}</h1>
        <div className="flex items-center gap-2">
          <button className="btn" onClick={() => setOpen(true)}>
            New block
          </button>
          <button className="btn" onClick={() => nav(-1)}>
            Prev
          </button>
          <button className="btn" onClick={() => nav(1)}>
            Next
          </button>
          <a className="btn btn-primary" href={`/providers/${resourceId}`}>
            Back to slots
          </a>
        </div>
      </div>

      {/* Week headers */}
      <div className="mb-1 grid grid-cols-7 text-xs text-neutral-400">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="px-2 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Month grid */}
      {events === null ? (
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 42 }).map((_, i) => (
            <div
              key={i}
              className="card h-24 animate-pulse bg-neutral-900/50"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {days.map((d, i) => {
            const inMonth = d.getUTCMonth() === month.getUTCMonth();
            const k = dayKey(d);
            const list = eventsByDay.get(k) ?? [];
            return (
              <div
                key={i}
                className={`card h-28 p-2 ${inMonth ? "" : "opacity-50"}`}
              >
                <div className="text-[11px] text-neutral-400">
                  {d.getUTCDate()}
                </div>
                <div className="mt-1 space-y-1">
                  {list.map((ev) => (
                    <div
                      key={ev.id}
                      className={`rounded-md px-2 py-1 text-[11px] leading-tight ring-1 ${
                        ev.type === "booked"
                          ? "bg-emerald-600/20 ring-emerald-600/40"
                          : "bg-rose-600/20 ring-rose-600/40 cursor-pointer"
                      }`}
                      title={
                        ev.type === "blocked" ? "Click to remove block" : ""
                      }
                      onClick={() =>
                        ev.type === "blocked" && deleteBlock(ev.id)
                      }
                    >
                      <div className="truncate">
                        {ev.title}
                        {ev.type === "blocked" ? " (blocked)" : ""}
                      </div>
                      <div className="text-[10px] text-neutral-300">
                        {new Date(ev.start).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" – "}
                        {new Date(ev.end).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom sheet (new block) */}
      <>
        <div
          className={`fixed inset-0 z-40 bg-black/50 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
          onClick={() => setOpen(false)}
        />
        <aside
          className={`fixed bottom-0 left-0 right-0 z-50 w-full transform bg-neutral-950 p-6 ring-1 ring-neutral-800 transition ${open ? "translate-y-0" : "translate-y-full"}`}
          role="dialog"
          aria-modal="true"
          aria-label="New block"
        >
          <div className="container-resp">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold">Create a block</h2>
              <button className="btn btn-ghost" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            <div className="mt-4 grid max-w-md gap-3">
              <label className="label">Start</label>
              <input
                className="input"
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
              <label className="label">End</label>
              <input
                className="input"
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
              {err ? (
                <p className="mt-1 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-red-500/30">
                  {err}
                </p>
              ) : null}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary disabled:opacity-50"
                disabled={busy}
                onClick={createBlock}
              >
                {busy ? "Creating…" : "Create block"}
              </button>
            </div>
          </div>
        </aside>
      </>
    </main>
  );
}
