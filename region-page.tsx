import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAccess } from "@/components/access-context";
import { ManagerEditDialog } from "@/components/manager-edit-dialog";
import { InitialsBadge } from "@/components/initials-badge";
import { MonthSwitch } from "@/components/month-switch";
import { RegionEditDialog } from "@/components/region-edit-dialog";
import { PartnerEditDialog } from "@/components/partner-edit-dialog";
import { StoreEditDialog, type EditableStore } from "@/components/store-edit-dialog";
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
import { VisitDialog } from "@/components/visit-dialog";
import { countAndRate, dateLabel, dateLabelLong, focusLabel, visitTypeLabel } from "@/lib/format";
import { useMonth } from "@/lib/month-store";
import { addStore, deleteRegion, deleteStore, getRegionDetail } from "@/lib/server/hr";

export default function RegionPage() {
  const { regionId } = useParams({ from: "/bolge/$regionId" });
  const id = Number(regionId);
  const navigate = useNavigate();
  const month = useMonth((s) => s.month);
  const setMonth = useMonth((s) => s.setMonth);
  const queryClient = useQueryClient();
  const access = useAccess();
  const editable = access.canEdit(id);
  const assignable = access.canAssign(id);
  const [visitOpen, setVisitOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<EditableStore | null>(null);
  const [editingRegion, setEditingRegion] = useState(false);
  const [district, setDistrict] = useState("");
  const [storeName, setStoreName] = useState("");
  const [query, setQuery] = useState("");

  const detail = useQuery({
    queryKey: ["region", id, month],
    queryFn: () => getRegionDetail({ data: { regionId: id, month } }),
    enabled: Number.isFinite(id),
  });

  const createStore = useMutation({
    mutationFn: () =>
      addStore({
        data: { regionId: id, district, name: storeName },
      }),
    onSuccess: (result) => {
      toast.success(`${result.code} eklendi`);
      setStoreOpen(false);
      setDistrict("");
      setStoreName("");
      void queryClient.invalidateQueries();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Eklenemedi");
    },
  });

  const removeStore = useMutation({
    mutationFn: (storeId: number) => deleteStore({ data: { id: storeId } }),
    onSuccess: () => {
      toast.success("Mağaza silindi");
      void queryClient.invalidateQueries();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Silinemedi");
    },
  });

  const removeRegion = useMutation({
    mutationFn: () => deleteRegion({ data: { id } }),
    onSuccess: () => {
      toast.success("Bölge silindi");
      void queryClient.invalidateQueries();
      void navigate({ to: "/" });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Silinemedi");
    },
  });

  const stores = useMemo(() => {
    const rows = detail.data?.stores ?? [];
    const q = query.trim().toLocaleLowerCase("tr");
    if (!q) return rows;
    return rows.filter((store) =>
      `${store.code} ${store.name} ${store.district}`.toLocaleLowerCase("tr").includes(q),
    );
  }, [detail.data?.stores, query]);

  if (detail.isPending) {
    return (
      <>
        <Skeleton className="h-40" />
      </>
    );
  }

  if (!detail.data) {
    return (
      <>
        <p className="text-muted">Bölge bulunamadı.</p>
      </>
    );
  }

  const data = detail.data;
  const coverage = data.kpis.storeCount
    ? Math.round((data.kpis.visitedThisMonth / data.kpis.storeCount) * 100)
    : 0;

  return (
    <>
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-subtle uppercase">
              Bölge Programı
            </p>
            <div className="mt-1 flex items-center gap-2">
              <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
                {data.region.name}
              </h1>
              {editable ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11 shrink-0"
                aria-label="Bölge Adını düzelt"
                onClick={() => setEditingRegion(true)}
              >
                <Pencil />
              </Button>
              ) : null}
            </div>
            <div className="mt-2 flex flex-col gap-1 text-sm text-muted">
              <div className="flex items-center gap-1">
                <InitialsBadge name={data.managerName} />
                <span>İş Ortağı Müdürü</span>
                <span className="font-medium text-ink">
                  {data.managerName || "Ad Girilmedi"}
                </span>
                {assignable ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9"
                  aria-label="İş Ortağı Müdürü adını düzelt"
                  onClick={() => setManagerOpen(true)}
                >
                  <Pencil />
                </Button>
                ) : null}
              </div>
              <div className="flex items-center gap-1">
                <InitialsBadge name={data.region.partnerName} initials={data.region.initials} />
                <span>İş Ortağı · {data.region.partnerName}</span>
                {access.isAdmin ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9"
                  aria-label="İş Ortağı adını düzelt"
                  onClick={() => setPartnerOpen(true)}
                >
                  <Pencil />
                </Button>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <MonthSwitch month={month} onChange={setMonth} />
            {editable && access.role !== "partner" ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (
                  window.confirm(
                    `${data.region.name} silinsin mi? Bölgedeki mağazalar ve ziyaret kayıtları da silinir.`,
                  )
                ) {
                  removeRegion.mutate();
                }
              }}
            >
              <Trash2 />
              Bölgeyi sil
            </Button>
            ) : null}
            {editable ? (
              <>
            <Button variant="outline" onClick={() => setStoreOpen(true)}>
              <Plus />
              Mağaza Ekle
            </Button>
            <Button onClick={() => setVisitOpen(true)}>
              <Plus />
              Ziyaret
            </Button>
              </>
            ) : null}
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">Bu Ay Kapsama</p>
            <p className="mt-2 font-display text-3xl tabular-nums">
              {data.kpis.visitedThisMonth}/{data.kpis.storeCount}
            </p>
            <p className="text-xs text-subtle">%{coverage}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">
              Ortalama gün farkı
            </p>
            <p className="mt-2 font-display text-3xl tabular-nums">
              {data.kpis.avgGap !== null ? `${data.kpis.avgGap}` : "—"}
            </p>
            <p className="text-xs text-subtle">Son İki Ziyaret Arası</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">30 Günü Aşan</p>
            <p className="mt-2 font-display text-3xl tabular-nums">
              {countAndRate(data.kpis.overdueCount, data.kpis.storeCount)}
            </p>
            <p className="text-xs text-subtle">Sayı ve bölgedeki mağazaya oranı</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">Plan Tamamlanma</p>
            <p className="mt-2 font-display text-3xl tabular-nums">
              {data.kpis.completionRate !== null ? `%${data.kpis.completionRate}` : "—"}
            </p>
            <p className="text-xs text-subtle">
              {data.kpis.completedPlans}/{data.kpis.plannedVisits} ziyaret
            </p>
          </Card>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-2xl tracking-tight">Mağaza Programı</h2>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Mağaza veya ilçe ara"
            className="sm:max-w-64"
          />
        </div>

        <Card className="overflow-hidden p-0">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="bg-bg-warm/70 text-left text-xs tracking-wide text-muted uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Mağaza</th>
                  <th className="px-4 py-3 font-medium">Plan Tarihi</th>
                  <th className="px-4 py-3 font-medium">Önceki Ziyaret</th>
                  <th className="px-4 py-3 font-medium">Son Ziyaret</th>
                  <th className="px-4 py-3 font-medium">Gün Farkı</th>
                  <th className="px-4 py-3 font-medium">Bugünden</th>
                  <th className="px-4 py-3 font-medium">Geciken Gün</th>
                </tr>
              </thead>
              <tbody>
                {stores.map((store) => (
                  <tr key={store.id} className="border-t border-line">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-1">
                        <div className="min-w-0 flex-1">
                          <Link
                            to="/magaza/$storeId"
                            params={{ storeId: String(store.id) }}
                            className="font-medium hover:underline"
                          >
                            {store.name}
                          </Link>
                          <div className="text-xs text-subtle">
                            {store.district} · {store.visitCount} kayıt
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-9 shrink-0"
                          aria-label={`${store.name} adını düzelt`}
                          onClick={() =>
                            setEditingStore({
                              id: store.id,
                              name: store.name,
                              district: store.district,
                              city: store.city,
                              code: store.code,
                            })
                          }
                        >
                          <Pencil />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-9 shrink-0"
                          aria-label={`${store.name} mağazasını sil`}
                          disabled={removeStore.isPending}
                          onClick={() => {
                            if (
                              window.confirm(
                                `${store.name} silinsin mi? Bu mağazanın ziyaret kayıtları da silinir.`,
                              )
                            ) {
                              removeStore.mutate(store.id);
                            }
                          }}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted">
                      {store.nextPlanDate ? dateLabel(store.nextPlanDate) : "—"}
                      {store.nextPlanStatus === "tamamlandi" ? (
                        <span className="ml-2 text-good">Tamam</span>
                      ) : store.visitedThisMonth ? (
                        <span className="ml-2 text-good">Yapıldı</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{dateLabel(store.prevVisit)}</td>
                    <td className="px-4 py-3 tabular-nums">{dateLabel(store.lastVisit)}</td>
                    <td className="px-4 py-3">
                      <GapPill days={store.gapDays} />
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {store.daysSince !== null ? `${store.daysSince} gün` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <OverdueDays daysSince={store.daysSince} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 p-3 md:hidden">
            {stores.map((store) => (
              <div key={store.id} className="rounded-xl bg-bg p-3">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    to="/magaza/$storeId"
                    params={{ storeId: String(store.id) }}
                    className="min-w-0"
                  >
                    <p className="font-medium">{store.name}</p>
                    <p className="text-xs text-muted">{store.district}</p>
                  </Link>
                  <div className="flex items-center gap-1">
                    <span className="text-xs tabular-nums text-muted">
                      Geciken <OverdueDays daysSince={store.daysSince} />
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9"
                      aria-label={`${store.name} adını düzelt`}
                      onClick={() =>
                        setEditingStore({
                          id: store.id,
                          name: store.name,
                          district: store.district,
                          city: store.city,
                          code: store.code,
                        })
                      }
                    >
                      <Pencil />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9"
                      aria-label={`${store.name} mağazasını sil`}
                      disabled={removeStore.isPending}
                      onClick={() => {
                        if (
                          window.confirm(
                            `${store.name} silinsin mi? Bu mağazanın ziyaret kayıtları da silinir.`,
                          )
                        ) {
                          removeStore.mutate(store.id);
                        }
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  <span>Son {dateLabel(store.lastVisit)}</span>
                  <span>Önceki {dateLabel(store.prevVisit)}</span>
                  <span className="text-ink">
                    {store.gapDays !== null ? `${store.gapDays} gün fark` : "tek ziyaret"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <section>
          <h2 className="mb-3 font-display text-2xl tracking-tight">Son Ziyaretler</h2>
          <div className="grid gap-3">
            {data.recentVisits.length === 0 ? (
              <Card className="p-5 text-sm text-muted">Bu bölgede henüz ziyaret kaydı yok.</Card>
            ) : (
              data.recentVisits.map((visit) => (
                <Card key={visit.id} className="p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <Link
                        to="/magaza/$storeId"
                        params={{ storeId: String(visit.storeId) }}
                        className="font-medium hover:underline"
                      >
                        {visit.storeName}
                      </Link>
                      <p className="text-sm text-muted">
                        {dateLabelLong(visit.visitDate)} · {visitTypeLabel(visit.visitType)} ·{" "}
                        {focusLabel(visit.focus)}
                      </p>
                    </div>
                    {visit.gapFromPrevious !== null ? (
                      <span className="rounded-full bg-bg-warm px-2.5 py-1 text-xs font-medium tabular-nums">
                        öncekiyle {visit.gapFromPrevious} gün
                      </span>
                    ) : (
                      <span className="text-xs text-subtle">İlk Kayıt</span>
                    )}
                  </div>
                  {visit.notes ? <p className="mt-2 text-sm">{visit.notes}</p> : null}
                </Card>
              ))
            )}
          </div>
        </section>
      </div>

      <VisitDialog
        open={visitOpen}
        onOpenChange={setVisitOpen}
        regionId={data.region.id}
      />

      <StoreEditDialog
        open={Boolean(editingStore)}
        onOpenChange={(open) => {
          if (!open) setEditingStore(null);
        }}
        store={editingStore}
      />

      <RegionEditDialog
        open={editingRegion}
        onOpenChange={setEditingRegion}
        region={{
          id: data.region.id,
          name: data.region.name,
          code: data.region.code,
        }}
      />

      <ManagerEditDialog
        open={managerOpen}
        onOpenChange={setManagerOpen}
        regionId={data.region.id}
        name={data.managerName}
      />
      <PartnerEditDialog
        open={partnerOpen}
        onOpenChange={setPartnerOpen}
        partner={{ id: data.region.partnerId, name: data.region.partnerName }}
      />

      <Dialog open={storeOpen} onOpenChange={setStoreOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mağaza Ekle</DialogTitle>
            <DialogDescription>
              Bölgeye yeni bir saha noktası ekler. Kod otomatik üretilir.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              createStore.mutate();
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="district">İlçe / Lokasyon</Label>
              <Input
                id="district"
                value={district}
                onChange={(event) => setDistrict(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="store-name">Mağaza Adı</Label>
              <Input
                id="store-name"
                value={storeName}
                onChange={(event) => setStoreName(event.target.value)}
                placeholder="Örn. Merkez Mağazası"
                required
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={createStore.isPending}>
                Ekle
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
