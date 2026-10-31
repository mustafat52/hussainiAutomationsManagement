import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";
import { fail } from "@/lib/api";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("project_id");
  if (!projectId) {
    return NextResponse.json({ error: "project_id required" }, { status: 400 });
  }
  const supabase = await createClient();
  // Never return encrypted_value here — list is for masked display only.
  const { data, error } = await supabase
    .from("credentials")
    .select("id, project_id, key_name, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (error) return fail(error);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.project_id || !body.key_name || !body.value) {
    return NextResponse.json({ error: "project_id, key_name and value are required" }, { status: 400 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("credentials")
    .insert({
      project_id: body.project_id,
      key_name: body.key_name,
      encrypted_value: encrypt(body.value),
    })
    .select("id, project_id, key_name, created_at")
    .single();
  if (error) return fail(error);
  return NextResponse.json(data, { status: 201 });
}
