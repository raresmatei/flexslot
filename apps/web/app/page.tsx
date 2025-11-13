import Link from "next/link";

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="border-b border-neutral-800 bg-gradient-to-b from-neutral-950 to-neutral-900">
        <div className="container-resp py-16 sm:py-20">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <span className="inline-block rounded-full bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-300 ring-1 ring-sky-500/30">
                New UI
              </span>
              <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">
                Book what you need,{" "}
                <span className="text-sky-300">when you need it</span>.
              </h1>
              <p className="mt-3 text-neutral-300">
                Browse all slots by default—apply filters only if you want. A
                cleaner, friendlier interface that keeps the focus on getting
                things done.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/providers" className="btn btn-primary">
                  Browse providers
                </Link>
                <a href="#how-it-works" className="btn btn-secondary">
                  How it works
                </a>
              </div>
              <p className="mt-3 text-xs text-neutral-400">
                Tip: You can book directly from the provider’s slots page.
                Errors like <code>NO_INTEGRATION</code> are shown clearly.
              </p>
            </div>

            <div className="card p-5">
              <div className="rounded-xl bg-neutral-800/50 p-4 ring-1 ring-neutral-700">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-neutral-400">
                      Next available
                    </div>
                    <div className="text-lg font-medium">
                      Today · 15:00–16:00
                    </div>
                  </div>
                  <span className="chip">demo</span>
                </div>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <Link href="/providers" className="btn btn-primary">
                    View slots
                  </Link>
                  <a href="#how-it-works" className="btn btn-ghost">
                    Learn more
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <a
              className="card p-5 hover:ring-neutral-700 transition"
              href="/providers"
            >
              <h3 className="font-medium">All Providers</h3>
              <p className="mt-1 text-sm text-neutral-400">
                See every provider and their slots. No filters applied by
                default.
              </p>
            </a>
            <a
              className="card p-5 hover:ring-neutral-700 transition"
              href="#how-it-works"
            >
              <h3 className="font-medium">How It Works</h3>
              <p className="mt-1 text-sm text-neutral-400">
                Three steps: pick, review, book. That’s it.
              </p>
            </a>
            <a
              className="card p-5 hover:ring-neutral-700 transition"
              href="#support"
            >
              <h3 className="font-medium">Support</h3>
              <p className="mt-1 text-sm text-neutral-400">
                Questions or integration issues? We’ll guide you.
              </p>
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="container-resp py-14">
        <h2 className="text-2xl font-semibold">How it works</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="card p-5">
            <div className="text-sm text-neutral-400">Step 1</div>
            <div className="mt-1 font-medium">Open a provider</div>
            <p className="mt-1 text-sm text-neutral-400">
              You’ll immediately see{" "}
              <span className="font-medium text-neutral-200">
                all available slots
              </span>
              .
            </p>
          </div>
          <div className="card p-5">
            <div className="text-sm text-neutral-400">Step 2</div>
            <div className="mt-1 font-medium">Optionally refine</div>
            <p className="mt-1 text-sm text-neutral-400">
              Use the filter sheet only if needed—date range, price range, or
              tags.
            </p>
          </div>
          <div className="card p-5">
            <div className="text-sm text-neutral-400">Step 3</div>
            <div className="mt-1 font-medium">Book cleanly</div>
            <p className="mt-1 text-sm text-neutral-400">
              Confirm your email and get an instant response. Clear errors if
              something’s missing.
            </p>
          </div>
        </div>
      </section>

      {/* Support */}
      <section
        id="support"
        className="border-t border-neutral-800 bg-neutral-950"
      >
        <div className="container-resp py-12">
          <div className="grid items-center gap-6 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold">Need help?</h2>
              <p className="mt-2 text-neutral-300">
                If a resource lacks an integration, bookings may fail with{" "}
                <code>NO_INTEGRATION</code>. Contact the provider or support to
                enable it.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <a href="/providers" className="btn btn-secondary">
                Browse providers
              </a>
              <a href="#" className="btn btn-primary">
                Contact support
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
