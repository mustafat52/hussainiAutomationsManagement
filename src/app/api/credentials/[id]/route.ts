import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { fail } from "@/lib/api";

// Returns the decrypted value — only called when the user explicitly clicks "reveal".
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("credentials")
    .select("encrypted_value")
    .eq("id", id)
    .maybeSingle();
  if (error) return fail(error);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    return NextResponse.json({ value: decrypt(data.encrypted_value) });
  } catch {
    return NextResponse.json(
      { error: "Could not decrypt. MASTER_KEY here is different from the one used when this was saved." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase.from("credentials").delete().eq("id", id);
  if (error) return fail(error);
  return NextResponse.json({ ok: true });
}
