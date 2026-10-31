export const PROJECT_STATUSES = [
  "lead",
  "discussion",
  "quotation_sent",
  "in_work",
  "in_test",
  "completed",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

const STYLES: Record<string, { bg: string; fg: string; label: string }> = {
  // Project statuses — each one gets its own distinct color
  lead: { bg: "var(--surface-2)", fg: "var(--text-secondary)", label: "Lead" },
  discussion: { bg: "var(--accent-dim)", fg: "var(--accent)", label: "Discussion" },
  quotation_sent: { bg: "var(--gold-dim)", fg: "var(--gold)", label: "Quotation sent" },
  in_work: { bg: "var(--status-blue-dim)", fg: "var(--status-blue)", label: "In work" },
  in_test: { bg: "var(--status-orange-dim)", fg: "var(--status-orange)", label: "In test" },
  completed: { bg: "var(--status-teal-dim)", fg: "var(--status-teal)", label: "Completed" },

  // Client statuses
  active: { bg: "var(--success-dim)", fg: "var(--success)", label: "Active" },
  recurring: { bg: "var(--success-dim)", fg: "var(--success)", label: "Recurring" },
  churned: { bg: "var(--danger-dim)", fg: "var(--danger)", label: "Churned" },

  // Maintenance / payment statuses
  none: { bg: "var(--surface-2)", fg: "var(--text-muted)", label: "None" },
  paused: { bg: "var(--warning-dim)", fg: "var(--warning)", label: "Paused" },
  ended: { bg: "var(--surface-2)", fg: "var(--text-muted)", label: "Ended" },
  unpaid: { bg: "var(--danger-dim)", fg: "var(--danger)", label: "Unpaid" },
  partial: { bg: "var(--warning-dim)", fg: "var(--warning)", label: "Partial" },
  paid: { bg: "var(--success-dim)", fg: "var(--success)", label: "Paid" },
};

export function statusStyle(status: string) {
  return STYLES[status] || { bg: "var(--surface-2)", fg: "var(--text-secondary)", label: status };
}

export default function StatusBadge({ status }: { status: string }) {
  const s = statusStyle(status);
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: s.bg, color: s.fg }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.fg }} />
      {s.label}
    </span>
  );
}