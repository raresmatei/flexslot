"use client";
import * as React from "react";
import UserAuthForm from "./UserAuthForm";
import ProviderAuthForm from "./ProviderAuthForm";

export default function AuthTabs() {
  const [tab, setTab] = React.useState<"user" | "provider">("user");
  const [mode, setMode] = React.useState<"login" | "register">("login");

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold text-center">
        Welcome to FlexSlot
      </h1>
      <p className="mt-2 text-center text-neutral-400">
        Book and manage appointments with ease.
      </p>

      <div className="mt-6 flex justify-center gap-2">
        <button
          className={`chip ${tab === "user" ? "bg-neutral-800" : ""}`}
          onClick={() => setTab("user")}
        >
          User
        </button>
        <button
          className={`chip ${tab === "provider" ? "bg-neutral-800" : ""}`}
          onClick={() => setTab("provider")}
        >
          Provider
        </button>
      </div>

      <div className="mt-4 flex justify-center gap-2">
        <button
          className={`chip ${mode === "login" ? "bg-neutral-800" : ""}`}
          onClick={() => setMode("login")}
        >
          Login
        </button>
        <button
          className={`chip ${mode === "register" ? "bg-neutral-800" : ""}`}
          onClick={() => setMode("register")}
        >
          Register
        </button>
      </div>

      <div className="mt-6 card p-6">
        {tab === "user" ? (
          <UserAuthForm mode={mode} />
        ) : (
          <ProviderAuthForm mode={mode} />
        )}
      </div>

      <div className="mt-6 grid gap-2 text-center">
        <a className="link" href="/providers">
          Browse providers (requires user login)
        </a>
        <a className="link" href="/my">
          My bookings (user)
        </a>
        <a className="link" href="/provider/dashboard">
          Provider dashboard
        </a>
      </div>
    </div>
  );
}
