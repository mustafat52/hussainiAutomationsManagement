import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BUCKET, fail } from "@/lib/api";

// Download: redirects to a short-lived signed URL (the bucket is private).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("files")
    .select("storage_path, original_name")
    .eq("id", id)
    .maybeSingle();
  if (error) return fail(error);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(row.storage_path, 60, { download: row.original_name });
  if (signError || !data) {
    return NextResponse.json({ error: "File missing in storage" }, { status: 404 });
  }
  return NextResponse.redirect(data.signedUrl);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: row } = await supabase.from("files").select("storage_path").eq("id", id).maybeSingle();
  if (row) await supabase.storage.from(BUCKET).remove([row.storage_path]);

  const { error } = await supabase.from("files").delete().eq("id", id);
  if (error) return fail(error);
  return NextResponse.json({ ok: true });
}
