"use client";
import * as React from "react";
import { format } from "./date";
import type { Slot } from "@/lib/api";

type Props = {
  slot: Slot;
  onBook: (slot: Slot) => void;
};

export default function SlotCard({ slot, onBook }: Props) {
  const start = new Date(slot.start);
  const end = new Date(slot.end);
  const durationMin = Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / 60000)
  );

  return (
    <article className="card p-4 hover:ring-neutral-700 transition">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">
            {format.date(start)}{" "}
            <span className="text-neutral-400">
              · {format.time(start)}–{format.time(end)}
            </span>
          </h3>
          <p className="text-xs text-neutral-400">
            Duration: {durationMin} min
            {slot.location ? ` · ${slot.location}` : ""}
          </p>
        </div>
        <div className="text-right">
          {slot.price != null ? (
            <div className="text-sm">
              {slot.price.toLocaleString(undefined, {
                style: "currency",
                currency: "EUR",
              })}
            </div>
          ) : (
            <div className="text-sm text-neutral-400">Free</div>
          )}
          {slot.capacity != null && (
            <div className="text-[11px] text-neutral-500">
              Capacity: {slot.capacity}
            </div>
          )}
        </div>
      </header>
      {slot.tags?.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {slot.tags.map((t) => (
            <span key={t} className="chip">
              {t}
            </span>
          ))}
        </div>
      ) : null}
      <footer className="mt-4 flex items-center justify-end">
        <button className="btn btn-primary" onClick={() => onBook(slot)}>
          Book
        </button>
      </footer>
    </article>
  );
}
