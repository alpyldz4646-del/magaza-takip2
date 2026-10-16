import { overdueDays } from "@/lib/format";

export function OverdueDays({ daysSince }: { daysSince: number | null }) {
  const late = overdueDays(daysSince);
  if (late === null) return <span className="tabular-nums text-subtle">—</span>;
  return <span className="tabular-nums">{late} gün</span>;
}

export function GapPill({ days }: { days: number | null }) {
  if (days === null) return <span className="text-subtle">—</span>;
  return <span className="tabular-nums">{days} gün</span>;
}
