import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fail, num } from "@/lib/api";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

type Joined = {
  id: string;
  name: string;
  maintenance_amount: number;
  created_at: string;
  clients: { id: string; name: string; contact: string } | null;
};

// GET /api/maintenance?month=2026-11
// Every project with a maintenance amount, plus whether this month's payment has been received.
export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month") || "";
  if (!MONTH_RE.test(month)) {
    return NextResponse.json({ error: "month must look like 2026-11" }, { status: 400 });
  }

  const supabase = await createClient();

  const [projRes, payRes] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, maintenance_amount, created_at, clients(id, name, contact)")
      .gt("maintenance_amount", 0)
      .not("maintenance_status", "in", "(paused,ended)"),
    supabase
      .from("maintenance_payments")
      .select("id, project_id, amount, received_at, projects(id, name, maintenance_amount, created_at, clients(id, name, contact))")
      .eq("month", month),
  ]);
  if (projRes.error) return fail(projRes.error);
  if (payRes.error) return fail(payRes.error);

  const payments = new Map((payRes.data || []).map((p) => [p.project_id, p]));

  // A project owes maintenance for a month only if it existed by then.
  const eligible = ((projRes.data || []) as unknown as Joined[]).filter((p) => p.created_at.slice(0, 7) <= month);
  const seen = new Set<string>();

  const items = eligible.map((p) => {
    seen.add(p.id);
    const pay = payments.get(p.id);
    return {
      project_id: p.id,
      project_name: p.name,
      client_name: p.clients?.name ?? "",
      contact: p.clients?.contact ?? "",
      expected_amount: p.maintenance_amount,
      amount: pay ? pay.amount : p.maintenance_amount,
      received_at: pay?.received_at ?? null,
    };
  });

  // Already-received payments for projects that no longer qualify (e.g. amount later set to 0) still show up as received.
  for (const pay of payRes.data || []) {
    if (seen.has(pay.project_id)) continue;
    const p = pay.projects as unknown as Joined | null;
    items.push({
      project_id: pay.project_id,
      project_name: p?.name ?? "(deleted project)",
      client_name: p?.clients?.name ?? "",
      contact: p?.clients?.contact ?? "",
      expected_amount: p?.maintenance_amount ?? pay.amount,
      amount: pay.amount,
      received_at: pay.received_at,
    });
  }

  items.sort((a, b) => a.client_name.localeCompare(b.client_name) || a.project_name.localeCompare(b.project_name));
  return NextResponse.json({ month, items });
}

// POST { project_id, month, amount? } → mark this month's maintenance as received.
export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.project_id || !MONTH_RE.test(body.month || "")) {
    return NextResponse.json({ error: "project_id and month (YYYY-MM) required" }, { status: 400 });
  }
  const supabase = await createClient();

  let amount = num(body.amount);
  if (!amount) {
    const { data: p } = await supabase.from("projects").select("maintenance_amount").eq("id", body.project_id).maybeSingle();
    amount = p?.maintenance_amount ?? 0;
  }

  const { data, error } = await supabase
    .from("maintenance_payments")
    .upsert(
      { project_id: body.project_id, month: body.month, amount, received_at: new Date().toISOString() },
      { onConflict: "project_id,month" }
    )
    .select()
    .single();
  if (error) return fail(error);

  return NextResponse.json(data, { status: 201 });
}

// DELETE ?project_id=...&month=2026-11 → undo "received".
export async function DELETE(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("project_id");
  const month = req.nextUrl.searchParams.get("month") || "";
  if (!projectId || !MONTH_RE.test(month)) {
    return NextResponse.json({ error: "project_id and month required" }, { status: 400 });
  }
  const supabase = await createClient();

  const { error } = await supabase.from("maintenance_payments").delete().eq("project_id", projectId).eq("month", month);
  if (error) return fail(error);
  return NextResponse.json({ ok: true });
}