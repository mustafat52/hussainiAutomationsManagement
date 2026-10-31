"use client";

import { PROJECT_STATUSES, statusStyle } from "./StatusBadge";

export default function StatusSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (status: string) => void;
}) {
  const s = statusStyle(value);
  return (
    <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none cursor-pointer pl-4 pr-2 py-0.5 rounded-full text-xs font-medium outline-none"
        style={{ background: s.bg, color: s.fg }}
      >
        {PROJECT_STATUSES.map((st) => (
          <option key={st} value={st} style={{ background: "var(--surface)", color: "var(--text-primary)" }}>
            {statusStyle(st).label}
          </option>
        ))}
      </select>
      <span
        className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full pointer-events-none"
        style={{ background: s.fg }}
      />
    </div>
  );
}