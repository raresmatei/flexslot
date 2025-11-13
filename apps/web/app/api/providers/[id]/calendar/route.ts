import { NextResponse } from "next/server";
import { requireProvider } from "../../../../../lib/rbac";
import { resolveCalendarProvider } from "../../../../../lib/calendar";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const authErr = await requireProvider(params.id);
  if (authErr) return authErr;

  const cal = await resolveCalendarProvider(params.id);
  const items = await cal.list(params.id);

  return NextResponse.json(
    items.map((e) => ({
      id: e.id,
      start: e.start.toISOString(),
      end: e.end.toISOString(),
      title: e.title,
      type: e.type,
    }))
  );
}
