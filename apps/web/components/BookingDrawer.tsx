"use client";
import * as React from "react";
import type { Slot } from "@/lib/api";
import { format } from "./slots/date";

type Props = {
  slot?: Slot | null;
  onClose: () => void;
  onConfirm: (email: string, slot: Slot) => Promise<void> | void;
  busy?: boolean;
  error?: string | null;
};

export default function BookingDrawer({
  slot,
  onClose,
  onConfirm,
  busy,
  error,
}: Props) {
  const [email, setEmail] = React.useState("");
  const open = Boolean(slot);

  React.useEffect(() => {
    if (open) setEmail("");
  }, [open]);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
      <aside
        className={`fixed bottom-0 left-0 right-0 z-50 w-full transform bg-neutral-950 p-6 ring-1 ring-neutral-800 transition ${open ? "translate-y-0" : "translate-y-full"}`}
        role="dialog"
        aria-modal="true"
        aria-label="Book slot"
      >
        {slot ? (
          <div className="container-resp">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold">Confirm booking</h2>
              <button className="btn btn-ghost" onClick={onClose}>
                Close
              </button>
            </div>
            <div className="mt-2 text-sm text-neutral-300">
              {format.date(new Date(slot.start))} ·{" "}
              {format.time(new Date(slot.start))}–
              {format.time(new Date(slot.end))}
              {slot.location ? <span> · {slot.location}</span> : null}
            </div>
            <div className="mt-6 grid gap-3 sm:max-w-md">
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {error ? (
                <p className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-red-500/30">
                  {error}
                </p>
              ) : null}
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn btn-primary disabled:opacity-50"
                disabled={!email || busy}
                onClick={() => slot && onConfirm(email, slot)}
              >
                {busy ? "Booking…" : "Confirm booking"}
              </button>
            </div>
          </div>
        ) : null}
      </aside>
    </>
  );
}
