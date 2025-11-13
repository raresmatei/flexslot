"use client";
import * as React from "react";

export type Filters = {
  dateFrom?: string;
  dateTo?: string;
  minPrice?: number;
  maxPrice?: number;
  tag?: string;
};

type Props = {
  value: Filters;
  onChange: (f: Filters) => void;
  onApply: () => void;
  onReset: () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
};

export default function FiltersSheet({
  value,
  onChange,
  onApply,
  onReset,
  open,
  setOpen,
}: Props) {
  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setOpen(false)}
      />
      {/* Panel */}
      <aside
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-md transform bg-neutral-950 p-6 ring-1 ring-neutral-800 transition ${open ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Filters</h2>
          <button className="btn btn-ghost" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
        <div className="mt-6 space-y-4">
          <div>
            <label className="label">From</label>
            <input
              className="input"
              type="date"
              value={value.dateFrom ?? ""}
              onChange={(e) => onChange({ ...value, dateFrom: e.target.value })}
            />
          </div>
          <div>
            <label className="label">To</label>
            <input
              className="input"
              type="date"
              value={value.dateTo ?? ""}
              onChange={(e) => onChange({ ...value, dateTo: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Min price</label>
              <input
                className="input"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={value.minPrice ?? ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    minPrice:
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <label className="label">Max price</label>
              <input
                className="input"
                type="number"
                inputMode="decimal"
                placeholder=""
                value={value.maxPrice ?? ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    maxPrice:
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
                  })
                }
              />
            </div>
          </div>
          <div>
            <label className="label">Tag</label>
            <input
              className="input"
              placeholder="e.g. haircut, cleaning"
              value={value.tag ?? ""}
              onChange={(e) =>
                onChange({ ...value, tag: e.target.value || undefined })
              }
            />
          </div>
        </div>
        <div className="mt-8 flex items-center justify-between gap-3">
          <button className="btn btn-ghost" onClick={onReset}>
            Reset
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              onApply();
              setOpen(false);
            }}
          >
            Apply
          </button>
        </div>
      </aside>
    </>
  );
}
