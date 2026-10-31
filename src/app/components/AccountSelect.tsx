"use client";

import { useState } from "react";
import type { Account } from "@/lib/types";
import AccountBadge from "./AccountBadge";

export default function AccountSelect({
  accounts,
  value,
  onChange,
  onAccountsRefresh,
}: {
  accounts: Account[];
  value: string;
  onChange: (name: string) => void;
  onAccountsRefresh: () => void;
}) {
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState("");

  async function commitNew() {
    const name = newName.trim();
    if (!name) {
      setAddingNew(false);
      return;
    }
    await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    onAccountsRefresh();
    onChange(name);
    setAddingNew(false);
    setNewName("");
  }

  if (addingNew) {
    return (
      <div className="flex gap-2">
        <input
          autoFocus
          placeholder="New account/profile name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && commitNew()}
          className="w-full text-sm px-2.5 py-2 rounded-md"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
        />
        <button
          onClick={commitNew}
          className="text-xs px-3 py-2 rounded-md font-medium whitespace-nowrap"
          style={{ background: "var(--accent)", color: "#0a0b0f" }}
        >
          Add
        </button>
      </div>
    );
  }

  const current = accounts.find((a) => a.name === value);

  return (
    <div className="relative">
      {current && (
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
          <AccountBadge name={current.name} color={current.color} size={14} />
        </div>
      )}
      <select
        value={value || ""}
        onChange={(e) => {
          if (e.target.value === "__new__") setAddingNew(true);
          else onChange(e.target.value);
        }}
        className="w-full text-sm py-2 rounded-md appearance-none"
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          paddingLeft: current ? 34 : 10,
          paddingRight: 10,
          color: current ? "transparent" : "var(--text-primary)",
        }}
      >
        <option value="">Select account...</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.name}>{a.name}</option>
        ))}
        <option value="__new__">+ Add new account</option>
      </select>
    </div>
  );
}