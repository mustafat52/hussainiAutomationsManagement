import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fail } from "@/lib/api";

const PALETTE = [
  "#8b8ff5", "#e8734a", "#4a9b6e", "#d9a53f",
  "#5a8fd9", "#c95a8f", "#4ab5b5", "#a05ad9",
];

function colorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("accounts").select("*").order("name", { ascending: true });
  if (error) return fail(error);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = (body.name || "").trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const supabase = await createClient();

  const { data: existing } = await supabase.from("accounts").select("*").eq("name", name).maybeSingle();
  if (existing) return NextResponse.json(existing);

  const { data, error } = await supabase
    .from("accounts")
    .insert({ name, color: colorFor(name) })
    .select()
    .single();
  if (error) return fail(error);
  return NextResponse.json(data, { status: 201 });
}
