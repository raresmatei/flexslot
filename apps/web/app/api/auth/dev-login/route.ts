import { NextResponse } from "next/server";
import { createSession } from "../../../../lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const role = body?.role;
  if (role !== "user" && role !== "provider") {
    return NextResponse.json({ error: "INVALID_ROLE" }, { status: 400 });
  }
  const resourceId: string | undefined = body?.resourceId || undefined;
  const userEmail: string | undefined = body?.userEmail || undefined;

  await createSession({ role, resourceId, userEmail });
  return NextResponse.json({ ok: true });
}
