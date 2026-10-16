import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Check, Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAccess } from "@/components/access-context";
import { DayEditor } from "@/components/day-editor";
import { InitialsBadge } from "@/components/initials-badge";
import { ManagerEditDialog } from "@/components/manager-edit-dialog";
import { PartnerEditDialog, type EditablePartner } from "@/components/partner-edit-dialog";
import { ManagerRollups } from "@/components/manager-rollups";
import { MonthSwitch } from "@/components/month-switch";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  dateLabel,
  dayKindShort,
  dayNumber,
  monthWeeks,
  storeShortName,
  WEEKDAYS_TR,
} from "@/lib/format";
import { useMonth } from "@/lib/month-store";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { completeVisitPlan, getProgram } from "@/lib/server/hr";
import type { DayEntry, ProgramRegion } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function ProgramPage() {
  const month = useMonth((s) => s.month);
  const setMonth = useMonth((s) => s.setMonth);
  const { user } = useCurrentUserState();
  const board = useQuery({
    queryKey: ["program", month, user?.id ?? "signed-out"],
    queryFn: () => getProgram({ data: { month } }),
    enabled: Boolean(user),
  });
  const [editingManager, setEditingManager] = useState<{
    regionId: number;
    name: string;
  } | null>(null);
  const [editingPartner, setEditingPartner] = useState<EditablePartner | null>(null);

  if (board.isPending) {
    return (
      <>
        <Skeleton className="h-64" />
      </>
    );
  }

  if (!board.data) {
    return (
      <>
        <p className="text-muted">Program yüklenemedi.</p>
      </>
    );
  }

  const data = board.data;
  const weeks = monthWeeks(data.month);

  return (
    <>
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-subtle uppercase">
              Günlük Çalışma Programı
            </p>
            <h1 className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">
              Aylık Saha Takvimi
            </h1>
          </div>
          <MonthSwitch month={month} onChange={setMonth} />
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">Bölge</p>
            <p className="mt-2 font-display text-3xl tabular-nums">{data.regions.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">Mağaza</p>
            <p className="mt-2 font-display text-3xl tabular-nums">
              {data.regions.reduce((sum, region) => sum + region.stores.length, 0)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">Planlı Ziyaret</p>
            <p className="mt-2 font-display text-3xl tabular-nums">
              {data.regions.reduce((sum, region) => sum + region.kpis.plannedVisits, 0)}
            </p>
          </Card>
        </section>

        <ManagerRollups
          mode="plan"
          regions={data.regions.map((region) => ({
            managerName: region.managerName,
            storeCount: region.stores.length,
            visitedThisMonth: 0,
            avgGap: null,
            overdueCount: 0,
            interviewCount: 0,
            plannedVisits: region.kpis.plannedVisits,
            completedPlans: region.kpis.completedPlans,
          }))}
        />

        <Tabs defaultValue={String(data.regions[0]?.id ?? "")}>
          <div className="overflow-x-auto">
            <TabsList className="h-auto min-h-11 w-max">
              {data.regions.map((region) => (
                <TabsTrigger key={region.id} value={String(region.id)} className="px-3">
                  {region.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {data.regions.map((region) => (
            <TabsContent key={region.id} value={String(region.id)}>
              <RegionProgram
                region={region}
                month={data.month}
                today={data.today}
                weeks={weeks}
                managerName={region.managerName}
                onEditManager={() =>
                  setEditingManager({ regionId: region.id, name: region.managerName })
                }
                onEditPartner={() =>
                  setEditingPartner({ id: region.partnerId, name: region.partnerName })
                }
              />
            </TabsContent>
          ))}
        </Tabs>
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

function RegionProgram({
  region,
  month,
  today,
  weeks,
  managerName,
  onEditManager,
  onEditPartner,
}: {
  region: ProgramRegion;
  month: string;
  today: string;
  weeks: (string | null)[][];
  managerName: string;
  onEditManager: () => void;
  onEditPartner: () => void;
}) {
  const queryClient = useQueryClient();
  const access = useAccess();
  const editable = access.canEdit(region.id);
  const assignable = access.canAssign(region.id);
  const [editDate, setEditDate] = useState<string | null>(null);
  const byDate = useMemo(() => {
    const map = new Map<string, DayEntry[]>();
    for (const entry of region.entries) {
      const list = map.get(entry.workDate) ?? [];
      list.push(entry);
      map.set(entry.workDate, list);
    }
    return map;
  }, [region.entries]);

  const complete = useMutation({
    mutationFn: (id: number) => completeVisitPlan({ data: { id } }),
    onSuccess: () => {
      toast.success("Ziyaret tamamlandı olarak işlendi");
      void queryClient.invalidateQueries();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "İşlenemedi");
    },
  });

  const rate = region.kpis.completionRate;
  const openDate = editDate;
  const openEntries = openDate ? (byDate.get(openDate) ?? []) : [];

  return (
    <div className="grid gap-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <InitialsBadge name={managerName} />
              <p className="font-medium">
                İş Ortağı Müdürü · {managerName || "Ad Girilmedi"}
              </p>
              {assignable ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9"
                aria-label="İş Ortağı Müdürü adını düzelt"
                onClick={onEditManager}
              >
                <Pencil />
              </Button>
              ) : null}
            </div>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted">
              <InitialsBadge name={region.partnerName} initials={region.initials} />
              İş Ortağı · {region.partnerName}
              {access.isAdmin ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9"
                aria-label="İş Ortağı adını düzelt"
                onClick={onEditPartner}
              >
                <Pencil />
              </Button>
              ) : null}
            </p>
            <p className="text-sm text-muted">
              {region.kpis.completedPlans}/{region.kpis.plannedVisits} Planlı Ziyaret Tamam · izin{" "}
              {region.kpis.leaveDays} gün · eğitim {region.kpis.trainingDays} gün
            </p>
          </div>
          <p className="font-display text-3xl tabular-nums">{rate !== null ? `%${rate}` : "—"}</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-warm">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${rate ?? 0}%` }}
          />
        </div>
      </Card>

      <Legend />

      <Card className="overflow-hidden p-0">
        <div className="grid grid-cols-7 border-b border-line bg-bg-warm/70 text-center text-xs font-medium tracking-wide text-muted uppercase">
          {WEEKDAYS_TR.map((day) => (
            <div key={day} className="px-1 py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {weeks.flat().map((date, index) => {
            if (!date || !date.startsWith(month)) {
              return <div key={`empty-${index}`} className="min-h-24 border-t border-line bg-bg/50" />;
            }
            const entries = byDate.get(date) ?? [];
            const isToday = date === today;
            return (
              <button
                key={date}
                type="button"
                onClick={() => {
                  if (editable) setEditDate(date);
                }}
                className={cn(
                  "min-h-24 border-t border-l border-line p-1.5 text-left align-top transition-colors duration-[var(--motion-quick)] hover:bg-bg-warm/60",
                  isToday && "bg-primary/5",
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
                    isToday ? "bg-primary text-primary-fg" : "text-muted",
                  )}
                >
                  {dayNumber(date)}
                </span>
                <div className="mt-1 grid gap-1">
                  {entries.slice(0, 3).map((entry) => (
                    <DayChip key={entry.id} entry={entry} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <section>
        <h2 className="mb-3 font-display text-2xl tracking-tight">Ziyaret Gerçekleşmesi</h2>
        <Card className="overflow-hidden p-0">
          {region.plannedVisits.length === 0 ? (
            <p className="p-5 text-sm text-muted">Bu ay henüz Planlı Ziyaret yok. Takvimden gün seçin.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-bg-warm/70 text-left text-xs tracking-wide text-muted uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Tarih</th>
                    <th className="px-4 py-3 font-medium">Mağaza</th>
                    <th className="px-4 py-3 font-medium">Durum</th>
                    <th className="px-4 py-3 font-medium">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {region.plannedVisits.map((visit) => (
                    <tr key={visit.id} className="border-t border-line">
                      <td className="px-4 py-2.5 tabular-nums">{dateLabel(visit.workDate)}</td>
                      <td className="px-4 py-2.5">
                        <Link
                          to="/magaza/$storeId"
                          params={{ storeId: String(visit.storeId) }}
                          className="font-medium hover:underline"
                        >
                          {visit.storeName}
                        </Link>
                        <div className="text-xs text-subtle">{visit.district}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        {visit.status === "tamamlandi" ? (
                          <span className="rounded-full bg-good-bg px-2.5 py-1 text-xs font-medium text-good">
                            Tamamlandı
                          </span>
                        ) : (
                          <span className="rounded-full bg-warn-bg px-2.5 py-1 text-xs font-medium text-warn">
                            Planlandı
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {visit.status === "tamamlandi" ? (
                          <span className="inline-flex items-center gap-1 text-xs text-good">
                            <Check className="size-3.5" />
                            işlendi
                          </span>
                        ) : editable ? (
                          <Button
                            size="sm"
                            onClick={() => complete.mutate(visit.id)}
                            disabled={complete.isPending}
                          >
                            Tamamlandı
                          </Button>
                        ) : (
                          <span className="text-xs text-subtle">Planlandı</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      {openDate ? (
        <DayEditor
          open
          onOpenChange={(next) => {
            if (!next) setEditDate(null);
          }}
          regionId={region.id}
          workDate={openDate}
          entries={openEntries}
          stores={region.stores}
        />
      ) : null}
    </div>
  );
}

function DayChip({ entry }: { entry: DayEntry }) {
  const label =
    entry.kind === "visit"
      ? storeShortName(entry.storeName ?? "Ziyaret")
      : dayKindShort(entry.kind);
  return (
    <span
      title={entry.notes || undefined}
      className={cn(
        "block truncate rounded-md px-1.5 py-0.5 text-xs leading-4 font-medium",
        chipClass(entry),
      )}
    >
      {entry.kind === "visit" && entry.status === "tamamlandi" ? "✓ " : ""}
      {label}
    </span>
  );
}

function chipClass(entry: DayEntry) {
  if (entry.kind === "visit") {
    return entry.status === "tamamlandi"
      ? "bg-good-bg text-good"
      : "bg-primary/10 text-primary";
  }
  if (entry.kind === "resmi_tatil") return "bg-bg-warm text-muted";
  if (entry.kind === "hafta_tatili") return "bg-bg text-subtle";
  if (entry.kind === "egitim") return "bg-primary/10 text-primary";
  if (entry.kind === "rapor") return "bg-bad-bg text-bad";
  return "bg-warn-bg text-warn";
}

function Legend() {
  const items = [
    { label: "Planlı Ziyaret", className: "bg-primary/10 text-primary" },
    { label: "Tamamlanan Ziyaret", className: "bg-good-bg text-good" },
    { label: "İzin / Mazeret", className: "bg-warn-bg text-warn" },
    { label: "Rapor", className: "bg-bad-bg text-bad" },
    { label: "Eğitim", className: "bg-primary/10 text-primary" },
    { label: "HT Hafta Tatili", className: "bg-bg text-subtle" },
    { label: "RT Resmi Tatil", className: "bg-bg-warm text-muted" },
  ];
  return (
    <div className="flex flex-wrap gap-2 text-xs text-muted">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span className={cn("size-2.5 rounded-sm", item.className.split(" ")[0])} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
