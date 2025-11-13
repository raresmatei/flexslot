"use client";
import * as React from "react";

type Reservation = {
  id: string;
  start: string; // ISO
  end: string; // ISO
  status: "CONFIRMED" | "PENDING" | "CANCELED";
  resourceId: string;
  resourceName: string;
  location?: string | null;
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
function timeRange(startIso: string, endIso: string) {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const fmt = (d: Date) =>
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return `${fmt(s)} – ${fmt(e)}`;
}
function StatusChip({ status }: { status: Reservation["status"] }) {
  const cls =
    status === "CONFIRMED"
      ? "bg-emerald-600/20 ring-emerald-600/40 text-emerald-300"
      : status === "PENDING"
        ? "bg-amber-600/20 ring-amber-600/40 text-amber-300"
        : "bg-neutral-600/20 ring-neutral-600/40 text-neutral-300";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] ring-1 ${cls}`}>
      {status.toLowerCase()}
    </span>
  );
}

export default function MyBookingsPage() {
  const [tab, setTab] = React.useState<"calendar" | "list">("calendar");
  const [month, setMonth] = React.useState(() => {
    const n = new Date();
    return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1));
  });
  const [items, setItems] = React.useState<Reservation[] | null>(null);

  // touch detection -> bottom sheet on touch, popover on desktop
  const [isTouch, setIsTouch] = React.useState(false);
  React.useEffect(() => {
    setIsTouch(
      typeof window !== "undefined" &&
        ("ontouchstart" in window || navigator.maxTouchPoints > 0)
    );
  }, []);

  React.useEffect(() => {
    fetch("/api/me/reservations")
      .then((r) => (r.ok ? r.json() : []))
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  const days = rangeDays(month);
  const byDay = React.useMemo(() => {
    const m = new Map<string, Reservation[]>();
    (items ?? []).forEach((it) => {
      const k = dayKey(new Date(it.start));
      const arr = m.get(k) ?? [];
      arr.push(it);
      m.set(k, arr);
    });
    for (const [k, arr] of m) {
      arr.sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
      );
      m.set(k, arr);
    }
    return m;
  }, [items]);

  // ---------- Desktop popover anchored to hovered cell ----------
  const gridRef = React.useRef<HTMLDivElement>(null);
  const [pop, setPop] = React.useState<{
    open: boolean;
    key: string | null;
    x: number;
    y: number;
    placement: "above" | "below";
  }>({ open: false, key: null, x: 0, y: 0, placement: "below" });

  function showPopover(dayKeyStr: string, targetEl: HTMLElement) {
    if (isTouch) return; // touch uses bottom sheet
    const grid = gridRef.current;
    if (!grid) return;
    const gridRect = grid.getBoundingClientRect();
    const rect = targetEl.getBoundingClientRect();

    // Choose placement that keeps the popover on screen
    const preferred =
      rect.bottom + 180 > window.innerHeight
        ? ("above" as const)
        : ("below" as const);

    // Anchor left to the cell, clamp within grid (maxWidth ~ 320)
    const MAX = 320;
    let x = rect.left - gridRect.left;
    x = Math.min(Math.max(8, x), gridRect.width - MAX - 8);

    const y =
      preferred === "below"
        ? rect.bottom - gridRect.top
        : rect.top - gridRect.top;

    setPop({ open: true, key: dayKeyStr, x, y, placement: preferred });
  }
  function hidePopover() {
    setPop((p) => ({ ...p, open: false, key: null }));
  }

  // ---------- Mobile bottom sheet ----------
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [sheetDayKey, setSheetDayKey] = React.useState<string | null>(null);
  function openDayMobile(key: string) {
    setSheetDayKey(key);
    setSheetOpen(true);
  }

  const monthName = month.toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <main className="container-resp py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">My bookings</h1>
        <div className="flex items-center gap-2">
          <button
            className={`btn ${tab === "calendar" ? "btn-primary" : ""}`}
            onClick={() => setTab("calendar")}
          >
            Calendar
          </button>
          <button
            className={`btn ${tab === "list" ? "btn-primary" : ""}`}
            onClick={() => setTab("list")}
          >
            List
          </button>
        </div>
      </div>

      {items === null ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="card h-24 animate-pulse bg-neutral-900/50"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card p-6">
          <p className="text-sm text-neutral-300">You have no bookings yet.</p>
          <a href="/providers" className="btn btn-ghost mt-3">
            Browse providers
          </a>
        </div>
      ) : tab === "calendar" ? (
        <>
          {/* Month header */}
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm text-neutral-400">{monthName}</h2>
            <div className="flex items-center gap-2">
              <button
                className="btn"
                onClick={() =>
                  setMonth(
                    (p) =>
                      new Date(
                        Date.UTC(p.getUTCFullYear(), p.getUTCMonth() - 1, 1)
                      )
                  )
                }
              >
                Prev
              </button>
              <button
                className="btn"
                onClick={() =>
                  setMonth(
                    (p) =>
                      new Date(
                        Date.UTC(p.getUTCFullYear(), p.getUTCMonth() + 1, 1)
                      )
                  )
                }
              >
                Next
              </button>
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

          {/* Month grid + popover layer */}
          <div
            ref={gridRef}
            className="relative grid grid-cols-7 gap-1"
            onMouseLeave={hidePopover}
          >
            {days.map((d, i) => {
              const k = dayKey(d);
              const inMonth = d.getUTCMonth() === month.getUTCMonth();
              const list = byDay.get(k) ?? [];
              const visible = list.slice(0, 2); // show up to 2 tiny pills
              const extra = list.length - visible.length;

              return (
                <div
                  key={i}
                  className={`card h-28 p-2 ${inMonth ? "" : "opacity-50"}`}
                  onMouseEnter={(e) =>
                    showPopover(k, e.currentTarget as HTMLElement)
                  }
                  onClick={() => (isTouch ? openDayMobile(k) : null)}
                >
                  <div className="mb-1 text-[11px] text-neutral-400">
                    {d.getUTCDate()}
                  </div>
                  <div className="space-y-1">
                    {visible.map((ev) => (
                      <div
                        key={ev.id}
                        className="truncate rounded-md px-2 py-1 text-[10px] leading-tight ring-1 bg-sky-600/15 ring-sky-600/40"
                        title={`${ev.resourceName}${ev.location ? ` · ${ev.location}` : ""} · ${timeRange(ev.start, ev.end)} · ${ev.status.toLowerCase()}`}
                      >
                        <div className="truncate">
                          {ev.resourceName}
                          {ev.location ? ` · ${ev.location}` : ""}
                        </div>
                        <div className="text-[9px] text-neutral-300">
                          {timeRange(ev.start, ev.end)}
                        </div>
                      </div>
                    ))}
                    {extra > 0 && (
                      <div className="text-[10px] text-neutral-300">
                        +{extra} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Floating popover (desktop only) */}
            {!isTouch && pop.open && pop.key && (
              <div
                role="dialog"
                aria-label="Day bookings"
                className={`absolute z-20 max-w-[320px] rounded-xl border border-neutral-800 bg-neutral-950 p-3 shadow-xl`}
                style={{
                  left: pop.x,
                  top: pop.placement === "below" ? pop.y + 8 : pop.y - 8,
                  transform: `translateY(${pop.placement === "below" ? "0" : "-100%"})`,
                }}
                onMouseLeave={hidePopover}
              >
                {/* Arrow */}
                <div
                  className={`absolute h-2 w-2 rotate-45 border border-neutral-800 bg-neutral-950`}
                  style={{
                    left: 16,
                    top: pop.placement === "below" ? -5 : "auto",
                    bottom: pop.placement === "above" ? -5 : "auto",
                    borderTopColor: "transparent",
                    borderLeftColor: "transparent",
                  }}
                />
                {/* Content */}
                <div className="mb-2 text-sm text-neutral-400">
                  {new Date(pop.key + "T00:00:00Z").toLocaleDateString(
                    undefined,
                    {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    }
                  )}
                </div>
                <div className="grid gap-2">
                  {(byDay.get(pop.key) ?? []).map((ev) => (
                    <article
                      key={ev.id}
                      className="rounded-lg bg-sky-600/10 px-3 py-2 ring-1 ring-sky-600/30"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[13px] font-medium">
                            {ev.resourceName}
                            {ev.location ? ` · ${ev.location}` : ""}
                          </div>
                          <div className="text-[12px] text-neutral-300">
                            {timeRange(ev.start, ev.end)}
                          </div>
                        </div>
                        <StatusChip status={ev.status} />
                      </div>
                    </article>
                  ))}
                  {(byDay.get(pop.key) ?? []).length === 0 && (
                    <div className="text-sm text-neutral-400">
                      No bookings on this day.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mobile bottom sheet */}
          <>
            <div
              className={`fixed inset-0 z-40 bg-black/50 transition-opacity ${sheetOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
              onClick={() => setSheetOpen(false)}
            />
            <aside
              className={`fixed bottom-0 left-0 right-0 z-50 w-full transform bg-neutral-950 p-6 ring-1 ring-neutral-800 transition ${sheetOpen ? "translate-y-0" : "translate-y-full"}`}
              role="dialog"
              aria-modal="true"
              aria-label="Day bookings"
            >
              <div className="container-resp">
                <div className="flex items-start justify-between">
                  <h2 className="text-lg font-semibold">
                    {sheetDayKey
                      ? new Date(sheetDayKey + "T00:00:00Z").toLocaleDateString(
                          undefined,
                          {
                            weekday: "long",
                            month: "short",
                            day: "numeric",
                          }
                        )
                      : "Bookings"}
                  </h2>
                  <button
                    className="btn btn-ghost"
                    onClick={() => setSheetOpen(false)}
                  >
                    Close
                  </button>
                </div>
                <div className="mt-4 grid gap-2">
                  {(sheetDayKey ? (byDay.get(sheetDayKey) ?? []) : []).map(
                    (ev) => (
                      <article key={ev.id} className="card p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-medium">
                              {ev.resourceName}
                              {ev.location ? ` · ${ev.location}` : ""}
                            </div>
                            <div className="text-xs text-neutral-300">
                              {timeRange(ev.start, ev.end)}
                            </div>
                          </div>
                          <StatusChip status={ev.status} />
                        </div>
                      </article>
                    )
                  )}
                  {sheetDayKey &&
                    (byDay.get(sheetDayKey) ?? []).length === 0 && (
                      <div className="text-sm text-neutral-400">
                        No bookings on this day.
                      </div>
                    )}
                </div>
              </div>
            </aside>
          </>
        </>
      ) : (
        // List view
        <div className="grid gap-3">
          {items.map((ev) => {
            const d = new Date(ev.start);
            const dateStr = d.toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            });
            const timeStr = timeRange(ev.start, ev.end);
            return (
              <article key={ev.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-neutral-400">{dateStr}</div>
                    <div className="mt-0.5 font-medium">
                      {ev.resourceName}
                      {ev.location ? ` · ${ev.location}` : ""}
                    </div>
                    <div className="text-sm text-neutral-300">{timeStr}</div>
                  </div>
                  <StatusChip status={ev.status} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
