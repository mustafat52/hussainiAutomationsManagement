"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Trash2, Plus, KeyRound } from "lucide-react";
import type { CredentialMeta } from "@/lib/types";

export default function CredentialsPanel({ projectId }: { projectId: string }) {
  const [creds, setCreds] = useState<CredentialMeta[]>([]);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [adding, setAdding] = useState(false);

  async function load() {
    const res = await fetch(`/api/credentials?project_id=${projectId}`);
    if (res.ok) setCreds(await res.json());
  }

  useEffect(() => {
    load();
  }, [projectId]);

  async function reveal(id: string) {
    if (revealed[id]) {
      setRevealed((r) => {
        const next = { ...r };
        delete next[id];
        return next;
      });
      return;
    }
    const res = await fetch(`/api/credentials/${id}`);
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Could not reveal this key.");
      return;
    }
    setRevealed((r) => ({ ...r, [id]: data.value }));
  }

  async function remove(id: string) {
    await fetch(`/api/credentials/${id}`, { method: "DELETE" });
    load();
  }

  async function add() {
    if (!newKey.trim() || !newValue.trim()) return;
    await fetch("/api/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId, key_name: newKey, value: newValue }),
    });
    setNewKey("");
    setNewValue("");
    setAdding(false);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs flex items-center gap-1.5 mono uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          <KeyRound size={13} /> Credentials vault
        </p>
        <button
          onClick={() => setAdding((a) => !a)}
          className="text-xs flex items-center gap-1 px-2 py-1 rounded-md transition-colors"
          style={{ color: "var(--accent)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-dim)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <Plus size={13} /> {adding ? "Cancel" : "Add key"}
        </button>
      </div>

      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2 mb-3">
              <input
                placeholder="KEY_NAME"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-md flex-1 mono"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
              />
              <input
                placeholder="value"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-md flex-1 mono"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
              />
              <button
                onClick={add}
                className="text-xs px-3 py-1.5 rounded-md font-medium"
                style={{ background: "var(--accent)", color: "#0a0b0f" }}
              >
                Save
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {creds.length === 0 && !adding && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>No keys stored yet.</p>
      )}

      <div className="space-y-1">
        {creds.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-md"
            style={{ background: "var(--surface-2)" }}
          >
            <span className="mono truncate min-w-0" style={{ color: "var(--text-primary)" }}>{c.key_name}</span>
            <div className="flex items-center gap-3 shrink-0 ml-2 min-w-0">
              <span className="mono truncate max-w-[40vw] sm:max-w-none" style={{ color: "var(--text-secondary)" }}>
                {revealed[c.id] || "••••••••••"}
              </span>
              <button onClick={() => reveal(c.id)} style={{ color: "var(--accent)" }} className="flex items-center">
                {revealed[c.id] ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button onClick={() => remove(c.id)} style={{ color: "var(--danger)" }} className="flex items-center">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
