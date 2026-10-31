export default function AccountBadge({ name, color, size = 18 }: { name: string; color?: string; size?: number }) {
  if (!name) {
    return <span className="text-sm" style={{ color: "var(--text-muted)" }}>—</span>;
  }
  const initial = name.trim().charAt(0).toUpperCase();
  const bg = color || "#565c70";

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-flex items-center justify-center rounded-full font-medium shrink-0"
        style={{
          width: size,
          height: size,
          background: bg,
          color: "#0a0b0f",
          fontSize: size * 0.5,
        }}
      >
        {initial}
      </span>
      <span className="text-sm mono" style={{ color: "var(--text-primary)" }}>{name}</span>
    </span>
  );
}