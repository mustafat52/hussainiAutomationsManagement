import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fail, nullIfEmpty, num } from "@/lib/api";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*, clients(name, status)")
    .order("last_touched", { ascending: false });
  if (error) return fail(error);

  // Flatten the joined client so the UI keeps getting client_name / client_status.
  const projects = (data || []).map(({ clients, ...p }) => ({
    ...p,
    client_name: clients?.name ?? "",
    client_status: clients?.status ?? "",
  }));
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.client_id) return NextResponse.json({ error: "client_id required" }, { status: 400 });
  if (!String(body.name || "").trim()) return NextResponse.json({ error: "Project name is required" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      client_id: body.client_id,
      name: String(body.name).trim(),
      description: body.description || "",
      status: body.status || "lead",
      tags: body.tags || "",
      start_date: nullIfEmpty(body.start_date),
      delivery_date: nullIfEmpty(body.delivery_date),
      quoted_amount: num(body.quoted_amount),
      final_amount: num(body.final_amount),
      amount_collected: num(body.amount_collected),
      payment_status: body.payment_status || "unpaid",
      account_used: body.account_used || "",
      repo_url: body.repo_url || "",
      hosting: body.hosting || "",
      architecture_notes: body.architecture_notes || "",
      backend_notes: body.backend_notes || "",
      maintenance_status: body.maintenance_status || "none",
      maintenance_amount: num(body.maintenance_amount),
      maintenance_on: body.maintenance_on === true,
      maintenance_cycle: body.maintenance_cycle || "monthly",
      maintenance_next_due: nullIfEmpty(body.maintenance_next_due),
      maintenance_coverage: body.maintenance_coverage || "",
    })
    .select()
    .single();
  if (error) return fail(error);
  return NextResponse.json(data, { status: 201 });
}