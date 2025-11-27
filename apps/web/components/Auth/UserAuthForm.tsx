"use client";
import * as React from "react";

export default function UserAuthForm({ mode }: { mode: "login" | "register" }) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/auth/user/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          ...(mode === "register" ? { name } : {}),
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error || "Failed");
      }
      window.location.href = "/providers";
    } catch (e: any) {
      setErr(e?.message || "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="grid gap-3"
    >
      {mode === "register" ? (
        <>
          <label className="label">Name (optional)</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </>
      ) : null}
      <label className="label">Email</label>
      <input
        className="input"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        required
      />
      <label className="label">Password</label>
      <input
        className="input"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        required
      />
      {err ? <p className="text-sm text-red-300">{err}</p> : null}
      <div className="flex justify-end">
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Please wait…" : mode === "login" ? "Login" : "Register"}
        </button>
      </div>
    </form>
  );
}
