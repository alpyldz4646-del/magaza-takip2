import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Copy, Download, Pencil, Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ExcelButton } from "@/components/excel-button";
import { ManagerEditDialog } from "@/components/manager-edit-dialog";
import { PartnerEditDialog, type EditablePartner } from "@/components/partner-edit-dialog";
import { ManagerRollups } from "@/components/manager-rollups";
import { useAccess } from "@/components/access-context";
import { InitialsBadge } from "@/components/initials-badge";
import { MonthSwitch } from "@/components/month-switch";
import { GapPill, OverdueDays } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { countAndRate, coverageRate, dateLabel, dateLabelLong, monthLabel, overdueDays } from "@/lib/format";
import { managerRollups } from "@/lib/manager-summary";
import { useMonth } from "@/lib/month-store";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getReport } from "@/lib/server/hr";

export default function ReportPage() {
  const month = useMonth((s) => s.month);
  const setMonth = useMonth((s) => s.setMonth);
  const [regionFilter, setRegionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [editingManager, setEditingManager] = useState<{
    regionId: number;
    name: string;
  } | null>(null);
  const [editingPartner, setEditingPartner] = useState<EditablePartner | null>(null);
  const access = useAccess();
  const { user } = useCurrentUserState();
  const report = useQuery({
    queryKey: ["report", month, user?.id ?? "signed-out"],
    queryFn: () => getReport({ data: { month } }),
    enabled: Boolean(user),
  });

  const filtered = useMemo(() => {
    const rows = report.data?.rows ?? [];
    const q = query.trim().toLocaleLowerCase("tr");
    return rows.filter((row) => {
      if (regionFilter !== "all" && String(row.regionId) !== regionFilter) return false;
      if (
        statusFilter === "overdue" &&
        row.daysSince !== null &&
        row.daysSince <= 30
      ) {
        return false;
      }
      if (statusFilter === "open" && row.visitedThisMonth) return false;
      if (statusFilter === "done" && !row.visitedThisMonth) return false;
      if (
        q &&
        !`${row.storeCode} ${row.storeName} ${row.district} ${row.partnerName}`
          .toLocaleLowerCase("tr")
          .includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [query, regionFilter, report.data?.rows, statusFilter]);

  if (report.isPending) {
    return (
      <>
        <Skeleton className="h-64" />
      </>
    );
  }

  if (!report.data) {
    return (
      <>
        <p className="text-muted">Rapor yüklenemedi.</p>
      </>
    );
  }

  const data = report.data;

  function exportCsv() {
    const header = [
      "Bölge",
      "İş Ortağı Müdürü",
      "İş Ortağı",
      "Mağaza Kodu",
      "Mağaza",
      "İl",
      "İlçe",
      "Önceki Ziyaret",
      "Son Ziyaret",
      "Gün Farkı",
      "Son Ziyaretten Bu Yana",
      "Geciken Gün",
      "Plan Tarihi",
      "Plan Durumu",
      "Bu Ay Ziyaret",
    ];
    const rows = filtered.map((row) => [
      row.regionName,
      row.managerName,
      row.partnerName,
      row.storeCode,
      row.storeName,
      row.city,
      row.district,
      row.prevVisit ?? "",
      row.lastVisit ?? "",
      row.gapDays !== null ? String(row.gapDays) : "",
      row.daysSince !== null ? String(row.daysSince) : "",
      overdueDays(row.daysSince) !== null ? String(overdueDays(row.daysSince)) : "",
      row.nextPlanDate ?? "",
      row.nextPlanStatus === "tamamlandi"
        ? "Tamamlandı"
        : row.nextPlanStatus === "planlandi"
          ? "Planlandı"
          : "",
      row.visitedThisMonth ? "Evet" : "Hayır",
    ]);
    const csv =
      "\uFEFF" +
      [header, ...rows]
        .map((line) => line.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(";"))
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `saha-defteri-${data.month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copySummary() {
    const lines = [
      `Saha Defteri — ${monthLabel(data.month)}`,
      `Kesim ${dateLabelLong(data.today)}`,
      "",
      `Bölge: ${data.kpis.regionCount}`,
      `Mağaza: ${data.kpis.storeCount}`,
      `Bu Ay Ziyaret: ${data.kpis.visitedThisMonth}/${data.kpis.storeCount}`,
      `Mağaza Kapsamı: ${coverageRate(data.kpis.visitedThisMonth, data.kpis.storeCount) !== null ? `%${coverageRate(data.kpis.visitedThisMonth, data.kpis.storeCount)}` : "—"}`,
      `Planlanan Ziyaret: ${data.kpis.plannedVisits}`,
      `Tamamlanan Plan: ${data.kpis.completedPlans}`,
      `Plan Tamamlanma: ${data.kpis.completionRate !== null ? `%${data.kpis.completionRate}` : "—"}`,
      `Ortalama iki ziyaret arası: ${data.kpis.avgGap ?? "—"} gün`,
      `30 Günü Aşan Mağaza: ${countAndRate(data.kpis.overdueCount, data.kpis.storeCount)}`,
      `Görüşülen Personel: ${data.kpis.interviewCount}`,
      "",
      "İş Ortağı Müdürleri",
      ...managerRollups(data.regions).map(
        (row) =>
          `${row.managerName}: ${row.regionCount} bölge, ${row.storeCount} mağaza, kapsama ${coverageRate(row.visitedThisMonth, row.storeCount) !== null ? `%${coverageRate(row.visitedThisMonth, row.storeCount)}` : "—"} (${row.visitedThisMonth}/${row.storeCount}), aralık ${row.avgGap ?? "—"} gün, geciken ${countAndRate(row.overdueCount, row.storeCount)}, görüşülen personel ${row.interviewCount}, planlanan ${row.plannedVisits}, gerçekleşen ${row.completedPlans}, oran ${row.completionRate !== null ? `%${row.completionRate}` : "—"}`,
      ),
      "",
      "İş Ortakları",
      ...managerRollups(
        data.regions.map((region) => ({ ...region, managerName: region.partnerName })),
      ).map(
        (row) =>
          `${row.managerName}: ${row.regionCount} bölge, ${row.storeCount} mağaza, geciken ${countAndRate(row.overdueCount, row.storeCount)}, görüşülen personel ${row.interviewCount}`,
      ),
      "",
      ...data.regions.map(
        (region) =>
          `${region.name} — İş Ortağı ${region.partnerName}, İş Ortağı Müdürü ${region.managerName || "—"}: mağaza kapsamı ${coverageRate(region.visitedThisMonth, region.storeCount) !== null ? `%${coverageRate(region.visitedThisMonth, region.storeCount)}` : "—"} (${region.visitedThisMonth}/${region.storeCount}), ortalama aralık ${region.avgGap ?? "—"} gün, 30 Günü Aşan ${countAndRate(region.overdueCount, region.storeCount)}, gerçekleşme ${region.completionRate !== null ? `%${region.completionRate}` : "—"} (${region.completedPlans}/${region.plannedVisits} planlanan ziyaret)`,
      ),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Yönetici Özeti kopyalandı");
    } catch {
      toast.error("Kopyalanamadı");
    }
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <header className="no-print flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-subtle uppercase">
              Yöneticiyle Paylaş
            </p>
            <h1 className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">
              Aylık Saha Raporu
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <MonthSwitch month={month} onChange={setMonth} />
            <Button variant="outline" onClick={() => void copySummary()}>
              <Copy />
              Özet
            </Button>
            <ExcelButton month={month} />
            <Button variant="outline" onClick={exportCsv}>
              <Download />
              CSV
            </Button>
            <Button onClick={() => window.print()}>
              <Printer />
              Yazdır
            </Button>
          </div>
        </header>

        <ManagerRollups regions={data.regions} />
        <ManagerRollups
          title="İş Ortakları"
          roleLabel="İş Ortağı"
          regions={data.regions.map((region) => ({
            ...region,
            managerName: region.partnerName,
          }))}
        />

        <Card className="p-6 sm:p-8">
          <div className="flex flex-col gap-1 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium tracking-[0.2em] text-subtle uppercase">
                İK İş Ortağı Müdürlüğü
              </p>
              <h2 className="font-display text-3xl tracking-tight">Saha Defteri Raporu</h2>
              <p className="mt-1 text-sm text-muted">
                Dönem {monthLabel(data.month)} · Kesim {dateLabelLong(data.today)}
              </p>
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <div>
              <dt className="text-xs text-subtle">Bölge</dt>
              <dd className="font-display text-2xl tabular-nums">{data.kpis.regionCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-subtle">Mağaza</dt>
              <dd className="font-display text-2xl tabular-nums">{data.kpis.storeCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-subtle">Bu Ay Ziyaret</dt>
              <dd className="font-display text-2xl tabular-nums">
                {data.kpis.visitedThisMonth}/{data.kpis.storeCount}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-subtle">Mağaza Kapsamı</dt>
              <dd className="font-display text-2xl tabular-nums">
                {coverageRate(data.kpis.visitedThisMonth, data.kpis.storeCount) !== null
                  ? `%${coverageRate(data.kpis.visitedThisMonth, data.kpis.storeCount)}`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-subtle">Ort. Aralık</dt>
              <dd className="font-display text-2xl tabular-nums">
                {data.kpis.avgGap !== null ? `${data.kpis.avgGap}g` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-subtle">Geciken</dt>
              <dd className="font-display text-2xl tabular-nums">
                {countAndRate(data.kpis.overdueCount, data.kpis.storeCount)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-subtle">Görüşülen Personel</dt>
              <dd className="font-display text-2xl tabular-nums">{data.kpis.interviewCount}</dd>
            </div>
          </dl>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.regions.map((region) => (
              <div key={region.id} className="rounded-xl bg-bg p-4">
                <p className="font-medium">{region.name}</p>
                <div className="flex items-center gap-1">
                  <InitialsBadge name={region.managerName} />
                  <p className="text-sm text-muted">
                    İş Ortağı Müdürü · {region.managerName || "Ad Girilmedi"}
                  </p>
                  {access.canAssign(region.id) ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={`${region.name} İş Ortağı Müdürü adını düzelt`}
                    onClick={() =>
                      setEditingManager({ regionId: region.id, name: region.managerName })
                    }
                  >
                    <Pencil />
                  </Button>
                  ) : null}
                </div>
                <p className="flex items-center gap-2 text-sm text-muted">
                  <InitialsBadge name={region.partnerName} initials={region.initials} />
                  İş Ortağı · {region.partnerName}
                  {access.isAdmin ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={`${region.partnerName} adını düzelt`}
                    onClick={() =>
                      setEditingPartner({ id: region.partnerId, name: region.partnerName })
                    }
                  >
                    <Pencil />
                  </Button>
                  ) : null}
                </p>
                <p className="mt-2 text-sm tabular-nums">
                  {region.visitedThisMonth}/{region.storeCount} ziyaret · aralık{" "}
                  {region.avgGap ?? "—"}g · gecikme {countAndRate(region.overdueCount, region.storeCount)}
                </p>
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-subtle">Gerçekleşme</span>
                    <span className="font-medium tabular-nums">
                      {region.completionRate !== null ? `%${region.completionRate}` : "—"}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-bg-warm">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${region.completionRate ?? 0}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted tabular-nums">
                    {region.completedPlans}/{region.plannedVisits} Planlanan Ziyaret
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="no-print grid gap-2 sm:grid-cols-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Mağaza, ilçe veya iş ortağı"
          />
          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Bölge" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Bölgeler</SelectItem>
              {data.regions.map((region) => (
                <SelectItem key={region.id} value={String(region.id)}>
                  {region.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Durum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Mağazalar</SelectItem>
              <SelectItem value="overdue">30 Günü Aşan Veya Ziyaretsiz</SelectItem>
              <SelectItem value="open">Bu Ay Henüz Ziyaret Yok</SelectItem>
              <SelectItem value="done">Bu Ay Ziyaret Edildi</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-warm/70 text-left text-xs tracking-wide text-muted uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Bölge</th>
                  <th className="px-4 py-3 font-medium">İş Ortağı Müdürü</th>
                  <th className="px-4 py-3 font-medium">İş Ortağı</th>
                  <th className="px-4 py-3 font-medium">Mağaza</th>
                  <th className="px-4 py-3 font-medium">Önceki</th>
                  <th className="px-4 py-3 font-medium">Son</th>
                  <th className="px-4 py-3 font-medium">Gün Farkı</th>
                  <th className="px-4 py-3 font-medium">Bugünden</th>
                  <th className="px-4 py-3 font-medium">Geciken Gün</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.storeId} className="border-t border-line">
                    <td className="px-4 py-2.5">{row.regionName}</td>
                    <td className="px-4 py-2.5">{row.managerName || "—"}</td>
                    <td className="px-4 py-2.5">{row.partnerName}</td>
                    <td className="px-4 py-2.5">
                      <Link
                        to="/magaza/$storeId"
                        params={{ storeId: String(row.storeId) }}
                        className="font-medium hover:underline"
                      >
                        {row.storeCode} {row.storeName}
                      </Link>
                      <div className="text-xs text-subtle">{row.district}</div>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">{dateLabel(row.prevVisit)}</td>
                    <td className="px-4 py-2.5 tabular-nums">{dateLabel(row.lastVisit)}</td>
                    <td className="px-4 py-2.5">
                      <GapPill days={row.gapDays} />
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {row.daysSince !== null ? `${row.daysSince}g` : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <OverdueDays daysSince={row.daysSince} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid gap-8 sm:grid-cols-2 print:grid-cols-2">
          <div className="rounded-2xl border border-line p-5">
            <p className="text-xs text-subtle">İş Ortağı Müdürü</p>
            <div className="mt-10 border-t border-line pt-2 text-sm text-muted">Ad / İmza</div>
          </div>
          <div className="rounded-2xl border border-line p-5">
            <p className="text-xs text-subtle">İş Ortağı</p>
            <div className="mt-10 border-t border-line pt-2 text-sm text-muted">Ad / İmza</div>
          </div>
        </div>
      </div>
      <ManagerEditDialog
        open={Boolean(editingManager)}
        onOpenChange={(open) => {
          if (!open) setEditingManager(null);
        }}
        regionId={editingManager?.regionId ?? null}
        name={editingManager?.name ?? ""}
      />
      <PartnerEditDialog
        open={Boolean(editingPartner)}
        onOpenChange={(open) => {
          if (!open) setEditingPartner(null);
        }}
        partner={editingPartner}
      />
    </>
  );
}
