"use client";
import * as React from "react";

export default function DevAuthMenu() {
  const [resourceId, setResourceId] = React.useState("");
  const [email, setEmail] = React.useState("");

  async function act(path: string, payload: any) {
    await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    location.reload();
  }

  return (
    <div className="flex items-center gap-2">
      <input
        className="input !w-40"
        placeholder="resourceId (provider)"
        value={resourceId}
        onChange={(e) => setResourceId(e.target.value)}
      />
      <input
        className="input !w-44"
        placeholder="user email (user)"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button
        className="btn"
        onClick={() =>
          act("/api/auth/dev-login", { role: "provider", resourceId })
        }
      >
        As Provider
      </button>
      <button
        className="btn"
        onClick={() =>
          act("/api/auth/dev-login", { role: "user", userEmail: email })
        }
      >
        As User
      </button>
      <button
        className="btn btn-ghost"
        onClick={() => act("/api/auth/logout", {})}
      >
        Logout
      </button>
    </div>
  );
}
