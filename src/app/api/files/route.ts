import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fail } from "@/lib/api";

// The file itself is uploaded by the browser straight to Supabase Storage.
// This route only lists files and records the metadata afterwards.

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("project_id");
  if (!projectId) {
    return NextResponse.json({ error: "project_id required" }, { status: 400 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("files")
    .select("id, project_id, original_name, size, mime_type, uploaded_at")
    .eq("project_id", projectId)
    .order("uploaded_at", { ascending: false });
  if (error) return fail(error);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { project_id, original_name, storage_path, size, mime_type } = body;
  if (!project_id || !original_name || !storage_path) {
    return NextResponse.json({ error: "project_id, original_name and storage_path required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("files")
    .insert({
      project_id,
      original_name,
      storage_path,
      size: Number(size) || 0,
      mime_type: mime_type || "application/octet-stream",
    })
    .select("id, project_id, original_name, size, mime_type, uploaded_at")
    .single();
  if (error) return fail(error);

  await supabase.from("projects").update({ last_touched: new Date().toISOString() }).eq("id", project_id);

  return NextResponse.json(data, { status: 201 });
}
