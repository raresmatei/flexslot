export default function Home() {
  return (
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold">Flexslot</h1>
      <p className="mt-2 text-sm text-gray-600">Booking skeleton is running.</p>
      <div className="mt-6 text-sm">
        <ul className="list-disc list-inside">
          <li>
            API health: <code>/api/health</code>
          </li>
          <li>
            Hold endpoint: <code>/api/hold</code>
          </li>
          <li>
            Availability endpoint: <code>/api/availability</code>
          </li>
        </ul>
      </div>
    </main>
  );
}
