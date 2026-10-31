"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Eye, EyeOff, Copy, Check, Pencil, Trash2, X, ExternalLink, Lock, KeyRound } from "lucide-react";
import AppNav from "../components/AppNav";
import type { VaultEntry } from "@/lib/types";

const DEFAULT_CATEGORIES = [
  "Banking & Finance",
  "Email",
  "Social Media",
  "Hosting & Domains",
  "Developer Tools",
  "Government & ID",
  "Subscriptions",
  "Work",
  "Personal",
  "Other",
];

const REVEAL_SECONDS = 30;

type Secrets = { password: string; notes: string };

function openUrl(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/* ───────────────────────── Add / edit sheet ───────────────────────── */

function EntryModal({
  entry,
  categories,
  onClose,
  onSaved,
}: {
  entry: VaultEntry | null; // null = adding
  categories: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [category, setCategory] = useState(entry?.category || "");
  const [title, setTitle] = useState(entry?.title || "");
  const [username, setUsername] = useState(entry?.username || "");
  const [url, setUrl] = useState(entry?.url || "");
  const [password, setPassword] = useState("");
  const [notes, setNotes] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loadingSecrets, setLoadingSecrets] = useState(!!entry);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // When editing, fetch the current password + notes so you can see and change them.
  useEffect(() => {
    if (!entry) return;
    fetch(`/api/vault/${entry.id}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Could not load this entry.");
        setPassword(d.password);
        setNotes(d.notes);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingSecrets(false));
  }, [entry]);

  const inputStyle = { background: "var(--surface-2)", border: "1px solid var(--border)" };
  const label = "text-xs mono uppercase tracking-wide";

  async function submit() {
    setError("");
    if (!title.trim()) {
      setError("Give this entry a title.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(entry ? `/api/vault/${entry.id}` : "/api/vault", {
        method: entry ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, title, username, url, password, notes }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Could not save.");
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const hasInput = !!(title || username || url || password || notes);

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
        className="rounded-t-xl sm:rounded-xl w-full max-w-md max-h-[92dvh] sm:max-h-[90dvh] flex flex-col"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 sm:px-6 pt-5 pb-4 shrink-0">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <KeyRound size={17} style={{ color: "var(--accent)" }} /> {entry ? "Edit entry" : "New entry"}
          </h2>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-6 pb-4 space-y-3">
          <div>
            <label className={label} style={{ color: "var(--text-muted)" }}>Category</label>
            <input
              list="vault-categories"
              placeholder="Pick one or type a new category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-base sm:text-sm px-2.5 py-2 rounded-md mt-1.5"
              style={inputStyle}
            />
            <datalist id="vault-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <label className={label} style={{ color: "var(--text-muted)" }}>Title</label>
            <input
              placeholder="e.g. HDFC NetBanking"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-base sm:text-sm px-2.5 py-2 rounded-md mt-1.5"
              style={inputStyle}
            />
          </div>
          <div>
            <label className={label} style={{ color: "var(--text-muted)" }}>Username / email</label>
            <input
              autoCapitalize="none"
              autoCorrect="off"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full text-base sm:text-sm px-2.5 py-2 rounded-md mt-1.5"
              style={inputStyle}
            />
          </div>
          <div>
            <label className={label} style={{ color: "var(--text-muted)" }}>Website</label>
            <input
              autoCapitalize="none"
              placeholder="netbanking.hdfcbank.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
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
                value={loadingSecrets ? "" : password}
                placeholder={loadingSecrets ? "Loading..." : ""}
                disabled={loadingSecrets}
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
          <div>
            <label className={label} style={{ color: "var(--text-muted)" }}>Notes (PINs, security questions, recovery codes…)</label>
            <textarea
              rows={3}
              disabled={loadingSecrets}
              value={loadingSecrets ? "" : notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-base sm:text-sm px-2.5 py-2 rounded-md mt-1.5"
              style={inputStyle}
            />
          </div>
        </div>

        <div
          className="shrink-0 px-5 sm:px-6 py-4 flex items-center gap-3"
          style={{ borderTop: "1px solid var(--border)", paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <p className="flex-1 text-xs min-w-0" style={{ color: "var(--danger)" }} role="alert">{error}</p>
          <button onClick={onClose} className="text-sm px-3.5 py-2 rounded-md" style={{ border: "1px solid var(--border)" }}>
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving || loadingSecrets}
            className="text-sm px-3.5 py-2 rounded-md font-medium whitespace-nowrap"
            style={{ background: "var(--accent)", color: "#0a0b0f", opacity: saving || loadingSecrets ? 0.7 : 1 }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ───────────────────────────── Page ───────────────────────────── */

export default function VaultPage() {
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
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

  async function copy(key: string, text: string | (() => Promise<string | null>)) {
    const value = typeof text === "function" ? await text() : text;
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

  const categories = useMemo(() => {
    const all = new Set([...DEFAULT_CATEGORIES, ...entries.map((e) => e.category)]);
    return [...all];
  }, [entries]);

  const usedCategories = useMemo(() => {
    const set = new Set(entries.map((e) => e.category));
    return [...set].sort((a, b) => (a === "Other" ? 1 : b === "Other" ? -1 : a.localeCompare(b)));
  }, [entries]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter(
      (e) =>
        (category === "All" || e.category === category) &&
        (!q ||
          e.title.toLowerCase().includes(q) ||
          e.username.toLowerCase().includes(q) ||
          e.url.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q))
    );
  }, [entries, search, category]);

  const grouped = useMemo(() => {
    const map = new Map<string, VaultEntry[]>();
    for (const e of filtered) map.set(e.category, [...(map.get(e.category) || []), e]);
    return [...map.entries()].sort(([a], [b]) => (a === "Other" ? 1 : b === "Other" ? -1 : a.localeCompare(b)));
  }, [filtered]);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <AppNav />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-medium mono">Personal vault</h1>
          <p className="text-sm mt-1 flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
            <Lock size={12} className="shrink-0" />
            <span>{`${entries.length} ${entries.length === 1 ? "entry" : "entries"} · passwords & notes stored encrypted`}</span>
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

      <div className="mb-3 relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
        <input
          placeholder="Search title, username, website or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-base sm:text-sm pl-9 pr-3 py-2.5 rounded-lg outline-none"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        />
      </div>

      {usedCategories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-4 px-4 sm:mx-0 sm:px-0">
          {["All", ...usedCategories].map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className="text-xs px-3 py-1.5 rounded-full whitespace-nowrap shrink-0"
              style={{
                border: "1px solid var(--border)",
                background: category === c ? "var(--accent-dim)" : "transparent",
                color: category === c ? "var(--accent)" : "var(--text-secondary)",
              }}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-sm mono" style={{ color: "var(--text-muted)" }}>Loading...</p>
      ) : error ? (
        <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>
      ) : entries.length === 0 ? (
        <div className="rounded-xl p-6 text-sm" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
          Nothing saved yet. Tap “New entry” to add your first login.
        </div>
      ) : grouped.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No matches.</p>
      ) : (
        <div className="space-y-6">
          {grouped.map(([cat, list]) => (
            <section key={cat}>
              <p className="text-xs mono uppercase tracking-wide mb-2 flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
                {cat} <span style={{ color: "var(--text-muted)", opacity: 0.6 }}>· {list.length}</span>
              </p>
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
                {list.map((e, idx) => {
                  const s = revealed[e.id];
                  return (
                    <div key={e.id} className="px-4 py-3.5" style={{ borderTop: idx === 0 ? "none" : "1px solid var(--border)" }}>
                      <div className="flex items-start justify-between gap-3">
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

                      {e.username && (
                        <div className="flex items-center gap-2 mt-1.5 text-xs">
                          <span style={{ color: "var(--text-muted)" }} className="w-14 shrink-0">User</span>
                          <span className="mono truncate min-w-0" style={{ color: "var(--text-secondary)" }}>{e.username}</span>
                          <button onClick={() => copy(`u-${e.id}`, e.username)} style={{ color: "var(--accent)" }} aria-label="Copy username" className="shrink-0">
                            {copied === `u-${e.id}` ? <Check size={13} /> : <Copy size={13} />}
                          </button>
                        </div>
                      )}

                      {e.url && (
                        <div className="flex items-center gap-2 mt-1.5 text-xs">
                          <span style={{ color: "var(--text-muted)" }} className="w-14 shrink-0">Site</span>
                          <a href={openUrl(e.url)} target="_blank" rel="noopener noreferrer" className="truncate min-w-0 flex items-center gap-1" style={{ color: "var(--accent)" }}>
                            <span className="truncate">{e.url}</span> <ExternalLink size={11} className="shrink-0" />
                          </a>
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-1.5 text-xs">
                        <span style={{ color: "var(--text-muted)" }} className="w-14 shrink-0">Password</span>
                        <span className="mono truncate min-w-0" style={{ color: "var(--text-secondary)" }}>
                          {s ? s.password || "(empty)" : "••••••••••"}
                        </span>
                        <button onClick={() => toggleReveal(e.id)} style={{ color: "var(--accent)" }} aria-label={s ? "Hide" : "Reveal"} className="shrink-0">
                          {s ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button
                          onClick={() => copy(`p-${e.id}`, async () => (await fetchSecrets(e.id))?.password ?? null)}
                          style={{ color: "var(--accent)" }}
                          aria-label="Copy password"
                          className="shrink-0"
                        >
                          {copied === `p-${e.id}` ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>

                      <AnimatePresence>
                        {s && e.has_notes && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <p className="text-xs whitespace-pre-wrap mt-2.5 rounded-md px-2.5 py-2" style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
                              {s.notes}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      {!s && e.has_notes && (
                        <p className="text-[11px] mt-2" style={{ color: "var(--text-muted)" }}>Has notes — tap the eye to show</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <AnimatePresence>
        {editing && (
          <EntryModal
            key={editing === "new" ? "new" : editing.id}
            entry={editing === "new" ? null : editing}
            categories={categories}
            onClose={() => setEditing(null)}
            onSaved={load}
          />
        )}
      </AnimatePresence>
    </div>
  );
}