import "./globals.css";
import DevAuthMenu from "../components/DevAuthMenu";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isDev = process.env.NODE_ENV !== "production";

  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-30 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur">
          <div className="container-resp flex h-14 items-center justify-between gap-4">
            <a href="/" className="text-lg font-semibold tracking-tight">
              Flexslot
            </a>
            <nav className="flex items-center gap-1">
              <a href="/" className="nav-link">
                Home
              </a>
              <a href="/providers" className="nav-link">
                Providers
              </a>
              <a href="/me/bookings" className="nav-link">
                My bookings
              </a>
            </nav>
            <div className="hidden md:block">
              {isDev ? <DevAuthMenu /> : null}
            </div>
          </div>
        </header>
        {children}
        <footer className="border-t border-neutral-800">
          <div className="container-resp py-8 text-xs text-neutral-400">
            © {new Date().getFullYear()} Flexslot
          </div>
        </footer>
      </body>
    </html>
  );
}
