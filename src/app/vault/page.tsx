"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Eye, EyeOff, Copy, Check, Pencil, Trash2, X, Lock, KeyRound, ExternalLink } from "lucide-react";
import AppNav from "../components/AppNav";
import type { VaultEntry } from "@/lib/types";

const REVEAL_SECONDS = 30;

type Secrets = { password: string; notes: string };

function openUrl(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/* ───────────────────────── Add / edit sheet (name + password only) ───────────────────────── */

function EntryModal({
  entry,
  onClose,
  onSaved,
}: {
  entry: VaultEntry | null; // null = adding
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(entry?.title || "");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loadingPw, setLoadingPw] = useState(!!entry);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // When editing, load the saved password so you can see / change it.
  useEffect(() => {
    if (!entry) return;
    fetch(`/api/vault/${entry.id}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Could not load this entry.");
        setPassword(d.password);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingPw(false));
  }, [entry]);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("Enter a name.");
      return;
    }
    if (!password) {
      setError("Enter a password.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(entry ? `/api/vault/${entry.id}` : "/api/vault", {
        method: entry ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        // Only these two fields are sent, so anything saved earlier (site, notes…) is left untouched.
        body: JSON.stringify({ title: title.trim(), password }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Could not save.");
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = { background: "var(--surface-2)", border: "1px solid var(--border)" };
  const label = "text-xs mono uppercase tracking-wide";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-end sm:items-center justify-center z-50 sm:p-4"
      style={{ background: "rgba(5,6,9,0.7)", backdropFilter: "blur(4px)" }}
      onClick={() => !title && !password && onClose()}
    >
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="rounded-t-xl sm:rounded-xl w-full max-w-sm p-5 sm:p-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <KeyRound size={17} style={{ color: "var(--accent)" }} /> {entry ? "Edit entry" : "New entry"}
          </h2>
          <button type="button" onClick={onClose} style={{ color: "var(--text-muted)" }} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className={label} style={{ color: "var(--text-muted)" }}>Name</label>
            <input
              autoFocus
              placeholder="e.g. HDFC NetBanking"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-base sm:text-sm px-2.5 py-2 rounded-md mt-1.5"
              style={inputStyle}
            />
          </div>
          <div>
            <label className={label} style={{ color: "var(--text-muted)" }}>Password</label>
            <div className="relative mt-1.5">
              <input
                type={showPw ? "text" : "password"}
                autoComplete="off"
                autoCapitalize="none"
                value={loadingPw ? "" : password}
                placeholder={loadingPw ? "Loading..." : ""}
                disabled={loadingPw}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-base sm:text-sm pl-2.5 pr-9 py-2 rounded-md mono"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2"
                style={{ color: "var(--text-muted)" }}
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        </div>

        <p className="text-xs mt-3 min-h-4" style={{ color: "var(--danger)" }} role="alert">{error}</p>

        <div className="flex justify-end gap-2 mt-3">
          <button type="button" onClick={onClose} className="text-sm px-3.5 py-2 rounded-md" style={{ border: "1px solid var(--border)" }}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || loadingPw}
            className="text-sm px-4 py-2 rounded-md font-medium"
            style={{ background: "var(--accent)", color: "#0a0b0f", opacity: saving || loadingPw ? 0.7 : 1 }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

/* ───────────────────────────── Page ───────────────────────────── */

export default function VaultPage() {
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<VaultEntry | null | "new">(null);

  const [revealed, setRevealed] = useState<Record<string, Secrets>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [copied, setCopied] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/vault");
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load the vault.");
      setEntries(data);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the vault.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = timers.current;
    return () => Object.values(t).forEach(clearTimeout);
  }, []);

  async function fetchSecrets(id: string): Promise<Secrets | null> {
    const res = await fetch(`/api/vault/${id}`);
    const d = await res.json();
    if (!res.ok) {
      alert(d.error || "Could not open this entry.");
      return null;
    }
    return d;
  }

  function hide(id: string) {
    clearTimeout(timers.current[id]);
    setRevealed((r) => {
      const next = { ...r };
      delete next[id];
      return next;
    });
  }

  async function toggleReveal(id: string) {
    if (revealed[id]) return hide(id);
    const s = await fetchSecrets(id);
    if (!s) return;
    setRevealed((r) => ({ ...r, [id]: s }));
    timers.current[id] = setTimeout(() => hide(id), REVEAL_SECONDS * 1000); // auto-hide
  }

  async function copy(key: string, getText: () => Promise<string | null> | string | null) {
    const value = await getText();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      alert("Could not copy automatically. Use the eye icon to show it and copy manually.");
    }
  }

  async function remove(e: VaultEntry) {
    if (!confirm(`Delete “${e.title}”? This can't be undone.`)) return;
    const res = await fetch(`/api/vault/${e.id}`, { method: "DELETE" });
    if (!res.ok) alert("Could not delete.");
    load();
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries
      .filter((e) => !q || e.title.toLowerCase().includes(q) || e.username.toLowerCase().includes(q))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [entries, search]);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <AppNav />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-medium mono">Personal vault</h1>
          <p className="text-sm mt-1 flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
            <Lock size={12} className="shrink-0" />
            <span>{`${entries.length} ${entries.length === 1 ? "entry" : "entries"} · passwords stored encrypted`}</span>
          </p>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="text-sm flex items-center gap-1.5 px-3.5 py-2 rounded-md font-medium"
          style={{ background: "var(--accent)", color: "#0a0b0f" }}
        >
          <Plus size={15} /> New entry
        </button>
      </div>

      {entries.length > 4 && (
        <div className="mb-4 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-base sm:text-sm pl-9 pr-3 py-2.5 rounded-lg outline-none"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          />
        </div>
      )}

      {loading ? (
        <p className="text-sm mono" style={{ color: "var(--text-muted)" }}>Loading...</p>
      ) : error ? (
        <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>
      ) : entries.length === 0 ? (
        <div className="rounded-xl p-6 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
          Nothing saved yet. Tap “New entry” and add a name and password.
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No matches.</p>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
          {filtered.map((e, idx) => {
            const s = revealed[e.id];
            return (
              <div key={e.id} className="px-4 py-3.5" style={{ borderTop: idx === 0 ? "none" : "1px solid var(--border)" }}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium min-w-0 truncate">{e.title}</p>
                  <div className="flex items-center gap-4 shrink-0">
                    <button onClick={() => setEditing(e)} style={{ color: "var(--text-muted)" }} aria-label="Edit">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => remove(e)} style={{ color: "var(--danger)" }} aria-label="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2 text-sm">
                  <span className="mono truncate min-w-0 flex-1" style={{ color: "var(--text-secondary)" }}>
                    {s ? s.password || "(empty)" : "••••••••••"}
                  </span>
                  <button onClick={() => toggleReveal(e.id)} style={{ color: "var(--accent)" }} aria-label={s ? "Hide" : "Reveal"} className="shrink-0 p-1">
                    {s ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    onClick={() => copy(`p-${e.id}`, async () => (await fetchSecrets(e.id))?.password ?? null)}
                    style={{ color: "var(--accent)" }}
                    aria-label="Copy password"
                    className="shrink-0 p-1"
                  >
                    {copied === `p-${e.id}` ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>

                {/* Entries saved before the form was simplified keep their extra details visible. */}
                {(e.username || e.url) && (
                  <div className="mt-2 space-y-1 text-xs" style={{ color: "var(--text-muted)" }}>
                    {e.username && (
                      <p className="flex items-center gap-2 min-w-0">
                        <span className="shrink-0">User</span>
                        <span className="mono truncate" style={{ color: "var(--text-secondary)" }}>{e.username}</span>
                        <button onClick={() => copy(`u-${e.id}`, () => e.username)} style={{ color: "var(--accent)" }} aria-label="Copy username" className="shrink-0">
                          {copied === `u-${e.id}` ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </p>
                    )}
                    {e.url && (
                      <a href={openUrl(e.url)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 min-w-0" style={{ color: "var(--accent)" }}>
                        <span className="truncate">{e.url}</span> <ExternalLink size={11} className="shrink-0" />
                      </a>
                    )}
                  </div>
                )}

                <AnimatePresence>
                  {s && e.has_notes && (
                    <motion.p
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="text-xs whitespace-pre-wrap mt-2 rounded-md px-2.5 py-2 overflow-hidden"
                      style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}
                    >
                      {s.notes}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {editing && (
          <EntryModal
            key={editing === "new" ? "new" : editing.id}
            entry={editing === "new" ? null : editing}
            onClose={() => setEditing(null)}
            onSaved={load}
          />
        )}
      </AnimatePresence>
    </div>
  );
}