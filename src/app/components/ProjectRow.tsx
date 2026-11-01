"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Pencil, Trash2, Save, X } from "lucide-react";
import type { Project, Account } from "@/lib/types";
import StatusSelect from "./StatusSelect";
import CredentialsPanel from "./CredentialsPanel";
import FilesPanel from "./FilesPanel";
import AccountBadge from "./AccountBadge";
import AccountSelect from "./AccountSelect";

// Only these can be changed from the Edit form (status has its own dropdown in the row).
const EDITABLE_KEYS: (keyof Project)[] = [
  "description", "account_used", "hosting", "repo_url", "start_date", "delivery_date",
  "quoted_amount", "final_amount", "amount_collected", "maintenance_amount", "backend_notes",
];

function formatLastTouched(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtMoney(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

function cycleAbbrev(cycle: string) {
  if (cycle === "quarterly") return "/qtr";
  if (cycle === "yearly") return "/yr";
  return "/mo";
}

function MaintenanceSwitch({ on, onChange }: { on: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="Include in Maintenance screen"
      title={on ? "On: shown on the Maintenance screen" : "Off: hidden from the Maintenance screen"}
      onClick={(e) => { e.stopPropagation(); onChange(!on); }}
      className="relative inline-flex items-center shrink-0 rounded-full transition-colors"
      style={{ width: 34, height: 20, background: on ? "var(--success)" : "var(--surface-2)", border: "1px solid var(--border)" }}
    >
      <span
        className="absolute rounded-full transition-all"
        style={{ width: 14, height: 14, top: 2, left: on ? 16 : 2, background: on ? "#0a0b0f" : "var(--text-muted)" }}
      />
    </button>
  );
}

export default function ProjectRow({
  project,
  index = 0,
  accounts,
  onAccountsRefresh,
  onUpdate,
  onDelete,
}: {
  project: Project;
  index?: number;
  accounts: Account[];
  onAccountsRefresh: () => void;
  onUpdate: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(project);
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setForm(project); // always start from the latest saved values
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    try {
      const diff: Record<string, unknown> = {};
      EDITABLE_KEYS.forEach((k) => {
        if (form[k] !== project[k]) diff[k] = form[k];
      });
      if (Object.keys(diff).length > 0) {
        const res = await fetch(`/api/projects/${project.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(diff),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          alert(data.error || "Could not save changes.");
          return;
        }
        onUpdate();
      }
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(status: string) {
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      alert("Could not update status.");
      return;
    }
    onUpdate();
  }

  async function toggleMaintenance(next: boolean) {
    if (next && !(project.maintenance_amount > 0)) {
      alert("Set a maintenance amount first: open this project, tap Edit, fill in \"Maintenance / month\", then switch it on.");
      return;
    }
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ maintenance_on: next }),
    });
    if (!res.ok) {
      alert("Could not change maintenance. Have you run the add-maintenance-toggle.sql step?");
      return;
    }
    onUpdate();
  }

  const field = (label: string, key: keyof Project, type: "text" | "number" | "textarea" | "date" = "text", full = false) => (
    <div className={full ? "sm:col-span-2" : ""}>
      <p className="text-xs mb-1 mono uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{label}</p>
      {key === "account_used" ? (
        editing ? (
          <AccountSelect
            accounts={accounts}
            value={(form.account_used as string) || ""}
            onChange={(name) => setForm({ ...form, account_used: name })}
            onAccountsRefresh={onAccountsRefresh}
          />
        ) : (
          <AccountBadge
            name={project.account_used}
            color={accounts.find((a) => a.name === project.account_used)?.color}
          />
        )
      ) : editing ? (
        type === "textarea" ? (
          <textarea
            value={(form[key] as string) || ""}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            rows={2}
            className="w-full text-sm px-2.5 py-1.5 rounded-md"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          />
        ) : (
          <input
            type={type}
            inputMode={type === "number" ? "decimal" : undefined}
            value={(form[key] as string | number) ?? ""}
            onChange={(e) =>
              setForm({ ...form, [key]: type === "number" ? parseFloat(e.target.value) || 0 : e.target.value })
            }
            className="w-full text-sm px-2.5 py-1.5 rounded-md"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          />
        )
      ) : (
        <p className={`text-sm ${type !== "number" && key !== "description" ? "mono" : ""}`} style={{ color: "var(--text-primary)" }}>
          {type === "number" ? fmtMoney((project[key] as number) || 0) : (project[key] as string) || "—"}
        </p>
      )}
    </div>
  );

  return (
    <>
      <motion.tr
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: Math.min(index * 0.04, 0.3) }}
        className="border-t cursor-pointer transition-colors"
        style={{ borderColor: "var(--border)" }}
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <td className="pl-3 pr-1 md:px-3 py-3">
          <motion.div animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.15 }} style={{ color: "var(--text-muted)" }}>
            <ChevronRight size={15} />
          </motion.div>
        </td>
        <td className="px-2 md:px-3 py-3 text-sm font-medium">
          {project.client_name}
          {/* On a phone the project name sits under the client, so the table fits the screen. */}
          <span className="block md:hidden text-xs font-normal mt-0.5" style={{ color: "var(--text-muted)" }}>{project.name}</span>
        </td>
        <td className="px-3 py-3 text-sm hidden md:table-cell">{project.name}</td>
        <td className="px-1 md:px-3 py-3"><StatusSelect value={project.status} onChange={changeStatus} /></td>
        <td className="px-2 md:px-3 py-3 text-sm mono" style={{ color: "var(--gold)" }}>
          {fmtMoney(project.amount_collected)}
          {project.amount_collected < (project.final_amount || project.quoted_amount) && (
            <span className="block md:inline text-xs md:text-sm" style={{ color: "var(--text-muted)" }}>
              <span className="hidden md:inline"> / </span>
              <span className="md:hidden">of </span>
              {fmtMoney(project.final_amount || project.quoted_amount)}
            </span>
          )}
        </td>
        <td className="px-3 py-3 text-sm hidden md:table-cell">
          <div className="flex items-center gap-2.5">
            <MaintenanceSwitch on={project.maintenance_on} onChange={toggleMaintenance} />
            {project.maintenance_amount > 0 ? (
              <span
                className="mono"
                style={{ color: project.maintenance_on ? "var(--success)" : "var(--text-muted)", opacity: project.maintenance_on ? 1 : 0.7 }}
              >
                {fmtMoney(project.maintenance_amount)}{cycleAbbrev(project.maintenance_cycle)}
              </span>
            ) : (
              <span style={{ color: "var(--text-muted)" }}>—</span>
            )}
          </div>
        </td>
        <td className="px-3 py-3 hidden md:table-cell">
          <AccountBadge
            name={project.account_used}
            color={accounts.find((a) => a.name === project.account_used)?.color}
            size={18}
          />
        </td>
        <td className="px-3 py-3 text-sm hidden md:table-cell" style={{ color: "var(--text-secondary)" }}>
          {formatLastTouched(project.last_touched)}
        </td>
      </motion.tr>

      <AnimatePresence>
        {open && (
          <tr>
            <td colSpan={8} className="p-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                style={{ overflow: "hidden", background: "var(--surface-2)" }}
              >
                <div className="px-4 sm:px-6 py-5" onClick={(e) => e.stopPropagation()}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                    {field("Description", "description", "textarea", true)}
                    {field("Account used", "account_used")}
                    {field("Hosting", "hosting")}
                    {field("Repo URL", "repo_url")}
                    {field("Start date", "start_date", "date")}
                    {field("End date", "delivery_date", "date")}
                    {field("Quoted amount", "quoted_amount", "number")}
                    {field("Final amount", "final_amount", "number")}
                    {field("Amount collected", "amount_collected", "number")}
                    {field("Maintenance / month", "maintenance_amount", "number")}
                    <div>
                      <p className="text-xs mb-1 mono uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Maintenance billing</p>
                      <div className="flex items-center gap-2.5 h-[30px]">
                        <MaintenanceSwitch on={project.maintenance_on} onChange={toggleMaintenance} />
                        <span className="text-sm" style={{ color: project.maintenance_on ? "var(--success)" : "var(--text-muted)" }}>
                          {project.maintenance_on ? "On: shown on Maintenance screen" : "Off: hidden"}
                        </span>
                      </div>
                    </div>
                    {field("Backend notes", "backend_notes", "textarea", true)}
                  </div>

                  <div className="mt-5 pt-5" style={{ borderTop: "1px solid var(--border)" }}>
                    <FilesPanel projectId={project.id} />
                  </div>

                  <div className="mt-5 pt-5" style={{ borderTop: "1px solid var(--border)" }}>
                    <CredentialsPanel projectId={project.id} />
                  </div>

                  <div className="flex justify-between items-center mt-5 pt-5" style={{ borderTop: "1px solid var(--border)" }}>
                    <button
                      onClick={onDelete}
                      className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md"
                      style={{ color: "var(--danger)" }}
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                    <div className="flex gap-2">
                      {editing ? (
                        <>
                          <button
                            onClick={() => { setEditing(false); setForm(project); }}
                            className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md"
                            style={{ border: "1px solid var(--border)" }}
                          >
                            <X size={13} /> Cancel
                          </button>
                          <button
                            onClick={save}
                            disabled={saving}
                            className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium"
                            style={{ background: "var(--accent)", color: "#0a0b0f" }}
                          >
                            <Save size={13} /> {saving ? "Saving..." : "Save"}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={startEdit}
                          className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md"
                          style={{ border: "1px solid var(--border)" }}
                        >
                          <Pencil size={13} /> Edit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}