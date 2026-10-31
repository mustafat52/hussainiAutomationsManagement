// One-time migration: local SQLite (data/agency.db + data/uploads) → Supabase.
//
//   Preview only (touches nothing):   npm run migrate -- --dry-run
//   Real run:                         npm run migrate
//
// Needs in .env.local:  NEXT_PUBLIC_SUPABASE_URL  and  SUPABASE_SERVICE_ROLE_KEY
// (the service-role key is used ONLY by this script, from your own computer.
//  Never put it on Vercel and never prefix it with NEXT_PUBLIC_.)
//
// Safe to re-run: rows are upserted by id, so nothing gets duplicated.
// Your SQLite file is opened read-only and never modified.

import { DatabaseSync } from "node:sqlite";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const dbArg = args.find((a) => a.startsWith("--db="));
const dbPath = path.resolve(dbArg ? dbArg.slice(5) : "data/agency.db");
const uploadsDir = path.join(path.dirname(dbPath), "uploads");
const BUCKET = "project-files";

if (!fs.existsSync(dbPath)) {
  console.error(`Could not find ${dbPath}\nRun this from the project root, or pass --db=path/to/agency.db`);
  process.exit(1);
}

const sqlite = new DatabaseSync(dbPath, { readOnly: true });
const all = (table) => {
  try {
    return sqlite.prepare(`SELECT * FROM ${table}`).all();
  } catch {
    return []; // table doesn't exist in an older database
  }
};

// SQLite stores "YYYY-MM-DD HH:MM:SS" in UTC. Postgres wants a proper timestamp.
const ts = (v) => (v ? (String(v).includes("T") ? String(v) : String(v).replace(" ", "T") + "Z") : new Date().toISOString());
const day = (v) => (v && /^\d{4}-\d{2}-\d{2}/.test(String(v)) ? String(v).slice(0, 10) : null);
const txt = (v) => (v == null ? "" : String(v));
const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const clients = all("clients").map((r) => ({
  id: r.id, name: txt(r.name), contact: txt(r.contact), status: txt(r.status) || "lead",
  notes: txt(r.notes), created_at: ts(r.created_at),
}));

const projects = all("projects").map((r) => ({
  id: r.id, client_id: r.client_id, name: txt(r.name), description: txt(r.description),
  status: txt(r.status) || "lead", tags: txt(r.tags),
  start_date: day(r.start_date), delivery_date: day(r.delivery_date),
  quoted_amount: n(r.quoted_amount), final_amount: n(r.final_amount),
  amount_collected: n(r.amount_collected), payment_status: txt(r.payment_status) || "unpaid",
  account_used: txt(r.account_used), repo_url: txt(r.repo_url), hosting: txt(r.hosting),
  architecture_notes: txt(r.architecture_notes), backend_notes: txt(r.backend_notes),
  maintenance_status: txt(r.maintenance_status) || "none", maintenance_amount: n(r.maintenance_amount),
  maintenance_cycle: txt(r.maintenance_cycle) || "monthly", maintenance_next_due: day(r.maintenance_next_due),
  maintenance_coverage: txt(r.maintenance_coverage),
  last_touched: ts(r.last_touched), created_at: ts(r.created_at),
}));

const credentials = all("credentials").map((r) => ({
  id: r.id, project_id: r.project_id, key_name: txt(r.key_name),
  encrypted_value: txt(r.encrypted_value), // copied as-is: still encrypted with your MASTER_KEY
  created_at: ts(r.created_at),
}));

const accounts = all("accounts").map((r) => ({ id: r.id, name: txt(r.name), color: txt(r.color) || "#565c70", created_at: ts(r.created_at) }));

const expenses = all("expenses").map((r) => ({
  id: r.id, description: txt(r.description), amount: n(r.amount), category: txt(r.category) || "general",
  expense_date: day(r.expense_date) || new Date().toISOString().slice(0, 10), created_at: ts(r.created_at),
}));

const settings = all("settings").map((r) => ({ key: txt(r.key), value: txt(r.value) }));

const fileRows = all("files");
const files = fileRows.map((r) => ({
  id: r.id, project_id: r.project_id, original_name: txt(r.original_name),
  storage_path: `${r.project_id}/${r.stored_name}`, size: n(r.size),
  mime_type: r.mime_type || "application/octet-stream", uploaded_at: ts(r.uploaded_at),
  _local: path.join(uploadsDir, r.project_id, r.stored_name),
}));

// ── Report what was found ────────────────────────────────────────────────
console.log(`\nSource: ${dbPath}${DRY ? "   (DRY RUN — nothing will be written)" : ""}\n`);
const found = { clients, projects, credentials, accounts, expenses, settings, files };
for (const [k, v] of Object.entries(found)) console.log(`  ${k.padEnd(12)} ${v.length}`);

const missingLocal = files.filter((f) => !fs.existsSync(f._local));
if (missingLocal.length) {
  console.log(`\n  ⚠ ${missingLocal.length} file(s) are listed in the database but missing on disk (they'll be skipped):`);
  missingLocal.forEach((f) => console.log(`    - ${f.original_name}`));
}

const clientIds = new Set(clients.map((c) => c.id));
const projectIds = new Set(projects.map((p) => p.id));
const orphanProjects = projects.filter((p) => !clientIds.has(p.client_id));
const orphanChildren = [...credentials, ...files].filter((r) => !projectIds.has(r.project_id));
if (orphanProjects.length || orphanChildren.length) {
  console.log(`\n  ⚠ ${orphanProjects.length} project(s) and ${orphanChildren.length} credential/file row(s) point at something that no longer exists; they'll be skipped.`);
}

if (DRY) {
  console.log("\nDry run finished. Run without --dry-run to migrate.\n");
  process.exit(0);
}

// ── Write to Supabase ────────────────────────────────────────────────────
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("\nMissing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function upsert(table, rows, onConflict = "id") {
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict });
    if (error) {
      console.error(`\n✗ ${table}: ${error.message}`);
      console.error("  Did you run supabase/schema.sql in the Supabase SQL editor first?");
      process.exit(1);
    }
  }
  console.log(`  ✓ ${table.padEnd(12)} ${rows.length}`);
}

console.log("\nMigrating...");
await upsert("clients", clients);
await upsert("projects", projects.filter((p) => clientIds.has(p.client_id)));
await upsert("credentials", credentials.filter((c) => projectIds.has(c.project_id)));
await upsert("accounts", accounts, "name");
await upsert("expenses", expenses);
await upsert("settings", settings, "key");

// Files: upload the bytes to Storage, then record the row.
let uploaded = 0;
const fileDbRows = [];
for (const f of files) {
  if (!projectIds.has(f.project_id) || !fs.existsSync(f._local)) continue;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(f.storage_path, fs.readFileSync(f._local), { contentType: f.mime_type, upsert: true });
  if (error) {
    console.error(`  ✗ upload failed for "${f.original_name}": ${error.message}`);
    continue;
  }
  uploaded++;
  const { _local, ...row } = f;
  fileDbRows.push(row);
}
if (fileDbRows.length) await upsert("files", fileDbRows);
console.log(`  ✓ files uploaded to storage: ${uploaded}/${files.length}`);

// ── Verify by counting what is now in Supabase ───────────────────────────
console.log("\nVerifying counts in Supabase:");
let ok = true;
for (const table of ["clients", "projects", "credentials", "accounts", "expenses", "settings", "files"]) {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
  const local = found[table].length;
  const good = !error && count >= local - (table === "files" ? missingLocal.length : 0);
  if (!good) ok = false;
  console.log(`  ${good ? "✓" : "✗"} ${table.padEnd(12)} local ${String(local).padStart(4)}  →  supabase ${error ? error.message : count}`);
}
console.log(ok ? "\nDone. Your data is in Supabase.\n" : "\nFinished, but some counts don't match — see above.\n");
