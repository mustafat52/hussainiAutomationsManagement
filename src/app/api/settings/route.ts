import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fail } from "@/lib/api";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("settings").select("key, value");
  if (error) return fail(error);
  const settings: Record<string, string> = {};
  for (const row of data || []) settings[row.key] = row.value;
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const key = body.key as string;
  const value = String(body.value ?? "");
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase.from("settings").upsert({ key, value }, { onConflict: "key" });
  if (error) return fail(error);
  return NextResponse.json({ key, value });
}
