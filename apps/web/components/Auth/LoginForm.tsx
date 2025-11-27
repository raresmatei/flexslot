"use client";
import * as React from "react";

export default function LoginForm() {
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function submit(path: "/api/auth/login" | "/api/auth/register") {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error || "Failed");
      }
      // Cookie 'auth' is set by server; just navigate
      window.location.href = "/";
    } catch (e: any) {
      setErr(e?.message || "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-resp py-10">
      <div className="mx-auto max-w-md card p-6">
        <h1 className="text-lg font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Enter your email to continue.
        </p>
        <div className="mt-4 grid gap-2">
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        {err ? <p className="mt-2 text-sm text-red-300">{err}</p> : null}
        <div className="mt-4 flex gap-2">
          <button
            className="btn btn-primary"
            disabled={!email || busy}
            onClick={() => submit("/api/auth/login")}
          >
            {busy ? "Please wait…" : "Login"}
          </button>
          <button
            className="btn"
            disabled={!email || busy}
            onClick={() => submit("/api/auth/register")}
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
}
