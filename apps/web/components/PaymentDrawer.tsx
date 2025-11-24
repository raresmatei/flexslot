"use client";
import * as React from "react";
import { stripePromise } from "../lib/stripeClient";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

type Slot = {
  id: string;
  resourceId?: string;
  start: string;
  end: string;
  location?: string | null;
};

type Props = {
  slot: Slot | null;
  onClose: () => void;
  onSuccess: () => void; // called after reservation is confirmed (webhook done)
};

function fmtTimeRange(startIso: string, endIso: string) {
  const s = new Date(startIso),
    e = new Date(endIso);
  const opt: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
  };
  return `${s.toLocaleTimeString(undefined, opt)} – ${e.toLocaleTimeString(undefined, opt)}`;
}
function priceCentsFor(slot: Slot) {
  // TODO: replace with your slot pricing logic
  return 1500; // €15.00
}

export default function PaymentDrawer({ slot, onClose, onSuccess }: Props) {
  const open = Boolean(slot);
  const [email, setEmail] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);
  const [holdId, setHoldId] = React.useState<string | null>(null);
  const [expiresAt, setExpiresAt] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Countdown timer
  const secondsLeft = React.useMemo(() => {
    if (!expiresAt) return null;
    const left = Math.max(
      0,
      Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
    );
    return left;
  }, [expiresAt]);
  React.useEffect(() => {
    if (!open || !expiresAt) return;
    const t = setInterval(() => {
      // force re-render by updating state (use expiresAt changes)
      // We'll just trigger a render via setError((e)=>e) noop
      setError((e) => e);
    }, 1000);
    return () => clearInterval(t);
  }, [open, expiresAt]);

  // Reset when opening/closing
  React.useEffect(() => {
    if (open) {
      setEmail("");
      setClientSecret(null);
      setHoldId(null);
      setExpiresAt(null);
      setError(null);
    }
  }, [open]);

  async function startFlow() {
    if (!slot) return;
    setError(null);
    setCreating(true);
    try {
      // 1) Create hold
      const resHold = await fetch("/api/holds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: slot.id,
          resourceId: slot.resourceId || "",
          userEmail: email,
        }),
      });
      if (!resHold.ok) {
        const j = await resHold.json().catch(() => ({}));
        throw new Error(j?.message || j?.error || "Could not create hold");
      }
      const h = await resHold.json();
      setHoldId(h.id);
      setExpiresAt(h.expiresAt);

      // 2) Create PaymentIntent
      const amountCents = priceCentsFor(slot);
      const resPi = await fetch("/api/payments/intents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holdId: h.id, amountCents }),
      });
      if (!resPi.ok) {
        const j = await resPi.json().catch(() => ({}));
        throw new Error(j?.message || j?.error || "Payment init failed");
      }
      const pi = await resPi.json();
      setClientSecret(pi.clientSecret);
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  async function cleanupHold() {
    if (holdId) {
      try {
        await fetch(`/api/holds/${holdId}`, { method: "DELETE" });
      } catch {}
    }
  }

  function closeAll() {
    cleanupHold();
    onClose();
  }

  // If hold expired, auto-close
  React.useEffect(() => {
    if (!expiresAt) return;
    const t = new Date(expiresAt).getTime() - Date.now();
    if (t <= 0) {
      setError("Hold expired. Please try again.");
      setTimeout(() => closeAll(), 1200);
    }
    // no cleanup on purpose
  }, [expiresAt]);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={closeAll}
      />
      <aside
        className={`fixed bottom-0 left-0 right-0 z-50 w-full transform bg-neutral-950 p-6 ring-1 ring-neutral-800 transition ${open ? "translate-y-0" : "translate-y-full"}`}
        role="dialog"
        aria-modal="true"
        aria-label="Pay and confirm booking"
      >
        {slot ? (
          <div className="container-resp">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold">Confirm booking</h2>
              <button className="btn btn-ghost" onClick={closeAll}>
                Close
              </button>
            </div>

            <div className="mt-2 text-sm text-neutral-300">
              {new Date(slot.start).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
              {" · "}
              {fmtTimeRange(slot.start, slot.end)}
              {slot.location ? <span> · {slot.location}</span> : null}
            </div>

            {!clientSecret ? (
              <>
                <div className="mt-6 grid gap-3 sm:max-w-md">
                  <label className="label">Email</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {expiresAt ? (
                    <div className="text-xs text-neutral-400">
                      Hold expires in {secondsLeft ?? 0}s
                    </div>
                  ) : (
                    <div className="text-xs text-neutral-400">
                      You’ll have 2 minutes to complete payment after starting.
                    </div>
                  )}
                  {error ? (
                    <p className="mt-1 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-red-500/30">
                      {error}
                    </p>
                  ) : null}
                </div>
                <div className="mt-6 flex items-center justify-end gap-2">
                  <button className="btn btn-ghost" onClick={closeAll}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary disabled:opacity-50"
                    disabled={!email || creating}
                    onClick={startFlow}
                  >
                    {creating
                      ? "Starting…"
                      : `Pay €${(priceCentsFor(slot) / 100).toFixed(2)}`}
                  </button>
                </div>
              </>
            ) : (
              <Elements
                stripe={stripePromise}
                options={{ clientSecret, appearance: { theme: "night" } }}
              >
                <StripePaymentSection
                  holdId={holdId!}
                  onSuccess={() => {
                    onSuccess();
                    closeAll();
                  }}
                  onError={(msg) => setError(msg)}
                  expiresAt={expiresAt}
                />
              </Elements>
            )}
          </div>
        ) : null}
      </aside>
    </>
  );
}

function StripePaymentSection({
  holdId,
  onSuccess,
  onError,
  expiresAt,
}: {
  holdId: string;
  onSuccess: () => void;
  onError: (m: string) => void;
  expiresAt: string | null;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = React.useState(false);
  const [polling, setPolling] = React.useState(false);

  async function pollStatus() {
    setPolling(true);
    const deadline = Date.now() + 25_000; // up to 25s
    while (Date.now() < deadline) {
      const r = await fetch(`/api/holds/${holdId}/status`);
      if (r.ok) {
        const j = await r.json();
        if (j.status === "CONVERTED" && j.reservationId) {
          onSuccess();
          return;
        }
        if (j.status === "EXPIRED") {
          onError("Hold expired while processing");
          return;
        }
      }
      await new Promise((res) => setTimeout(res, 1500));
    }
    onError(
      "Payment processed, waiting for confirmation. Check ‘My bookings’."
    ); // eventual consistency fallback
  }

  async function onSubmit() {
    if (!stripe || !elements) return;
    setSubmitting(true);
    onError(""); // clear

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {},
        redirect: "if_required",
      });
      if (error) {
        onError(error.message || "Payment failed");
        return;
      }
      // Payment confirmed client-side. Webhook will create the reservation.
      await pollStatus();
    } finally {
      setSubmitting(false);
    }
  }

  const secs = expiresAt
    ? Math.max(
        0,
        Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
      )
    : null;

  return (
    <div className="mt-6 max-w-md">
      <PaymentElement />
      <div className="mt-2 text-xs text-neutral-400">
        {secs != null ? `Hold expires in ${secs}s` : null}
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          className="btn btn-primary disabled:opacity-50"
          onClick={onSubmit}
          disabled={submitting || polling || !stripe || !elements}
        >
          {submitting ? "Processing…" : polling ? "Confirming…" : "Pay & book"}
        </button>
      </div>
    </div>
  );
}
