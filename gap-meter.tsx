import { dateLabel, TARGET_GAP_DAYS } from "@/lib/format";
import { cn } from "@/lib/utils";

export function GapMeter({
  prevVisit,
  lastVisit,
  today,
  gapDays,
  daysSince,
}: {
  prevVisit: string | null;
  lastVisit: string | null;
  today: string;
  gapDays: number | null;
  daysSince: number | null;
}) {
  if (!lastVisit) {
    return (
      <p className="text-sm text-muted">
        Henüz ziyaret yok. İlk kayıttan sonra ikinci ziyaret tarihi girildiğinde gün farkı
        otomatik hesaplanır.
      </p>
    );
  }

  const since = Math.max(daysSince ?? 0, 0);
  const between = Math.max(gapDays ?? 0, 0);
  const hasPrev = Boolean(prevVisit && gapDays !== null);
  const total = Math.max((hasPrev ? between : 0) + since, 1);
  const gapPct = hasPrev ? Math.max(18, (between / total) * 100) : 0;
  const sincePct = hasPrev ? Math.max(18, 100 - gapPct) : 100;

  return (
    <div className="grid gap-4">
      <div className="flex items-end gap-2">
        {hasPrev ? (
          <>
            <Tick label="Önceki" date={prevVisit} />
            <Segment
              pct={gapPct}
              days={gapDays}
              caption="İki Ziyaret Arası"
              className="bg-primary/70"
            />
          </>
        ) : null}
        <Tick label="Son Ziyaret" date={lastVisit} strong />
        <Segment
          pct={sincePct}
          days={daysSince}
          caption="Bugüne Kadar"
          className="bg-primary"
        />
        <Tick label="Bugün" date={today} />
      </div>
      <p className="text-xs text-subtle">
        Aylık ritim hedefi {TARGET_GAP_DAYS} gün. Geciken gün, bu hedefin üzerindeki süredir.
      </p>
    </div>
  );
}

function Tick({
  label,
  date,
  strong,
}: {
  label: string;
  date: string | null;
  strong?: boolean;
}) {
  return (
    <div className={cn("min-w-16 shrink-0", strong && "min-w-20")}>
      <p className="text-xs tracking-wide text-subtle uppercase">{label}</p>
      <p className={cn("mt-1 text-sm tabular-nums", strong ? "font-medium text-ink" : "text-muted")}>
        {dateLabel(date)}
      </p>
    </div>
  );
}

function Segment({
  pct,
  days,
  caption,
  className,
}: {
  pct: number;
  days: number | null;
  caption: string;
  className: string;
}) {
  return (
    <div className="min-w-0 flex-1 pb-1" style={{ flexGrow: pct, flexBasis: 0 }}>
      <p className="mb-1 text-center text-xs font-medium tabular-nums text-ink">
        {days !== null ? `${days} gün` : "—"}
      </p>
      <div className={cn("h-2 rounded-full", className)} />
      <p className="mt-1 text-center text-xs text-subtle">{caption}</p>
    </div>
  );
}
