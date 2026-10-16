import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAccess } from "@/components/access-context";
import { GapMeter } from "@/components/gap-meter";
import { VISIT_QUESTIONS } from "@/lib/catalog";
import { InitialsBadge } from "@/components/initials-badge";
import { MonthSwitch } from "@/components/month-switch";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { VisitDialog } from "@/components/visit-dialog";
import { ManagerEditDialog } from "@/components/manager-edit-dialog";
import { PartnerEditDialog } from "@/components/partner-edit-dialog";
import { StoreEditDialog } from "@/components/store-edit-dialog";
import {
  dateLabelLong,
  daysBetween,
  focusLabel,
  suggestedNextVisit,
  TARGET_GAP_DAYS,
  todayISO,
  overdueDays,
  visitTypeLabel,
} from "@/lib/format";
import { useMonth } from "@/lib/month-store";
import { deleteVisit, getStoreDetail, getVisitQuestions } from "@/lib/server/hr";

export default function StorePage() {
  const { storeId } = useParams({ from: "/magaza/$storeId" });
  const id = Number(storeId);
  const month = useMonth((s) => s.month);
  const setMonth = useMonth((s) => s.setMonth);
  const queryClient = useQueryClient();
  const access = useAccess();
  const [visitOpen, setVisitOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [planDate, setPlanDate] = useState(todayISO());

  const detail = useQuery({
    queryKey: ["store", id, month],
    queryFn: () => getStoreDetail({ data: { storeId: id, month } }),
    enabled: Number.isFinite(id),
  });
  const questions = useQuery({
    queryKey: ["visit-questions"],
    queryFn: () => getVisitQuestions(),
  });

  const remove = useMutation({
    mutationFn: (visitId: number) => deleteVisit({ data: { id: visitId } }),
    onSuccess: () => {
      toast.success("Ziyaret silindi");
      void queryClient.invalidateQueries();
    },
  });

  const plannedGap = useMemo(() => {
    const last = detail.data?.lastVisit;
    if (!last || !planDate) return null;
    return daysBetween(last, planDate);
  }, [detail.data?.lastVisit, planDate]);

  if (detail.isPending) {
    return (
      <>
        <Skeleton className="h-48" />
      </>
    );
  }

  if (!detail.data) {
    return (
      <>
        <p className="text-muted">Mağaza Bulunamadı.</p>
      </>
    );
  }

  const data = detail.data;
  const editable = access.canEdit(data.region.id);
  const assignable = access.canAssign(data.region.id);
  const suggested = suggestedNextVisit(data.lastVisit);

  return (
    <>
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-subtle uppercase">
              <Link
                to="/bolge/$regionId"
                params={{ regionId: String(data.region.id) }}
                className="hover:underline"
              >
                {data.region.name}
              </Link>
            </p>
            <h1 className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">
              {data.store.name}
            </h1>
            <div className="mt-2 flex items-center gap-1 text-sm text-muted">
              <InitialsBadge name={data.managerName} />
              <span>İş Ortağı Müdürü</span>
              <span className="font-medium text-ink">{data.managerName || "Ad Girilmedi"}</span>
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
            <p className="flex items-center gap-2 text-sm text-muted">
              <InitialsBadge name={data.region.partnerName} initials={data.region.initials} />
              İş Ortağı · {data.region.partnerName}
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
            </p>
            <p className="text-sm text-muted">
              {data.store.district}, {data.store.city}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <MonthSwitch month={month} onChange={setMonth} />
            {editable ? (
              <>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil />
              Düzenle
            </Button>
            <Button onClick={() => setVisitOpen(true)}>
              <Plus />
              Ziyaret Kaydet
            </Button>
              </>
            ) : null}
          </div>
        </header>

        <section className="grid gap-3 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">
              İki ziyaret arası gün farkı
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-6">
              <div>
                <p className="text-xs text-subtle">Son İki Ziyaret</p>
                <p className="mt-1 font-display text-5xl tracking-tight tabular-nums">
                  {data.gapDays !== null ? data.gapDays : "—"}
                </p>
                <p className="text-xs text-muted">hedef {TARGET_GAP_DAYS} gün</p>
              </div>
              <div className="min-w-0 flex-1">
                <GapMeter
                  prevVisit={data.prevVisit}
                  lastVisit={data.lastVisit}
                  today={data.today}
                  gapDays={data.gapDays}
                  daysSince={data.daysSince}
                />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="text-sm text-muted">
                Geciken Gün{" "}
                <span className="tabular-nums text-ink">
                  {overdueDays(data.daysSince) !== null
                    ? `${overdueDays(data.daysSince)} gün`
                    : "—"}
                </span>
              </span>
              <span className="text-sm text-muted">
                Son Ziyaretten Bu Yana{" "}
                <span className="tabular-nums text-ink">
                  {data.daysSince !== null ? `${data.daysSince} gün` : "kayıt yok"}
                </span>
              </span>
              {suggested ? (
                <span className="text-sm text-muted">
                  Önerilen sonraki ziyaret{" "}
                  <span className="text-ink">{dateLabelLong(suggested)}</span>
                </span>
              ) : null}
            </div>
            {data.plans.length > 0 ? (
              <div className="mt-5 border-t border-line pt-4">
                <p className="text-xs font-medium tracking-wide text-muted uppercase">
                  Bu ayki plan
                </p>
                <ul className="mt-2 grid gap-1.5 text-sm">
                  {data.plans.map((plan) => (
                    <li key={plan.date} className="flex items-center justify-between gap-2">
                      <span>{dateLabelLong(plan.date)}</span>
                      <span
                        className={
                          plan.status === "tamamlandi" ? "text-good" : "text-warn"
                        }
                      >
                        {plan.status === "tamamlandi" ? "Tamamlandı" : "Planlandı"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Card>

          <Card className="p-5">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">
              Plan Tarihi hesabı
            </p>
            <p className="mt-2 text-sm text-muted">
              Bir sonraki ziyaret tarihini girin; son kayıtla arasındaki günü görün.
            </p>
            <div className="mt-4 grid gap-2">
              <Label htmlFor="plan-date">Plan Tarihi</Label>
              <Input
                id="plan-date"
                type="date"
                value={planDate}
                onChange={(event) => setPlanDate(event.target.value)}
              />
            </div>
            <p className="mt-4 font-display text-3xl tabular-nums">
              {plannedGap !== null ? `${plannedGap} gün` : "—"}
            </p>
            {plannedGap !== null ? (
              <p className="mt-1 text-xs text-subtle">
                {plannedGap > TARGET_GAP_DAYS
                  ? `hedeften ${plannedGap - TARGET_GAP_DAYS} gün uzun`
                  : plannedGap === TARGET_GAP_DAYS
                    ? "hedef ritimde"
                    : `hedeften ${TARGET_GAP_DAYS - plannedGap} gün kısa`}
              </p>
            ) : null}
          </Card>
        </section>

        <section>
          <h2 className="mb-3 font-display text-2xl tracking-tight">Ziyaret Geçmişi</h2>
          <div className="grid gap-3">
            {data.visits.length === 0 ? (
              <Card className="p-6 text-sm text-muted">
                Bu mağaza için henüz ziyaret yok. İlk kaydı ekleyin; ikinci ziyaretten itibaren gün
                farkı hesaplanır.
              </Card>
            ) : (
              data.visits.map((visit, index) => {
                const older = data.visits[index + 1];
                return (
                  <Card key={visit.id} className="p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-medium">{dateLabelLong(visit.visitDate)}</p>
                        <p className="text-sm text-muted">
                          {visitTypeLabel(visit.visitType)} · {focusLabel(visit.focus)} ·{" "}
                          {visit.partnerName}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {visit.gapFromPrevious !== null ? (
                          <span className="rounded-full bg-bg-warm px-2.5 py-1 text-xs font-medium tabular-nums">
                            öncekiyle {visit.gapFromPrevious} gün
                          </span>
                        ) : (
                          <span className="text-xs text-subtle">İlk Kayıt</span>
                        )}
                        {editable ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-9 text-muted hover:text-bad"
                          aria-label="Ziyareti sil"
                          onClick={() => remove.mutate(visit.id)}
                        >
                          <Trash2 />
                        </Button>
                        ) : null}
                      </div>
                    </div>
                    {visit.notes ? <p className="mt-3 text-sm text-ink">{visit.notes}</p> : null}
                    {visit.interviews.length > 0 ? (
                      <ul className="mt-3 grid gap-2">
                        {visit.interviews.map((person) => (
                          <li key={`${person.name}-${person.position}-${person.notes}`} className="text-sm">
                            <p className="font-medium">
                              {person.name}
                              {person.position ? (
                                <span className="font-normal text-muted"> · {person.position}</span>
                              ) : null}
                            </p>
                            {person.notes ? <p className="text-muted">{person.notes}</p> : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {visit.answers.length > 0 ? (
                      <ul className="mt-3 grid gap-2 border-t border-line pt-3">
                        {visit.answers.map((item) => {
                          const question =
                            questions.data?.find((q) => q.id === item.questionId) ??
                            VISIT_QUESTIONS.find((q) => q.id === item.questionId);
                          return (
                            <li key={item.questionId} className="text-sm">
                              <p className="text-muted">{question?.text ?? item.questionId}</p>
                              <p>{item.answer}</p>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                    {visit.nextAction ? (
                      <p className="mt-2 text-sm text-muted">Aksiyon: {visit.nextAction}</p>
                    ) : null}
                    {older ? (
                      <p className="mt-3 border-t border-line pt-3 text-xs text-subtle">
                        Bir önceki kayıt {dateLabelLong(older.visitDate)}
                      </p>
                    ) : null}
                  </Card>
                );
              })
            )}
          </div>
        </section>
      </div>
      <VisitDialog
        open={visitOpen}
        onOpenChange={setVisitOpen}
        regionId={data.region.id}
        storeId={data.store.id}
      />
      <StoreEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        store={{
          id: data.store.id,
          name: data.store.name,
          district: data.store.district,
          city: data.store.city,
          code: data.store.code,
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
    </>
  );
}
