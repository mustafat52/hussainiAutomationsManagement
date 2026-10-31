"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import type { Client, Account } from "@/lib/types";
import AccountSelect from "./AccountSelect";
import { PROJECT_STATUSES, statusStyle } from "./StatusBadge";

export default function AddProjectModal({
  clients,
  accounts,
  onAccountsRefresh,
  onClose,
  onCreated,
}: {
  clients: Client[];
  accounts: Account[];
  onAccountsRefresh: () => void;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [clientMode, setClientMode] = useState<"existing" | "new">(
    clients.length ? "existing" : "new"
  );
  const [clientId, setClientId] = useState(clients[0]?.id || "");
  const [newClientName, setNewClientName] = useState("");
  const [newClientContact, setNewClientContact] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("lead");
  const [quoted, setQuoted] = useState("");
  const [accountUsed, setAccountUsed] = useState("");
  const [hosting, setHosting] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const inputStyle = {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
  };

  async function submit() {
    setError("");
    if (clientMode === "new" && !newClientName.trim()) {
      setError("Enter a client name.");
      return;
    }
    if (clientMode === "existing" && !clientId) {
      setError("Pick a client.");
      return;
    }
    if (!name.trim()) {
      setError("Enter a project name.");
      return;
    }

    setSaving(true);
    try {
      let finalClientId = clientId;

      if (clientMode === "new") {
        const res = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newClientName, contact: newClientContact, status: "active" }),
        });
        const client = await res.json();
        if (!res.ok) throw new Error(client.error || "Could not create client.");
        finalClientId = client.id;
      }

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: finalClientId,
          name,
          description,
          status,
          quoted_amount: parseFloat(quoted) || 0,
          account_used: accountUsed,
          hosting,
          start_date: startDate || null,
          delivery_date: endDate || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not create project.");
      }

      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  // Don't throw away a half-filled form because of a stray tap outside the box.
  const hasInput = !!(name || description || newClientName || newClientContact || quoted || hosting);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-end sm:items-center justify-center z-50 sm:p-4"
      style={{ background: "rgba(5,6,9,0.7)", backdropFilter: "blur(4px)" }}
      onClick={() => !hasInput && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        // Header and footer stay fixed; only the middle scrolls, so "Create project" is always reachable.
        className="rounded-t-xl sm:rounded-xl w-full max-w-md max-h-[92dvh] sm:max-h-[90dvh] flex flex-col"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 sm:px-6 pt-5 pb-4 shrink-0">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <Sparkles size={17} style={{ color: "var(--accent)" }} /> New project
          </h2>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-6 pb-4 space-y-3">
          <div>
            <label className="text-xs mono uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Client</label>
            <div className="flex gap-2 mt-1.5 mb-2">
              <button
                onClick={() => setClientMode("existing")}
                className="text-xs px-2.5 py-1 rounded-md"
                style={{
                  border: "1px solid var(--border)",
                  background: clientMode === "existing" ? "var(--accent-dim)" : "transparent",
                  color: clientMode === "existing" ? "var(--accent)" : "var(--text-secondary)",
                  opacity: clients.length === 0 ? 0.4 : 1,
                }}
                disabled={clients.length === 0}
              >
                Existing
              </button>
              <button
                onClick={() => setClientMode("new")}
                className="text-xs px-2.5 py-1 rounded-md"
                style={{
                  border: "1px solid var(--border)",
                  background: clientMode === "new" ? "var(--accent-dim)" : "transparent",
                  color: clientMode === "new" ? "var(--accent)" : "var(--text-secondary)",
                }}
              >
                New client
              </button>
            </div>

            {clientMode === "existing" ? (
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full text-sm px-2.5 py-2 rounded-md"
                style={inputStyle}
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            ) : (
              <div className="space-y-2">
                <input
                  placeholder="Client name"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full text-sm px-2.5 py-2 rounded-md"
                  style={inputStyle}
                />
                <input
                  placeholder="Contact (email/phone)"
                  value={newClientContact}
                  onChange={(e) => setNewClientContact(e.target.value)}
                  className="w-full text-sm px-2.5 py-2 rounded-md"
                  style={inputStyle}
                />
              </div>
            )}
          </div>

          <div>
            <label className="text-xs mono uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Project name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm px-2.5 py-2 rounded-md mt-1.5"
              style={inputStyle}
            />
          </div>

          <div>
            <label className="text-xs mono uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full text-sm px-2.5 py-2 rounded-md mt-1.5"
              style={inputStyle}
            >
              {PROJECT_STATUSES.map((st) => (
                <option key={st} value={st}>{statusStyle(st).label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs mono uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full text-sm px-2.5 py-2 rounded-md mt-1.5"
              style={inputStyle}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-xs mono uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Quoted (₹)</label>
              <input
                type="number"
                inputMode="decimal"
                value={quoted}
                onChange={(e) => setQuoted(e.target.value)}
                className="w-full text-sm px-2.5 py-2 rounded-md mt-1.5"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs mono uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Account used</label>
              <div className="mt-1.5">
                <AccountSelect
                  accounts={accounts}
                  value={accountUsed}
                  onChange={setAccountUsed}
                  onAccountsRefresh={onAccountsRefresh}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs mono uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Hosting</label>
            <input
              placeholder="Vercel + Supabase"
              value={hosting}
              onChange={(e) => setHosting(e.target.value)}
              className="w-full text-sm px-2.5 py-2 rounded-md mt-1.5"
              style={inputStyle}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs mono uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-sm px-2.5 py-2 rounded-md mt-1.5"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs mono uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>End date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-sm px-2.5 py-2 rounded-md mt-1.5"
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        <div
          className="shrink-0 px-5 sm:px-6 py-4 flex items-center gap-3"
          style={{ borderTop: "1px solid var(--border)", paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <p className="flex-1 text-xs min-w-0" style={{ color: "var(--danger)" }} role="alert">
            {error}
          </p>
          <button onClick={onClose} className="text-sm px-3.5 py-2 rounded-md" style={{ border: "1px solid var(--border)" }}>
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="text-sm px-3.5 py-2 rounded-md font-medium whitespace-nowrap"
            style={{ background: "var(--accent)", color: "#0a0b0f", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Creating..." : "Create project"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
