import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";
import { fail } from "@/lib/api";

const LIST_COLUMNS = "id, category, title, username, url, encrypted_notes, created_at, updated_at";

// List for display. Passwords are never returned here; has_notes only says whether notes exist.
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vault_entries")
    .select(LIST_COLUMNS)
    .order("category", { ascending: true })
    .order("title", { ascending: true });
  if (error) return fail(error);

  return NextResponse.json(
    (data || []).map(({ encrypted_notes, ...e }) => ({ ...e, has_notes: !!encrypted_notes }))
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const title = String(body.title || "").trim();
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vault_entries")
    .insert({
      category: String(body.category || "").trim() || "Other",
      title,
      username: body.username || "",
      url: body.url || "",
      encrypted_password: body.password ? encrypt(String(body.password)) : "",
      encrypted_notes: body.notes ? encrypt(String(body.notes)) : "",
    })
    .select(LIST_COLUMNS)
    .single();
  if (error) return fail(error);

  const { encrypted_notes, ...entry } = data;
  return NextResponse.json({ ...entry, has_notes: !!encrypted_notes }, { status: 201 });
}