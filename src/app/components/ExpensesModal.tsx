"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, Receipt, Plus, Trash2 } from "lucide-react";
import type { Expense } from "@/lib/types";

function fmtMoney(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const CATEGORIES = ["general", "software", "hosting", "hardware", "subscriptions", "travel", "food", "other"];

export default function ExpensesModal({ onClose }: { onClose: () => void }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("general");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const inputStyle = { background: "var(--surface-2)", border: "1px solid var(--border)" };

  async function load() {
    const res = await fetch("/api/expenses");
    setExpenses(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addExpense() {
    if (!description.trim() || !amount) return;
    setSaving(true);
    try {
      await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, amount: parseFloat(amount) || 0, category, expense_date: date }),
      });
      setDescription("");
      setAmount("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    load();
  }

  const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const thisMonth = expenses
    .filter((e) => e.expense_date.slice(0, 7) === new Date().toISOString().slice(0, 7))
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: "rgba(5,6,9,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="rounded-xl p-6 w-full max-w-lg max-h-[85vh] flex flex-col"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <Receipt size={17} style={{ color: "var(--warning)" }} /> Expenses
          </h2>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}>
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg p-3" style={{ background: "var(--surface-2)" }}>
            <p className="text-xs mono uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>This month</p>
            <p className="text-lg font-medium mono" style={{ color: "var(--warning)" }}>{fmtMoney(thisMonth)}</p>
          </div>
          <div className="rounded-lg p-3" style={{ background: "var(--surface-2)" }}>
            <p className="text-xs mono uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>All time</p>
            <p className="text-lg font-medium mono" style={{ color: "var(--warning)" }}>{fmtMoney(total)}</p>
          </div>
        </div>

        <div className="space-y-2 mb-4 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <input
            placeholder="What was this for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full text-sm px-2.5 py-2 rounded-md"
            style={inputStyle}
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              placeholder="Amount (₹)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-sm px-2.5 py-2 rounded-md"
              style={inputStyle}
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="text-sm px-2.5 py-2 rounded-md"
              style={inputStyle}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-sm px-2.5 py-2 rounded-md"
              style={inputStyle}
            />
          </div>
          <button
            onClick={addExpense}
            disabled={saving}
            className="w-full text-sm flex items-center justify-center gap-1.5 px-3 py-2 rounded-md font-medium"
            style={{ background: "var(--accent)", color: "#0a0b0f" }}
          >
            <Plus size={14} /> {saving ? "Adding..." : "Add expense"}
          </button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-1">
          {loading ? (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Loading...</p>
          ) : expenses.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>No expenses logged yet.</p>
          ) : (
            expenses.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between text-xs py-2 px-2.5 rounded-md"
                style={{ background: "var(--surface-2)" }}
              >
                <div className="min-w-0">
                  <p className="truncate" style={{ color: "var(--text-primary)" }}>{e.description}</p>
                  <p className="mono" style={{ color: "var(--text-muted)" }}>{e.category} · {fmtDate(e.expense_date)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <span className="mono font-medium" style={{ color: "var(--warning)" }}>{fmtMoney(e.amount)}</span>
                  <button onClick={() => remove(e.id)} style={{ color: "var(--danger)" }} className="flex items-center">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}