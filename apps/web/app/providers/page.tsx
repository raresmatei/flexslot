"use client";
import * as React from "react";
import type { Provider } from "../../lib/api";
import { getProviders } from "../../lib/api";

export default function ProvidersPage() {
  const [providers, setProviders] = React.useState<Provider[] | null>(null);

  React.useEffect(() => {
    getProviders()
      .then(setProviders)
      .catch(() => setProviders([]));
  }, []);

  return (
    <main className="container-resp py-6">
      <h1 className="text-xl font-semibold">Providers</h1>

      {providers === null ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="card h-24 animate-pulse bg-neutral-900/50"
            />
          ))}
        </div>
      ) : providers.length === 0 ? (
        <div className="card p-6 mt-4">
          <p className="text-sm text-neutral-300">
            No providers (resources) found.
          </p>
          <a href="/" className="btn btn-ghost mt-3">
            Back home
          </a>
        </div>
      ) : (
        <section className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((p) => (
            <article
              key={p.id}
              className="card p-4 hover:ring-neutral-700 transition"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 rounded-xl bg-neutral-800" />
                <div>
                  <h3 className="font-medium">{p.name}</h3>
                  <p className="mt-0.5 max-w-prose text-xs text-neutral-400 truncate">
                    {p.description || ""}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <a href={`/providers/${p.id}`} className="btn btn-primary">
                  View slots
                </a>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
