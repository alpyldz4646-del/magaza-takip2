import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DAY_KINDS, PLAN_STATUSES, type DayKindId, type PlanStatus } from "@/lib/catalog";
import { dateLabelLong, holidayName, isWeekend } from "@/lib/format";
import { clearDayPlan, saveDayPlan } from "@/lib/server/hr";
import type { DayEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

type StoreOption = { id: number; code: string; name: string; district: string };

export function DayEditor({
  open,
  onOpenChange,
  regionId,
  workDate,
  entries,
  stores,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  regionId: number;
  workDate: string;
  entries: DayEntry[];
  stores: StoreOption[];
}) {
  const queryClient = useQueryClient();
  const initialKind = (entries[0]?.kind ?? "visit") as DayKindId;
  const [kind, setKind] = useState<DayKindId>(initialKind);
  const [store1, setStore1] = useState("");
  const [status1, setStatus1] = useState<PlanStatus>("planlandi");
  const [store2, setStore2] = useState("");
  const [status2, setStatus2] = useState<PlanStatus>("planlandi");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    const nextKind = (entries[0]?.kind ??
      (holidayName(workDate) ? "resmi_tatil" : isWeekend(workDate) ? "hafta_tatili" : "visit")) as DayKindId;
    setKind(nextKind);
    const visits = entries.filter((e) => e.kind === "visit");
    setStore1(visits[0]?.storeId ? String(visits[0].storeId) : "");
    setStatus1(visits[0]?.status ?? "planlandi");
    setStore2(visits[1]?.storeId ? String(visits[1].storeId) : "");
    setStatus2(visits[1]?.status ?? "planlandi");
    setNotes(entries[0]?.notes ?? holidayName(workDate) ?? "");
  }, [entries, open, workDate]);

  const store2Options = useMemo(
    () => stores.filter((store) => String(store.id) !== store1),
    [store1, stores],
  );

  const save = useMutation({
    mutationFn: () => {
      const visits =
        kind === "visit"
          ? [
              store1
                ? { storeId: Number(store1), status: status1 }
                : null,
              store2
                ? { storeId: Number(store2), status: status2 }
                : null,
            ].filter((row): row is { storeId: number; status: PlanStatus } => Boolean(row))
          : [];
      return saveDayPlan({
        data: { regionId, workDate, kind, visits, notes },
      });
    },
    onSuccess: () => {
      toast.success("Gün kaydedildi");
      void queryClient.invalidateQueries();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Kaydedilemedi");
    },
  });

  const clear = useMutation({
    mutationFn: () => clearDayPlan({ data: { regionId, workDate } }),
    onSuccess: () => {
      toast.success("Gün temizlendi");
      void queryClient.invalidateQueries();
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dateLabelLong(workDate)}</DialogTitle>
          <DialogDescription>
            Günün çalışma şeklini seçin. Ziyarette aynı güne en fazla iki mağaza yazılır;
            tamamlanınca işaretleyin.
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <div className="grid gap-2">
            <Label>Çalışma Şekli</Label>
            <div className="grid grid-cols-2 gap-2">
              {DAY_KINDS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setKind(item.id)}
                  className={cn(
                    "min-h-11 rounded-xl border px-3 text-left text-sm transition-colors duration-[var(--motion-quick)]",
                    kind === item.id
                      ? "border-primary bg-primary text-primary-fg"
                      : "border-line bg-surface-2 text-ink hover:bg-bg-warm",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {kind === "visit" ? (
            <div className="grid gap-4">
              <VisitSlot
                label="1. mağaza"
                stores={stores}
                storeId={store1}
                status={status1}
                onStore={setStore1}
                onStatus={setStatus1}
              />
              <VisitSlot
                label="2. mağaza (isteğe bağlı)"
                stores={store2Options}
                storeId={store2}
                status={status2}
                onStore={setStore2}
                onStatus={setStatus2}
                optional
              />
            </div>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="day-notes">Not</Label>
            <Textarea
              id="day-notes"
              maxLength={300}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="İsteğe bağlı açıklama"
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            {entries.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                className="mr-auto text-bad"
                onClick={() => clear.mutate()}
                disabled={clear.isPending}
              >
                Günü sil
              </Button>
            ) : null}
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function VisitSlot({
  label,
  stores,
  storeId,
  status,
  onStore,
  onStatus,
  optional,
}: {
  label: string;
  stores: StoreOption[];
  storeId: string;
  status: PlanStatus;
  onStore: (value: string) => void;
  onStatus: (value: PlanStatus) => void;
  optional?: boolean;
}) {
  return (
    <div className="rounded-xl bg-bg p-3">
      <p className="mb-2 text-sm font-medium">{label}</p>
      <div className="grid gap-3">
        <Select
          value={storeId || "__none"}
          onValueChange={(value) => onStore(value === "__none" ? "" : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Mağaza seçin" />
          </SelectTrigger>
          <SelectContent>
            {optional ? <SelectItem value="__none">Yok</SelectItem> : null}
            {stores.map((store) => (
              <SelectItem key={store.id} value={String(store.id)}>
                {store.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-2">
          {PLAN_STATUSES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onStatus(item.id)}
              className={cn(
                "min-h-11 rounded-lg border text-sm font-medium",
                status === item.id
                  ? item.id === "tamamlandi"
                    ? "border-good/30 bg-good-bg text-good"
                    : "border-primary/30 bg-primary text-primary-fg"
                  : "border-line bg-surface-2 text-muted hover:bg-bg-warm",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
