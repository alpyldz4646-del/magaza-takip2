import { InitialsBadge } from "@/components/initials-badge";
import { countAndRate, coverageRate } from "@/lib/format";
import { managerRollups, type ManagerRollupInput } from "@/lib/manager-summary";

export function ManagerRollups({
  regions,
  mode = "full",
  title = "İş Ortağı Müdürleri",
  roleLabel = "İş Ortağı Müdürü",
}: {
  regions: ManagerRollupInput[];
  mode?: "full" | "plan";
  title?: string;
  roleLabel?: string;
}) {
  const rows = managerRollups(regions);
  if (rows.length === 0) return null;
  return (
    <section className="grid gap-3">
      <h2 className="font-display text-2xl tracking-tight">{title}</h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => {
          const coverage = coverageRate(row.visitedThisMonth, row.storeCount);
          return (
          <article key={row.managerName} className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2">
              <InitialsBadge name={row.managerName} size="md" />
              <div className="min-w-0">
                <p className="truncate font-medium">{row.managerName}</p>
                <p className="text-xs text-subtle">{roleLabel}</p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-subtle">Bölge</dt>
                <dd className="font-display text-xl tabular-nums">{row.regionCount}</dd>
              </div>
              <div>
                <dt className="text-xs text-subtle">Mağaza</dt>
                <dd className="font-display text-xl tabular-nums">{row.storeCount}</dd>
              </div>
              {mode === "full" ? (
                <>
              <div>
                <dt className="text-xs text-subtle">Bu Ay Ziyaret</dt>
                <dd className="font-display text-xl tabular-nums">
                  {row.visitedThisMonth}/{row.storeCount}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-subtle">Mağaza Kapsamı</dt>
                <dd className="font-display text-xl tabular-nums">
                  {coverage !== null ? `%${coverage}` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-subtle">Ort. Aralık</dt>
                <dd className="font-display text-xl tabular-nums">
                  {row.avgGap !== null ? `${row.avgGap}` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-subtle">Geciken</dt>
                <dd className="font-display text-xl tabular-nums">
                  {countAndRate(row.overdueCount, row.storeCount)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-subtle">Görüşülen Personel</dt>
                <dd className="font-display text-xl tabular-nums">{row.interviewCount}</dd>
              </div>
                </>
              ) : null}
              <div>
                <dt className="text-xs text-subtle">Planlanan</dt>
                <dd className="font-display text-xl tabular-nums">{row.plannedVisits}</dd>
              </div>
              <div>
                <dt className="text-xs text-subtle">Gerçekleşen</dt>
                <dd className="font-display text-xl tabular-nums">{row.completedPlans}</dd>
              </div>
              <div>
                <dt className="text-xs text-subtle">Gerçekleşme</dt>
                <dd className="font-display text-xl tabular-nums">
                  {row.completionRate !== null ? `%${row.completionRate}` : "—"}
                </dd>
              </div>
            </dl>
          </article>
          );
        })}
      </div>
    </section>
  );
}