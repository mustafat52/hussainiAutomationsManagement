import { NextResponse } from "next/server";

export const BUCKET = "project-files";

// Turns a Supabase error into a JSON response the UI can show.
export function fail(error: { message: string } | null | undefined, status = 500) {
  return NextResponse.json({ error: error?.message || "Something went wrong" }, { status });
}

// Postgres date columns reject "" — treat empty strings as null.
export function nullIfEmpty(v: unknown) {
  return typeof v === "string" && v.trim() === "" ? null : v ?? null;
}

export function num(v: unknown) {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
}
