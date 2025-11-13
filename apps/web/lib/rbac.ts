import { NextResponse } from "next/server";
import { getSession } from "./auth";

export async function requireUser() {
  const s = await getSession();
  if (!s || s.role !== "user") {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "User role required" },
      { status: 403 }
    );
  }
  return null;
}

export async function requireProvider(expectedResourceId?: string) {
  const s = await getSession();
  if (!s || s.role !== "provider") {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Provider role required" },
      { status: 403 }
    );
  }
  if (expectedResourceId && s.resourceId !== expectedResourceId) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Resource mismatch" },
      { status: 403 }
    );
  }
  return null;
}
