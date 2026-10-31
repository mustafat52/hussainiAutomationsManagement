"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Check, Copy, MessageCircle, Bell, AlertTriangle, CalendarClock, Pencil } from "lucide-react";
import AppNav from "../components/AppNav";
import type { MaintenanceItem } from "@/lib/types";
import {
  DEFAULT_TEMPLATE,
  DUE_DAY,
  TEMPLATE_KEY,
  TEMPLATE_PLACEHOLDERS,
  buildMessage,
  dueDate,
  dueState,
  fmtDay,
  fmtMoney,
  monthKey,
  monthLabel,
  shiftMonth,
  whatsappLink,
} from "@/lib/maintenance";

export default function MaintenancePage() {
  // "This month" is decided on the device (not during server rendering), so the phone's
  // own date and timezone always win — otherwise the server's clock can disagree near month-end.
  const [currentMonth, setCurrentMonth] = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [prevPending, setPrevPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [draft, setDraft] = useState(DEFAULT_TEMPLATE);
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [savedTick, setSavedTick] = useState(false);

  useEffect(() => {
    const m = monthKey(new Date());
    setCurrentMonth(m);
    setMonth(m);
  }, []);

  const load = useCallback(async () => {
    if (!month || !currentMonth) return;
    try {
      const res = await fetch(`/api/maintenance?month=${month}`);
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load maintenance.");
      setItems(data.items);
      setError("");

      // When looking at the current month, also surface anything still unpaid from last month.
      if (month === currentMonth) {
        const prev = await fetch(`/api/maintenance?month=${shiftMonth(month, -1)}`);
        if (prev.ok) {
          const p = await prev.json();
          setPrevPending((p.items as MaintenanceItem[]).filter((i) => !i.received_at).length);
        }
      } else {
        setPrevPending(0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load maintenance.");
    } finally {
      setLoading(false);
    }
  }, [month, currentMonth]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : {}))
      .then((s: Record<string, string>) => {
        if (s[TEMPLATE_KEY]) {
          setTemplate(s[TEMPLATE_KEY]);
          setDraft(s[TEMPLATE_KEY]);
        }
      })
      .catch(() => {});
  }, []);

  async function toggle(item: MaintenanceItem) {
    if (item.received_at && !confirm(`Mark ${item.client_name} — ${item.project_name} as NOT received?`)) return;
    setBusy(item.project_id);
    try {
      const res = item.received_at
        ? await fetch(`/api/maintenance?project_id=${item.project_id}&month=${month}`, { method: "DELETE" })
        : await fetch("/api/maintenance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ project_id: item.project_id, month, amount: item.expected_amount }),
          });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Could not update.");
      }
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function saveTemplate() {
    const value = draft.trim() || DEFAULT_TEMPLATE;
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: TEMPLATE_KEY, value }),
    });
    if (!res.ok) {
      alert("Could not save the message.");
      return;
    }
    setTemplate(value);
    setDraft(value);
    setEditingTemplate(false);
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 1500);
  }

  const messageFor = useCallback(
    (i: MaintenanceItem) =>
      buildMessage(template, { name: i.client_name, project: i.project_name, amount: i.expected_amount, month: month ?? "" }),
    [template, month]
  );

  async function copyMessage(i: MaintenanceItem) {
    try {
      await navigator.clipboard.writeText(messageFor(i));
      setCopied(i.project_id);
      setTimeout(() => setCopied((c) => (c === i.project_id ? null : c)), 1500);
    } catch {
      alert("Could not copy. Select the text in the message preview instead.");
    }
  }

  const sorted = useMemo(
    () => [...items].sort((a, b) => Number(!!a.received_at) - Number(!!b.received_at)),
    [items]
  );
  const pending = items.filter((i) => !i.received_at);
  const expectedTotal = items.reduce((s, i) => s + i.amount, 0);
  const receivedTotal = items.filter((i) => i.received_at).reduce((s, i) => s + i.amount, 0);
  const pendingTotal = pending.reduce((s, i) => s + i.amount, 0);
  const pct = expectedTotal > 0 ? Math.round((receivedTotal / expectedTotal) * 100) : 0;

  if (!month || !currentMonth) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <AppNav />
        <p className="text-sm mono" style={{ color: "var(--text-muted)" }}>Loading...</p>
      </div>
    );
  }

  const due = dueDate(month);
  const { state, days } = dueState(month);

  let banner: { text: string; color: string; bg: string; icon: React.ReactNode } | null = null;
  if (items.length > 0 && pending.length === 0) {
    banner = {
      text: `All maintenance for ${monthLabel(month)} has been received.`,
      color: "var(--success)",
      bg: "var(--success-dim)",
      icon: <Check size={16} />,
    };
  } else if (pending.length > 0) {
    if (state === "overdue") {
      banner = {
        text: `${pending.length} payment${pending.length > 1 ? "s" : ""} overdue — was due on ${fmtDay(due)}.`,
        color: "var(--danger)",
        bg: "var(--danger-dim)",
        icon: <AlertTriangle size={16} />,
      };
    } else if (state === "today") {
      banner = { text: `Due today (${fmtDay(due)}) — ${pending.length} pending.`, color: "var(--warning)", bg: "var(--warning-dim)", icon: <Bell size={16} /> };
    } else if (state === "reminder") {
      banner = {
        text: `Due tomorrow (${fmtDay(due)}). Send the reminders today — ${pending.length} pending.`,
        color: "var(--warning)",
        bg: "var(--warning-dim)",
        icon: <Bell size={16} />,
      };
    } else {
      banner = {
        text: `Due on ${fmtDay(due)} (in ${days} days). Reminders go out the day before.`,
        color: "var(--text-secondary)",
        bg: "var(--surface-2)",
        icon: <CalendarClock size={16} />,
      };
    }
  }

  const sample = pending[0] || items[0];

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <AppNav />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-medium mono">Maintenance</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Collected on the {DUE_DAY}th of every month
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMonth(shiftMonth(month, -1))}
            className="p-2 rounded-md"
            style={{ border: "1px solid var(--border)" }}
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setMonth(currentMonth)}
            className="text-sm mono px-3 py-2 rounded-md min-w-[9.5rem] text-center"
            style={{ border: "1px solid var(--border)", background: month === currentMonth ? "var(--accent-dim)" : "transparent", color: month === currentMonth ? "var(--accent)" : "inherit" }}
            title="Jump to this month"
          >
            {monthLabel(month)}
          </button>
          <button
            onClick={() => setMonth(shiftMonth(month, 1))}
            className="p-2 rounded-md"
            style={{ border: "1px solid var(--border)" }}
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        {[
          { label: "Expected", value: expectedTotal, color: "var(--text-primary)" },
          { label: "Received", value: receivedTotal, color: "var(--success)" },
          { label: "Pending", value: pendingTotal, color: pendingTotal > 0 ? "var(--warning)" : "var(--text-muted)" },
        ].map((c) => (
          <div key={c.label} className="rounded-xl p-3 sm:p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-[11px] sm:text-xs mono uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{c.label}</p>
            <p className="text-lg sm:text-2xl font-medium mono mt-1" style={{ color: c.color }}>{fmtMoney(c.value)}</p>
          </div>
        ))}
      </div>

      <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: "var(--surface-2)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "var(--success)" }} />
      </div>
      <p className="text-xs mono mb-4" style={{ color: "var(--text-muted)" }}>
        {items.length - pending.length} of {items.length} received · {pct}%
      </p>

      {banner && (
        <div className="flex items-start gap-2.5 text-sm rounded-lg px-3.5 py-3 mb-3" style={{ background: banner.bg, color: banner.color }}>
          <span className="mt-0.5 shrink-0">{banner.icon}</span>
          <span>{banner.text}</span>
        </div>
      )}

      {prevPending > 0 && (
        <button
          onClick={() => setMonth(shiftMonth(currentMonth, -1))}
          className="w-full text-left flex items-start gap-2.5 text-sm rounded-lg px-3.5 py-3 mb-3"
          style={{ background: "var(--danger-dim)", color: "var(--danger)" }}
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            {prevPending} payment{prevPending > 1 ? "s" : ""} from {monthLabel(shiftMonth(currentMonth, -1))} still not received. Tap to view.
          </span>
        </button>
      )}

      <div className="rounded-xl overflow-hidden mb-6" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
        {loading ? (
          <p className="p-5 text-sm mono" style={{ color: "var(--text-muted)" }}>Loading...</p>
        ) : error ? (
          <p className="p-5 text-sm" style={{ color: "var(--danger)" }}>{error}</p>
        ) : items.length === 0 ? (
          <p className="p-5 text-sm" style={{ color: "var(--text-muted)" }}>
            No maintenance contracts yet. Open a project on the Projects screen, tap Edit, and set “Maintenance / month” to an amount.
          </p>
        ) : (
          sorted.map((i, idx) => {
            const received = !!i.received_at;
            return (
              <motion.div
                key={i.project_id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(idx * 0.03, 0.25) }}
                className="px-4 py-3.5"
                style={{ borderTop: idx === 0 ? "none" : "1px solid var(--border)", opacity: received ? 0.7 : 1 }}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggle(i)}
                    disabled={busy === i.project_id}
                    aria-label={received ? "Mark as not received" : "Mark as received"}
                    className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center mt-0.5"
                    style={{
                      border: `1.5px solid ${received ? "var(--success)" : "var(--border-strong)"}`,
                      background: received ? "var(--success-dim)" : "transparent",
                      color: "var(--success)",
                    }}
                  >
                    {received && <Check size={16} />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ textDecoration: received ? "line-through" : "none" }}>
                          {i.client_name}
                        </p>
                        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{i.project_name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm mono font-medium" style={{ color: received ? "var(--success)" : "var(--text-primary)" }}>
                          {fmtMoney(i.amount)}
                        </p>
                        <p className="text-[11px] mono" style={{ color: received ? "var(--success)" : state === "overdue" ? "var(--danger)" : "var(--text-muted)" }}>
                          {received
                            ? `received ${new Date(i.received_at!).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
                            : state === "overdue"
                            ? "overdue"
                            : state === "today"
                            ? "due today"
                            : `due ${due.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
                        </p>
                      </div>
                    </div>

                    {!received && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        <a
                          href={whatsappLink(i.contact, messageFor(i))}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium"
                          style={{ background: "var(--accent)", color: "#0a0b0f" }}
                        >
                          <MessageCircle size={13} /> Send reminder
                        </a>
                        <button
                          onClick={() => copyMessage(i)}
                          className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md"
                          style={{ border: "1px solid var(--border)", color: copied === i.project_id ? "var(--success)" : "var(--text-secondary)" }}
                        >
                          {copied === i.project_id ? <Check size={13} /> : <Copy size={13} />}
                          {copied === i.project_id ? "Copied" : "Copy message"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs mono uppercase tracking-wide flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
            <MessageCircle size={13} /> Reminder message
          </p>
          {!editingTemplate && (
            <button onClick={() => { setDraft(template); setEditingTemplate(true); }} className="text-xs flex items-center gap-1" style={{ color: "var(--accent)" }}>
              <Pencil size={12} /> {savedTick ? "Saved" : "Edit"}
            </button>
          )}
        </div>

        {editingTemplate ? (
          <>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={5}
              className="w-full text-base sm:text-sm px-2.5 py-2 rounded-md"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
            />
            <p className="text-xs mt-2 mono" style={{ color: "var(--text-muted)" }}>
              Auto-filled: {TEMPLATE_PLACEHOLDERS.join("  ")}
            </p>
            <div className="flex justify-between mt-3">
              <button onClick={() => setDraft(DEFAULT_TEMPLATE)} className="text-xs" style={{ color: "var(--text-muted)" }}>
                Reset to default
              </button>
              <div className="flex gap-2">
                <button onClick={() => setEditingTemplate(false)} className="text-xs px-3 py-1.5 rounded-md" style={{ border: "1px solid var(--border)" }}>
                  Cancel
                </button>
                <button onClick={saveTemplate} className="text-xs px-3 py-1.5 rounded-md font-medium" style={{ background: "var(--accent)", color: "#0a0b0f" }}>
                  Save
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
              {sample ? messageFor(sample) : template}
            </p>
            {sample && (
              <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                Preview for {sample.client_name}. “Send reminder” opens WhatsApp with this text; if the client’s contact has a phone number it goes straight to them.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}