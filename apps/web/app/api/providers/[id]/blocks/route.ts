import { NextResponse } from "next/server";
import { requireProvider } from "../../../../../lib/rbac";
import { resolveCalendarProvider } from "../../../../../lib/calendar";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const authErr = await requireProvider(params.id);
  if (authErr) return authErr;

  const body = await req.json().catch(() => ({}));
  const startIso: string | undefined = body?.start;
  const endIso: string | undefined = body?.end;
  if (!startIso || !endIso) {
    return NextResponse.json(
      { error: "INVALID_BODY", message: "Provide { start, end } ISO strings" },
      { status: 400 }
    );
  }

  const start = new Date(startIso);
  const end = new Date(endIso);
  if (
    !(start instanceof Date) ||
    isNaN(+start) ||
    !(end instanceof Date) ||
    isNaN(+end) ||
    end <= start
  ) {
    return NextResponse.json(
      { error: "INVALID_RANGE", message: "Invalid date range" },
      { status: 400 }
    );
  }

  try {
    const cal = await resolveCalendarProvider(params.id);
    const ev = await cal.createBlock(params.id, start, end);
    return NextResponse.json({
      id: ev.id,
      start: ev.start.toISOString(),
      end: ev.end.toISOString(),
      title: ev.title,
      type: ev.type,
    });
  } catch (e: any) {
    if (e?.code === "OVERLAP") {
      return NextResponse.json(
        { error: "OVERLAP", message: e.message },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
