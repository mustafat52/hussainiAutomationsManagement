"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, CalendarClock, KeyRound, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DUE_DAY, monthKey, shiftMonth } from "@/lib/maintenance";
import type { MaintenanceItem } from "@/lib/types";

const TABS = [
  { href: "/", label: "Projects", Icon: LayoutGrid },
  { href: "/maintenance", label: "Maintenance", Icon: CalendarClock },
  { href: "/vault", label: "Vault", Icon: KeyRound },
];

async function pendingCount(month: string) {
  try {
    const res = await fetch(`/api/maintenance?month=${month}`);
    if (!res.ok) return 0;
    const data = (await res.json()) as { items: MaintenanceItem[] };
    return data.items.filter((i) => !i.received_at).length;
  } catch {
    return 0;
  }
}

export default function AppNav() {
  const pathname = usePathname();
  const [badge, setBadge] = useState(0);

  // Red badge on "Maintenance": anything still unpaid from last month, plus this month's
  // from the day before the due date (the day you should send reminders).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const now = new Date();
      const cur = monthKey(now);
      const [prev, curr] = await Promise.all([pendingCount(shiftMonth(cur, -1)), pendingCount(cur)]);
      if (!cancelled) setBadge(prev + (now.getDate() >= DUE_DAY - 1 ? curr : 0));
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  async function signOut() {
    await createClient().auth.signOut();
    window.location.href = "/login";
  }

  return (
    <nav className="flex items-center justify-between gap-2 mb-6">
      <div className="flex gap-0.5 sm:gap-1 p-1 rounded-lg min-w-0" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        {TABS.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="text-sm flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md font-medium"
              style={{
                background: active ? "var(--accent-dim)" : "transparent",
                color: active ? "var(--accent)" : "var(--text-secondary)",
              }}
            >
              <Icon size={14} className="hidden sm:block" />
              {label}
              {href === "/maintenance" && badge > 0 && (
                <span
                  className="text-[10px] leading-none px-1.5 py-1 rounded-full mono"
                  style={{ background: "var(--danger)", color: "#0a0b0f" }}
                  aria-label={`${badge} maintenance payments pending`}
                >
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
      <button
        onClick={signOut}
        className="text-sm flex items-center px-2.5 py-2 rounded-md"
        style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
        aria-label="Sign out"
        title="Sign out"
      >
        <LogOut size={15} />
      </button>
    </nav>
  );
}