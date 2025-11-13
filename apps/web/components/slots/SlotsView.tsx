"use client";
import * as React from "react";
import { getSlots, bookSlot, type Slot } from "../../lib/api";
import SlotCard from "./SlotCard";
import FiltersSheet, { type Filters } from "../FiltersSheet";
import BookingDrawer from "../BookingDrawer";

type Props = { providerId: string };

export default function SlotsView({ providerId }: Props) {
  const [filters, setFilters] = React.useState<Filters>({});
  const [applied, setApplied] = React.useState<Filters>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [slots, setSlots] = React.useState<Slot[]>([]);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Slot | null>(null);
  const [bookingBusy, setBookingBusy] = React.useState(false);
  const [bookingError, setBookingError] = React.useState<string | null>(null);

  const load = React.useCallback(
    async (f: Filters) => {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string | number> = {};
        if (f.dateFrom) params.dateFrom = f.dateFrom;
        if (f.dateTo) params.dateTo = f.dateTo;
        if (f.minPrice != null) params.minPrice = f.minPrice;
        if (f.maxPrice != null) params.maxPrice = f.maxPrice;
        if (f.tag) params.tag = f.tag;
        if ((f as any).resourceId) params.resourceId = (f as any).resourceId;

        const data = await getSlots(providerId, params);
        setSlots(data);
      } catch (e: any) {
        setError(e?.message || "Failed to load slots");
      } finally {
        setLoading(false);
      }
    },
    [providerId]
  );

  React.useEffect(() => {
    load({});
  }, [load]);

  function applyFilters() {
    setApplied(filters);
    load(filters);
  }
  function resetFilters() {
    setFilters({});
    setApplied({});
    load({});
  }

  async function confirmBooking(email: string, slot: Slot) {
    setBookingBusy(true);
    setBookingError(null);
    try {
      await bookSlot({
        slotId: slot.id,
        resourceId: slot.resourceId || "",
        userEmail: email,
      });
      setSelected(null);
      alert("Booked! Check your email for confirmation.");
      load(applied);
    } catch (e: any) {
      setBookingError(e?.message || "Booking failed");
    } finally {
      setBookingBusy(false);
    }
  }

  return (
    <div className="container-resp">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Available slots</h1>
        <div className="flex items-center gap-2">
          <button
            className="btn btn-ghost"
            onClick={resetFilters}
            title="Reset filters"
          >
            Reset
          </button>
          <button
            className="btn"
            onClick={() => setSheetOpen(true)}
            title="Open filters"
          >
            Filters{" "}
            {Object.keys(applied).length ? (
              <span className="ml-1 chip">{Object.keys(applied).length}</span>
            ) : null}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="card h-36 animate-pulse bg-neutral-900/50"
            />
          ))}
        </div>
      ) : error ? (
        <div className="card p-6">
          <p className="text-sm text-red-300">{error}</p>
          <button className="btn btn-ghost mt-3" onClick={() => load(applied)}>
            Retry
          </button>
        </div>
      ) : slots.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="text-sm text-neutral-400">
            No slots match your criteria. Try resetting filters.
          </p>
          <button className="btn btn-ghost mt-3" onClick={resetFilters}>
            Show all
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {slots.map((s) => (
            <SlotCard key={s.id} slot={s} onBook={setSelected} />
          ))}
        </div>
      )}

      <FiltersSheet
        value={filters}
        onChange={setFilters}
        onApply={applyFilters}
        onReset={resetFilters}
        open={sheetOpen}
        setOpen={setSheetOpen}
      />

      <BookingDrawer
        slot={selected}
        onClose={() => {
          setSelected(null);
          setBookingError(null);
        }}
        onConfirm={confirmBooking}
        busy={bookingBusy}
        error={bookingError}
      />
    </div>
  );
}
