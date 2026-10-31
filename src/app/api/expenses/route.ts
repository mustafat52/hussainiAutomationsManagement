import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fail, num } from "@/lib/api";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) return fail(error);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .insert({
      description: body.description || "",
      amount: num(body.amount),
      category: body.category || "general",
      expense_date: body.expense_date || new Date().toISOString().slice(0, 10),
    })
    .select()
    .single();
  if (error) return fail(error);
  return NextResponse.json(data, { status: 201 });
}
