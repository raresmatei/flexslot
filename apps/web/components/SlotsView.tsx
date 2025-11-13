"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Filter,
  Link as LinkIcon,
  Lock,
  RefreshCw,
  Webhook,
  Check,
  Clock,
} from "lucide-react";
import clsx from "clsx";
import { format } from "date-fns";

type Hold = {
  status: "ACTIVE" | "EXPIRED" | "CONVERTED" | "CANCELED";
  expiresAt: string;
};
type Slot = {
  id: string;
  resourceId: string;
  startsAt: string;
  endsAt: string;
  status: "AVAILABLE" | "HELD" | "RESERVED" | "BLOCKED";
  holds: Hold[];
  reservations: any[];
};

function isActiveHold(h: Hold) {
  return h.status === "ACTIVE" && new Date(h.expiresAt).getTime() > Date.now();
}
function isBookable(s: Slot) {
  const active = s.holds?.some(isActiveHold);
  return (
    s.status === "AVAILABLE" && !active && (s.reservations?.length ?? 0) === 0
  );
}
const STATUS_COLORS: Record<Slot["status"], string> = {
  AVAILABLE: "bg-green-50 text-green-700 ring-green-200",
  HELD: "bg-yellow-50 text-yellow-700 ring-yellow-200",
  RESERVED: "bg-red-50 text-red-700 ring-red-200",
  BLOCKED: "bg-gray-100 text-gray-700 ring-gray-200",
};

export default function SlotsView({
  resourceId,
  resourceName,
}: {
  resourceId: string;
  resourceName: string;
}) {
  const router = useRouter();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  // Filters (all OFF by default → unfiltered)
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [onlyAvailable, setOnlyAvailable] = useState(false); // start false
  const [statuses, setStatuses] = useState<Set<Slot["status"]>>(
    new Set(["AVAILABLE", "HELD", "RESERVED", "BLOCKED"]) // all selected by default
  );
  const [timeStart, setTimeStart] = useState<string>("00:00");
  const [timeEnd, setTimeEnd] = useState<string>("23:59");

  const mockBase =
    process.env.NEXT_PUBLIC_MOCK_PROVIDER_URL ?? "http://localhost:4001";
  const icsUrl = `${mockBase}/calendars/${resourceId}.ics`;

  // Load ALL slots initially
  const refresh = () =>
    startTransition(async () => {
      const res = await fetch(
        `/api/slots/all?resourceId=${resourceId}&limit=5000`,
        { cache: "no-store" }
      );
      const j = await res.json();
      setSlots(j.slots ?? []);
    });

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceId]);

  function toggleStatus(s: Slot["status"]) {
    const next = new Set(statuses);
    next.has(s) ? next.delete(s) : next.add(s);
    setStatuses(next);
  }

  // Derived / filtered (client-side for PoC)
  const filtered = useMemo(() => {
    const [hStart, mStart] = timeStart.split(":").map(Number);
    const [hEnd, mEnd] = timeEnd.split(":").map(Number);
    const minMinutes = hStart * 60 + mStart;
    const maxMinutes = hEnd * 60 + mEnd;

    return slots.filter((s) => {
      if (!statuses.has(s.status)) return false;
      if (onlyAvailable && !isBookable(s)) return false;

      const d = new Date(s.startsAt);
      const mins = d.getHours() * 60 + d.getMinutes();
      if (mins < minMinutes || mins > maxMinutes) return false;

      return true;
    });
  }, [slots, statuses, onlyAvailable, timeStart, timeEnd]);

  // Group by day
  const grouped = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of filtered) {
      const key = new Date(s.startsAt).toISOString().slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
      map.set(k, arr);
    }
    return [...map.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
  }, [filtered]);

  async function subscribeWebhook() {
    setBusy("subscribe");
    try {
      const res = await fetch("/api/sync/mock/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ resourceId }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "subscribe failed");
      alert(`Subscribed. id=${j.subscriptionId}`);
    } catch (e: any) {
      alert(`Subscribe error: ${e.message}`);
    } finally {
      setBusy(null);
    }
  }

  async function hold(slotId: string) {
    setBusy(slotId);
    try {
      const res = await fetch("/api/hold", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slotId, ttlSeconds: 15 * 60 }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "hold failed");
      alert(`Held until ${j.expiresAt}`);
      router.refresh();
      refresh();
    } catch (e: any) {
      alert(`Hold error: ${e.message}`);
    } finally {
      setBusy(null);
    }
  }

  async function book(slotId: string) {
    setBusy(slotId);
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slotId,
          resourceId,
          userEmail: "demo@example.com",
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "book failed");
      alert(`Booked! reservationId=${j.reservationId}`);
      router.refresh();
      refresh();
    } catch (e: any) {
      alert(`Book error: ${e.message}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="space-y-6">
      {/* Toolbar */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
          >
            <Filter className="size-4" />
            Filters
            <ChevronDown
              className={clsx(
                "size-4 transition",
                filtersOpen ? "rotate-180" : ""
              )}
            />
          </button>

          <button
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
            title="Refresh"
          >
            <RefreshCw className={clsx("size-4", loading && "animate-spin")} />{" "}
            Refresh
          </button>

          <a
            href={icsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
            title="Open ICS feed"
          >
            <LinkIcon className="size-4" /> ICS feed
          </a>

          <button
            onClick={subscribeWebhook}
            disabled={busy === "subscribe"}
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            title="Subscribe mock webhook"
          >
            <Webhook className="size-4" />
            {busy === "subscribe" ? "Subscribing…" : "Subscribe mock"}
          </button>
        </div>

        {/* Collapsible filter panel (starts closed) */}
        {filtersOpen && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border p-3">
              <div className="text-xs font-medium text-gray-500 mb-2">
                Status
              </div>
              <div className="flex flex-wrap gap-2">
                {(["AVAILABLE", "HELD", "RESERVED", "BLOCKED"] as const).map(
                  (s) => (
                    <button
                      key={s}
                      onClick={() => toggleStatus(s)}
                      className={clsx(
                        "rounded-full border px-3 py-1 text-xs",
                        statuses.has(s)
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-white text-gray-700 hover:bg-gray-50"
                      )}
                      title={`Toggle ${s}`}
                    >
                      {s}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="rounded-xl border p-3">
              <div className="text-xs font-medium text-gray-500 mb-2">
                Bookable only
              </div>
              <button
                onClick={() => setOnlyAvailable((v) => !v)}
                className={clsx(
                  "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm",
                  onlyAvailable
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "hover:bg-gray-50"
                )}
                title="Toggle bookable filter"
              >
                <Clock className="size-4" />
                {onlyAvailable ? "Only bookable" : "All statuses"}
              </button>
            </div>

            <div className="rounded-xl border p-3 sm:col-span-2">
              <div className="text-xs font-medium text-gray-500 mb-2">
                Time window
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={timeStart}
                  onChange={(e) => setTimeStart(e.target.value)}
                  className="rounded-xl border px-3 py-2"
                  title="Start time"
                />
                <span className="text-gray-400">→</span>
                <input
                  type="time"
                  value={timeEnd}
                  onChange={(e) => setTimeEnd(e.target.value)}
                  className="rounded-xl border px-3 py-2"
                  title="End time"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing <b>{filtered.length}</b> slot
          {filtered.length === 1 ? "" : "s"} for <b>{resourceName}</b>.
        </p>
      </div>

      {/* Slots grouped by day */}
      <div className="space-y-6">
        {grouped.length === 0 && (
          <div className="rounded-2xl border p-12 text-center text-gray-500">
            No slots found.
          </div>
        )}

        {grouped.map(([day, items]) => (
          <section key={day} className="space-y-3">
            <h3 className="sticky top-0 z-10 bg-white/70 backdrop-blur px-1 text-sm font-medium text-gray-500">
              {format(new Date(day + "T00:00:00Z"), "EEEE, MMM d, yyyy")}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((s) => {
                const activeHold = s.holds?.find(isActiveHold);
                const bookable = isBookable(s);
                return (
                  <article
                    key={s.id}
                    className={clsx(
                      "rounded-2xl border p-4 shadow-sm transition hover:shadow-md bg-white ring-1",
                      STATUS_COLORS[s.status]
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wide opacity-70">
                        {s.status}
                      </span>
                      {activeHold && (
                        <span className="text-xs text-yellow-700">
                          hold →{" "}
                          {new Intl.DateTimeFormat(undefined, {
                            timeStyle: "short",
                          }).format(new Date(activeHold.expiresAt))}
                        </span>
                      )}
                    </div>

                    <div className="mb-4">
                      <div className="text-lg font-medium">
                        {new Intl.DateTimeFormat(undefined, {
                          timeStyle: "short",
                        }).format(new Date(s.startsAt))}{" "}
                        –{" "}
                        {new Intl.DateTimeFormat(undefined, {
                          timeStyle: "short",
                        }).format(new Date(s.endsAt))}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Intl.DateTimeFormat(undefined, {
                          dateStyle: "medium",
                        }).format(new Date(s.startsAt))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => hold(s.id)}
                        disabled={!bookable || busy === s.id}
                        className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
                        title="Temporary lock"
                      >
                        <Lock className="size-4" /> Hold
                      </button>
                      <button
                        onClick={() => book(s.id)}
                        disabled={!bookable || busy === s.id}
                        className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
                        title="Reserve and mirror to provider"
                      >
                        <Check className="size-4" /> Book
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
