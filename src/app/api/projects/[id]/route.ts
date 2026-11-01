import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BUCKET, fail, nullIfEmpty, num } from "@/lib/api";

const TEXT_FIELDS = [
  "name", "description", "status", "tags", "payment_status",
  "account_used", "repo_url", "hosting", "architecture_notes", "backend_notes",
  "maintenance_status", "maintenance_cycle", "maintenance_coverage",
];
const DATE_FIELDS = ["start_date", "delivery_date", "maintenance_next_due"];
const BOOL_FIELDS = ["maintenance_on"];
const NUMBER_FIELDS = ["quoted_amount", "final_amount", "amount_collected", "maintenance_amount"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const update: Record<string, unknown> = {};
  for (const k of TEXT_FIELDS) if (k in body) update[k] = body[k] ?? "";
  for (const k of DATE_FIELDS) if (k in body) update[k] = nullIfEmpty(body[k]);
  for (const k of NUMBER_FIELDS) if (k in body) update[k] = num(body[k]);
  for (const k of BOOL_FIELDS) if (k in body) update[k] = body[k] === true;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }
  update.last_touched = new Date().toISOString();

  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").update(update).eq("id", id).select().single();
  if (error) return fail(error);
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // The database cascade removes the file rows, but not the stored files — do that first.
  const { data: files } = await supabase.from("files").select("storage_path").eq("project_id", id);
  const paths = (files || []).map((f) => f.storage_path);
  if (paths.length > 0) await supabase.storage.from(BUCKET).remove(paths);

  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) return fail(error);
  return NextResponse.json({ ok: true });
}