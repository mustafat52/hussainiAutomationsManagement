import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fail } from "@/lib/api";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("clients").select("*").order("name", { ascending: true });
  if (error) return fail(error);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "Client name is required" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({
      name,
      contact: body.contact || "",
      status: body.status || "lead",
      notes: body.notes || "",
    })
    .select()
    .single();
  if (error) return fail(error);
  return NextResponse.json(data, { status: 201 });
}
