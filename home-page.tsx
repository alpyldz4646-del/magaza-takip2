import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Clock3, LayoutGrid, Pencil, Plus, Store, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ExcelButton } from "@/components/excel-button";
import { ManagerRollups } from "@/components/manager-rollups";
import { useAccess } from "@/components/access-context";
import { ManagerEditDialog } from "@/components/manager-edit-dialog";
import { InitialsBadge } from "@/components/initials-badge";
import { MonthSwitch } from "@/components/month-switch";
import { PartnerEditDialog, type EditablePartner } from "@/components/partner-edit-dialog";
import { RegionEditDialog, type EditableRegion } from "@/components/region-edit-dialog";
import { GapPill, OverdueDays } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { coverageRate, countAndRate, dateLabel, monthLabel } from "@/lib/format";
import { useMonth } from "@/lib/month-store";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { addRegion, deleteRegion, getOverview } from "@/lib/server/hr";

export default function Home() {
  const month = useMonth((s) => s.month);
  const setMonth = useMonth((s) => s.setMonth);
  const [editingRegion, setEditingRegion] = useState<EditableRegion | null>(null);
  const [editingPartner, setEditingPartner] = useState<EditablePartner | null>(null);
  const [editingManager, setEditingManager] = useState<{
    regionId: number;
    name: string;
  } | null>(null);
  const [regionOpen, setRegionOpen] = useState(false);
  const [regionName, setRegionName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [managerName, setManagerName] = useState("");
  const queryClient = useQueryClient();
  const access = useAccess();
  const { user } = useCurrentUserState();
  const overview = useQuery({
    queryKey: ["overview", month, user?.id ?? "signed-out"],
    queryFn: () => getOverview({ data: { month } }),
    enabled: Boolean(user),
    retry: 1,
  });

  const createRegion = useMutation({
    mutationFn: () =>
      addRegion({
        data: {
          name: regionName,
          partnerName,
          managerName: access.isAdmin ? managerName : access.managerName,
        },
      }),
    onSuccess: () => {
      toast.success("Bölge Eklendi");
      setRegionOpen(false);
      setRegionName("");
      setPartnerName("");
      setManagerName("");
      void queryClient.invalidateQueries();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Eklenemedi");
    },
  });

  const removeRegion = useMutation({
    mutationFn: (id: number) => deleteRegion({ data: { id } }),
    onSuccess: () => {
      toast.success("Bölge silindi");
      void queryClient.invalidateQueries();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Silinemedi");
    },
  });

  if (overview.isPending) {
    return (
      <>
        <div className="grid gap-4">
          <Skeleton className="h-28" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </>
    );
  }

  if (overview.isError || !overview.data) {
    return (
      <>
        <div className="grid gap-3">
          <p className="text-muted">Özet yüklenemedi.</p>
          <Button type="button" variant="outline" onClick={() => void overview.refetch()}>
            Yeniden Dene
          </Button>
        </div>
      </>
    );
  }

  const data = overview.data;
  const coverage = coverageRate(data.kpis.visitedThisMonth, data.kpis.storeCount);

  return (
    <>
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-subtle uppercase">
              Yönetici Özeti
            </p>
            <h1 className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">
              {monthLabel(data.month)} Saha Tablosu
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {access.role !== "partner" ? (
            <Button type="button" variant="outline" onClick={() => setRegionOpen(true)}>
              <Plus />
              Bölge Ekle
            </Button>
            ) : null}
            <ExcelButton month={month} />
            <MonthSwitch month={month} onChange={setMonth} />
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            icon={LayoutGrid}
            label="Bölge"
            value={String(data.kpis.regionCount)}
            hint="Toplam Bölge"
          />
          <Kpi
            icon={Store}
            label="Mağaza"
            value={String(data.kpis.storeCount)}
            hint="Toplam Mağaza"
          />
          <Kpi
            icon={Store}
            label="Bu Ay Ziyaret"
            value={`${data.kpis.visitedThisMonth}/${data.kpis.storeCount}`}
            hint="En az bir kez gidilen mağaza"
          />
          <Kpi
            icon={Store}
            label="Mağaza Kapsamı"
            value={coverage !== null ? `%${coverage}` : "—"}
            hint="Ziyaret sayısından bağımsız"
          />
          <Kpi
            icon={Clock3}
            label="Ortalama Aralık"
            value={data.kpis.avgGap !== null ? `${data.kpis.avgGap} gün` : "—"}
            hint="Son İki Ziyaret Arası"
          />
          <Kpi
            icon={Clock3}
            label="30 Günü Aşan"
            value={countAndRate(data.kpis.overdueCount, data.kpis.storeCount)}
            hint="Sayı ve toplam mağazaya oranı"
          />
          <Kpi
            icon={Users}
            label="Görüşülen Personel"
            value={String(data.kpis.interviewCount)}
            hint="Bu ayki görüşme kaydı"
          />
          <Kpi
            icon={CheckCircle2}
            label="Plan Tamamlanma"
            value={
              data.kpis.completionRate !== null
                ? `%${data.kpis.completionRate}`
                : "—"
            }
            hint={`${data.kpis.completedPlans}/${data.kpis.plannedVisits} Planlı Ziyaret`}
          />
        </section>

        <ManagerRollups regions={data.regions} />
        <ManagerRollups
          title="İş Ortakları"
          roleLabel="İş Ortağı"
          regions={data.regions.map((region) => ({
            ...region,
            managerName: region.partnerName,
          }))}
        />

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.regions.map((region) => {
            const pct = coverageRate(region.visitedThisMonth, region.storeCount) ?? 0;
            const editable = access.canEdit(region.id);
            const assignable = access.canAssign(region.id);
            return (
              <Card
                key={region.id}
                className="relative h-full p-4 transition-[transform,box-shadow] duration-[var(--motion-quick)] hover:-translate-y-0.5"
              >
                {editable && access.role !== "partner" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-3 right-12 z-10 size-9"
                  aria-label={`${region.name} bölgesini sil`}
                  disabled={removeRegion.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        `${region.name} silinsin mi? Bölgedeki mağazalar ve ziyaret kayıtları da silinir.`,
                      )
                    ) {
                      removeRegion.mutate(region.id);
                    }
                  }}
                >
                  <Trash2 />
                </Button>
                ) : null}
                {editable ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-3 right-3 z-10 size-9"
                  aria-label={`${region.name} adını düzelt`}
                  onClick={() =>
                    setEditingRegion({
                      id: region.id,
                      name: region.name,
                      code: region.code,
                    })
                  }
                >
                  <Pencil />
                </Button>
                ) : null}
                <div className={editable ? "flex items-start gap-3 pr-20" : "flex items-start gap-3"}>
                  <div className="flex shrink-0 -space-x-2">
                    <InitialsBadge name={region.managerName} size="md" />
                    <InitialsBadge
                      name={region.partnerName}
                      initials={region.initials}
                      size="md"
                    />
                  </div>
                  <div className="min-w-0">
                    <Link
                      to="/bolge/$regionId"
                      params={{ regionId: String(region.id) }}
                      className="font-medium hover:underline"
                    >
                      {region.name}
                    </Link>
                    <div className="flex items-center gap-1">
                      <p className="truncate text-sm text-muted">
                        İş Ortağı Müdürü · {region.managerName || "Ad Girilmedi"}
                      </p>
                      {assignable ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0"
                        aria-label={`${region.name} İş Ortağı Müdürü adını düzelt`}
                        onClick={() =>
                          setEditingManager({
                            regionId: region.id,
                            name: region.managerName,
                          })
                        }
                      >
                        <Pencil />
                      </Button>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1">
                      <p className="truncate text-sm text-muted">
                        İş Ortağı · {region.partnerName}
                      </p>
                      {access.isAdmin ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0"
                        aria-label={`${region.partnerName} adını düzelt`}
                        onClick={() =>
                          setEditingPartner({
                            id: region.partnerId,
                            name: region.partnerName,
                          })
                        }
                      >
                        <Pencil />
                      </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
                <Link
                  to="/bolge/$regionId"
                  params={{ regionId: String(region.id) }}
                  className="mt-4 block"
                >
                    <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
                      <span>Mağaza Kapsamı</span>
                      <span className="tabular-nums text-ink">
                        %{pct} · {region.visitedThisMonth}/{region.storeCount}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-bg-warm">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <dt className="text-subtle">Aralık</dt>
                      <dd className="mt-0.5 tabular-nums font-medium">
                        {region.avgGap !== null ? `${region.avgGap}g` : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-subtle">30+ Gün</dt>
                      <dd className="mt-0.5 tabular-nums font-medium">
                        {countAndRate(region.overdueCount, region.storeCount)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-subtle">Plan</dt>
                      <dd className="mt-0.5 tabular-nums font-medium">
                        {region.completionRate !== null ? `%${region.completionRate}` : "—"}
                      </dd>
                    </div>
                  </dl>
                </Link>
              </Card>
            );
          })}
        </section>

        <section>
          <h2 className="mb-3 font-display text-2xl tracking-tight">Mağaza Gün Sayıları</h2>
          <Card className="overflow-hidden p-0">
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="bg-bg-warm/70 text-left text-xs tracking-wide text-muted uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Mağaza</th>
                    <th className="px-4 py-3 font-medium">Bölge / İKİO</th>
                    <th className="px-4 py-3 font-medium">Önceki</th>
                    <th className="px-4 py-3 font-medium">Son</th>
                    <th className="px-4 py-3 font-medium">Gün Farkı</th>
                    <th className="px-4 py-3 font-medium">Bugünden</th>
                    <th className="px-4 py-3 font-medium">Geciken Gün</th>
                  </tr>
                </thead>
                <tbody>
                  {data.attention.map((row) => (
                    <tr key={row.storeId} className="border-t border-line">
                      <td className="px-4 py-3">
                        <Link
                          to="/magaza/$storeId"
                          params={{ storeId: String(row.storeId) }}
                          className="font-medium hover:underline"
                        >
                          {row.storeCode} {row.storeName}
                        </Link>
                        <div className="text-xs text-subtle">{row.district}</div>
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {row.regionName}
                        <div className="text-xs">
                          İş Ortağı Müdürü · {row.managerName || "—"}
                          <br />
                          İş Ortağı · {row.partnerName}
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums">{dateLabel(row.prevVisit)}</td>
                      <td className="px-4 py-3 tabular-nums">{dateLabel(row.lastVisit)}</td>
                      <td className="px-4 py-3">
                        <GapPill days={row.gapDays} />
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {row.daysSince !== null ? `${row.daysSince} gün` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <OverdueDays daysSince={row.daysSince} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 p-3 md:hidden">
              {data.attention.map((row) => (
                <Link
                  key={row.storeId}
                  to="/magaza/$storeId"
                  params={{ storeId: String(row.storeId) }}
                  className="rounded-xl bg-bg p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        {row.storeCode} {row.storeName}
                      </p>
                      <p className="text-xs text-muted">
                        {row.regionName} · İş Ortağı Müdürü {row.managerName || "—"} · İş Ortağı{" "}
                        {row.partnerName}
                      </p>
                    </div>
                    <span className="tabular-nums text-ink">
                      Geciken <OverdueDays daysSince={row.daysSince} />
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    <span>Önceki {dateLabel(row.prevVisit)}</span>
                    <span>Son {dateLabel(row.lastVisit)}</span>
                    <span className="text-ink">
                      Fark {row.gapDays !== null ? `${row.gapDays} gün` : "—"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </section>
      </div>
      <RegionEditDialog
        open={Boolean(editingRegion)}
        onOpenChange={(open) => {
          if (!open) setEditingRegion(null);
        }}
        region={editingRegion}
      />
      <PartnerEditDialog
        open={Boolean(editingPartner)}
        onOpenChange={(open) => {
          if (!open) setEditingPartner(null);
        }}
        partner={editingPartner}
      />
      <ManagerEditDialog
        open={Boolean(editingManager)}
        onOpenChange={(open) => {
          if (!open) setEditingManager(null);
        }}
        regionId={editingManager?.regionId ?? null}
        name={editingManager?.name ?? ""}
      />
      <Dialog open={regionOpen} onOpenChange={setRegionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bölge Ekle</DialogTitle>
            <DialogDescription>
              Yeni bölge, İş Ortağı ve İş Ortağı Müdürü açılır. Mağazaları bölge sayfasından
              ekleyebilirsiniz.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              createRegion.mutate();
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="new-region">Bölge Adı</Label>
              <Input
                id="new-region"
                value={regionName}
                onChange={(event) => setRegionName(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-partner">İş Ortağı</Label>
              <Input
                id="new-partner"
                value={partnerName}
                onChange={(event) => setPartnerName(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-manager">İş Ortağı Müdürü</Label>
              <Input
                id="new-manager"
                value={access.isAdmin ? managerName : access.managerName}
                readOnly={!access.isAdmin}
                onChange={(event) => setManagerName(event.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={createRegion.isPending}>
                {createRegion.isPending ? "Ekleniyor…" : "Ekle"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  warn,
}: {
  icon: typeof Store;
  label: string;
  value: string;
  hint: string;
  warn?: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted">
        <Icon className="size-4" />
        <span className="text-xs font-medium tracking-wide uppercase">{label}</span>
      </div>
      <p
        className={`mt-2 font-display text-3xl tracking-tight tabular-nums ${warn ? "text-bad" : ""}`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-subtle">{hint}</p>
    </Card>
  );
}
