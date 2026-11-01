"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, TrendingUp, Layers, RefreshCw, Clock3, Wallet, Receipt, Pencil, Check } from "lucide-react";
import type { Project, Client, Account } from "@/lib/types";
import ProjectRow from "./components/ProjectRow";
import AddProjectModal from "./components/AddProjectModal";
import ExpensesModal from "./components/ExpensesModal";
import AppNav from "./components/AppNav";
import { useCountUp } from "@/lib/useCountUp";

function fmtMoney(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

function StatCard({
  icon,
  label,
  value,
  isMoney,
  accentColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  isMoney?: boolean;
  accentColor: string;
}) {
  const animated = useCountUp(value);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl p-3 md:p-4 min-w-0"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: accentColor }}>{icon}</span>
        <p className="text-xs mono uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{label}</p>
      </div>
      <p className="text-xl md:text-2xl font-medium mono" style={{ color: "var(--text-primary)" }}>
        {isMoney ? fmtMoney(animated) : Math.round(animated)}
      </p>
    </motion.div>
  );
}

function BalanceCard({ value, onSave }: { value: number; onSave: (n: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const animated = useCountUp(value);

  function startEdit() {
    setDraft(String(value));
    setEditing(true);
  }

  function commit() {
    const n = parseFloat(draft);
    if (!isNaN(n)) onSave(n);
    setEditing(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl p-3 md:p-4 min-w-0"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span style={{ color: "var(--gold)" }}><Wallet size={14} /></span>
          <p className="text-xs mono uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Bank balance</p>
        </div>
        <button onClick={editing ? commit : startEdit} style={{ color: "var(--text-muted)" }}>
          {editing ? <Check size={13} /> : <Pencil size={12} />}
        </button>
      </div>
      {editing ? (
        <input
          autoFocus
          type="number"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          onBlur={commit}
          className="text-xl md:text-2xl font-medium mono w-full outline-none bg-transparent"
          style={{ color: "var(--text-primary)" }}
        />
      ) : (
        <p className="text-xl md:text-2xl font-medium mono" style={{ color: "var(--text-primary)" }}>
          {"₹" + Math.round(animated).toLocaleString("en-IN")}
        </p>
      )}
    </motion.div>
  );
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [bankBalance, setBankBalance] = useState(0);
  const [showExpenses, setShowExpenses] = useState(false);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  const [loadError, setLoadError] = useState("");

  async function loadAll() {
    try {
      const [pRes, cRes, aRes, sRes] = await Promise.all([
        fetch("/api/projects"),
        fetch("/api/clients"),
        fetch("/api/accounts"),
        fetch("/api/settings"),
      ]);
      if ([pRes, cRes, aRes, sRes].some((r) => r.status === 401)) {
        window.location.href = "/login"; // session expired
        return;
      }
      if (![pRes, cRes, aRes, sRes].every((r) => r.ok)) {
        throw new Error("The server returned an error. Check your Supabase setup.");
      }
      setProjects(await pRes.json());
      setClients(await cRes.json());
      setAccounts(await aRes.json());
      const settings = await sRes.json();
      setBankBalance(parseFloat(settings.bank_balance) || 0);
      setLoadError("");
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load data.");
    } finally {
      setLoading(false);
    }
  }

  async function saveBankBalance(n: number) {
    setBankBalance(n);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "bank_balance", value: n }),
    });
  }

  async function loadAccounts() {
    const res = await fetch("/api/accounts");
    if (res.ok) setAccounts(await res.json());
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function deleteProject(id: string) {
    if (!confirm("Delete this project and all its stored data? This can't be undone.")) return;
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (!res.ok) alert("Could not delete the project.");
    loadAll();
  }

  const stats = useMemo(() => {
    const lifetimeEarnings = projects.reduce((sum, p) => sum + (p.amount_collected || 0), 0);
    const activeProjects = projects.filter((p) => p.status === "in_work" || p.status === "in_test").length;
    const mrr = projects
      .filter((p) => p.maintenance_on && (p.maintenance_amount || 0) > 0)
      .reduce((sum, p) => sum + (p.maintenance_amount || 0), 0);
    const pending = projects.reduce(
      (sum, p) => sum + Math.max((p.final_amount || p.quoted_amount || 0) - (p.amount_collected || 0), 0),
      0
    );
    return { lifetimeEarnings, activeProjects, mrr, pending };
  }, [projects]);

  const filtered = useMemo(() => {
    if (!search.trim()) return projects;
    const q = search.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.client_name.toLowerCase().includes(q) ||
        (p.tags || "").toLowerCase().includes(q) ||
        (p.account_used || "").toLowerCase().includes(q)
    );
  }, [projects, search]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <AppNav />

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl font-medium mono flex items-center">
            hussaini@automations
            <span className="cursor-blink ml-0.5" style={{ color: "var(--accent)" }}>_</span>
          </h1>
          <p className="text-sm mt-1 flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
            <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: "var(--success)" }} />
            Project command center · {projects.length} project{projects.length !== 1 ? "s" : ""} tracked
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExpenses(true)}
            className="text-sm flex items-center gap-1.5 px-3.5 py-2 rounded-md font-medium"
            style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
          >
            <Receipt size={15} /> Expenses
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="text-sm flex items-center gap-1.5 px-3.5 py-2 rounded-md font-medium transition-transform"
            style={{ background: "var(--accent)", color: "#0a0b0f" }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <Plus size={15} /> New project
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <BalanceCard value={bankBalance} onSave={saveBankBalance} />
        <StatCard icon={<TrendingUp size={14} />} label="Lifetime earnings" value={stats.lifetimeEarnings} isMoney accentColor="var(--gold)" />
        <StatCard icon={<Layers size={14} />} label="Active projects" value={stats.activeProjects} accentColor="var(--accent)" />
        <StatCard icon={<RefreshCw size={14} />} label="MRR (maintenance)" value={stats.mrr} isMoney accentColor="var(--success)" />
        <StatCard icon={<Clock3 size={14} />} label="Pending payments" value={stats.pending} isMoney accentColor="var(--warning)" />
      </div>

      <div className="mb-4 relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
        <input
          placeholder="Search client, project, tag, or account..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-sm pl-9 pr-3 py-2.5 rounded-lg outline-none transition-shadow"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-glow)")}
          onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
        />
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
        {loading ? (
          <p className="p-6 text-sm mono" style={{ color: "var(--text-muted)" }}>Loading...</p>
        ) : loadError ? (
          <p className="p-6 text-sm" style={{ color: "var(--danger)" }}>{loadError}</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm" style={{ color: "var(--text-muted)" }}>
            {projects.length === 0 ? "No projects yet. Add your first one to get started." : "No matches."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full md:min-w-[900px]">
              <thead>
                <tr style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
                  <th className="px-3 py-2.5 text-left text-xs font-normal mono uppercase tracking-wide w-8"></th>
                  <th className="px-2 md:px-3 py-2.5 text-left text-xs font-normal mono uppercase tracking-wide">Client</th>
                  <th className="px-3 py-2.5 text-left text-xs font-normal mono uppercase tracking-wide hidden md:table-cell">Project</th>
                  <th className="px-1 md:px-3 py-2.5 text-left text-xs font-normal mono uppercase tracking-wide">Status</th>
                  <th className="px-2 md:px-3 py-2.5 text-left text-xs font-normal mono uppercase tracking-wide">Received</th>
                  <th className="px-3 py-2.5 text-left text-xs font-normal mono uppercase tracking-wide hidden md:table-cell">Maintenance</th>
                  <th className="px-3 py-2.5 text-left text-xs font-normal mono uppercase tracking-wide hidden md:table-cell">Account</th>
                  <th className="px-3 py-2.5 text-left text-xs font-normal mono uppercase tracking-wide hidden md:table-cell">Last touched</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <ProjectRow
                    key={p.id}
                    project={p}
                    index={i}
                    accounts={accounts}
                    onAccountsRefresh={loadAccounts}
                    onUpdate={loadAll}
                    onDelete={() => deleteProject(p.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAdd && (
          <AddProjectModal
            clients={clients}
            accounts={accounts}
            onAccountsRefresh={loadAccounts}
            onClose={() => setShowAdd(false)}
            onCreated={loadAll}
          />
        )}
        {showExpenses && <ExpensesModal onClose={() => setShowExpenses(false)} />}
      </AnimatePresence>
    </div>
  );
}