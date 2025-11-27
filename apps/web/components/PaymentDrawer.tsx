"use client";
import * as React from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { stripePromise } from "../lib/stripeClient";

type Slot = {
  id: string;
  resourceId?: string;
  start: string;
  end: string;
  location?: string | null;
};
type Props = { slot: Slot | null; onClose: () => void; onSuccess: () => void };

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
  return 1500;
}

export default function PaymentDrawer({ slot, onClose, onSuccess }: Props) {
  const open = Boolean(slot);
  const [creating, setCreating] = React.useState(false);
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);
  const [holdId, setHoldId] = React.useState<string | null>(null);
  const [expiresAt, setExpiresAt] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [me, setMe] = React.useState<{ id: string; email: string } | null>(
    null
  );

  React.useEffect(() => {
    if (!open) return;
    setClientSecret(null);
    setHoldId(null);
    setExpiresAt(null);
    setError(null);
    (async () => {
      const r = await fetch("/api/auth/me", { cache: "no-store" });
      if (!r.ok) {
        setMe(null);
        return;
      }
      const j = await r.json();
      if (j.role !== "user") {
        setMe(null);
        return;
      }
      setMe(j.user);
    })();
  }, [open]);

  async function startFlow() {
    if (!slot || !me) return;
    setError(null);
    setCreating(true);
    try {
      // 1) Create hold (send userId explicitly)
      const resHold = await fetch("/api/holds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: slot.id,
          resourceId: slot.resourceId || "",
          userId: me.id,
        }),
      });
      if (!resHold.ok) {
        const j = await resHold.json().catch(() => ({}));
        throw new Error(j?.message || j?.error || "Could not create hold");
      }
      const h = await resHold.json();
      setHoldId(h.id);
      setExpiresAt(h.expiresAt);

      // 2) PaymentIntent
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

  const secondsLeft = React.useMemo(() => {
    if (!expiresAt) return null;
    return Math.max(
      0,
      Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
    );
  }, [expiresAt]);
  React.useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => {}, 1000);
    return () => clearInterval(t);
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

            {!me ? (
              <div className="mt-6 card p-4">
                <p className="text-sm">
                  Please{" "}
                  <a className="link" href="/login">
                    sign in
                  </a>{" "}
                  to continue.
                </p>
              </div>
            ) : !clientSecret ? (
              <>
                <div className="mt-4 text-sm text-neutral-300">
                  You are signing in as{" "}
                  <span className="font-medium">{me.email}</span>.
                </div>
                {secondsLeft != null ? (
                  <div className="text-xs text-neutral-400">
                    Hold expires in {secondsLeft}s
                  </div>
                ) : (
                  <div className="text-xs text-neutral-400">
                    You’ll have 2 minutes to complete payment after starting.
                  </div>
                )}
                {error ? (
                  <p className="mt-2 text-sm text-red-300">{error}</p>
                ) : null}
                <div className="mt-4 flex items-center justify-end">
                  <button
                    className="btn btn-primary"
                    onClick={startFlow}
                    disabled={creating}
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
                  onError={(m) => setError(m)}
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

  async function pollStatus() {
    const deadline = Date.now() + 25_000;
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
    onError("Payment processed, waiting for confirmation. Check My bookings.");
  }

  async function onSubmit() {
    if (!stripe || !elements) return;
    setSubmitting(true);
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
      <div className="mt-4 flex items-center justify-end">
        <button
          className="btn btn-primary disabled:opacity-50"
          onClick={onSubmit}
          disabled={submitting || !stripe || !elements}
        >
          {submitting ? "Processing…" : "Pay & book"}
        </button>
      </div>
    </div>
  );
}
