import { NextResponse } from "next/server";
import { requireProvider } from "../../../../../../lib/rbac";
import { resolveCalendarProvider } from "../../../../../../lib/calendar";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; slotId: string } }
) {
  const authErr = await requireProvider(params.id);
  if (authErr) return authErr;

  const cal = await resolveCalendarProvider(params.id);
  try {
    await cal.deleteBlock(params.id, params.slotId);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === "NOT_FOUND") {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
