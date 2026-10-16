import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { useAccess } from "@/components/access-context";
import { Button } from "@/components/ui/button";
import { saveMyArea } from "@/lib/server/hr";

function savedLabel(value: string | null) {
  if (!value) return "Henüz kaydedilmedi";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Son kayıt alındı";
  return `Son kayıt ${date.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}`;
}

export function SaveAreaButton({ compact = false }: { compact?: boolean }) {
  const access = useAccess();
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: async () => {
      await queryClient.refetchQueries({ type: "active" }).catch(() => undefined);
      return saveMyArea();
    },
    onSuccess: (result) => {
      const scope =
        result.role === "admin"
          ? "Tüm kayıtlar"
          : result.role === "partner"
            ? "İş Ortağı alanı"
            : "İş Ortağı Müdürü alanı";
      toast.success(
        `${scope} son verilere göre kaydedildi · ${result.regionCount} bölge, ${result.storeCount} mağaza`,
      );
      void queryClient.invalidateQueries({ queryKey: ["access"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Kaydedilemedi");
    },
  });

  if (compact) {
    return (
      <Button
        type="button"
        size="icon"
        aria-label="Kaydet"
        disabled={!access.ready || save.isPending}
        onClick={() => save.mutate()}
      >
        <Save />
      </Button>
    );
  }

  return (
    <div className="grid gap-1">
      <Button
        type="button"
        className="w-full"
        disabled={!access.ready || save.isPending}
        onClick={() => save.mutate()}
      >
        <Save />
        {save.isPending ? "Kaydediliyor…" : "Kaydet"}
      </Button>
      <p className="px-1 text-xs text-subtle">{savedLabel(access.lastSavedAt)}</p>
    </div>
  );
}
