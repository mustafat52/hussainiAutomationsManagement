import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt, encrypt } from "@/lib/crypto";
import { fail } from "@/lib/api";

const open = (v: string) => (v ? decrypt(v) : "");

// Returns the decrypted password + notes — only called when you tap reveal / copy / edit.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vault_entries")
    .select("encrypted_password, encrypted_notes")
    .eq("id", id)
    .maybeSingle();
  if (error) return fail(error);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    return NextResponse.json({ password: open(data.encrypted_password), notes: open(data.encrypted_notes) });
  } catch {
    return NextResponse.json(
      { error: "Could not decrypt. MASTER_KEY here is different from the one used when this was saved." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ("title" in body) {
    const title = String(body.title || "").trim();
    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
    update.title = title;
  }
  if ("category" in body) update.category = String(body.category || "").trim() || "Other";
  if ("username" in body) update.username = body.username || "";
  if ("url" in body) update.url = body.url || "";
  if ("password" in body) update.encrypted_password = body.password ? encrypt(String(body.password)) : "";
  if ("notes" in body) update.encrypted_notes = body.notes ? encrypt(String(body.notes)) : "";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vault_entries")
    .update(update)
    .eq("id", id)
    .select("id, category, title, username, url, encrypted_notes, created_at, updated_at")
    .single();
  if (error) return fail(error);

  const { encrypted_notes, ...entry } = data;
  return NextResponse.json({ ...entry, has_notes: !!encrypted_notes });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase.from("vault_entries").delete().eq("id", id);
  if (error) return fail(error);
  return NextResponse.json({ ok: true });
}