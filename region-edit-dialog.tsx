import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateRegion } from "@/lib/server/hr";

export type EditableRegion = {
  id: number;
  name: string;
  code: string;
};

export function RegionEditDialog({
  open,
  onOpenChange,
  region,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  region: EditableRegion | null;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  useEffect(() => {
    if (!open || !region) return;
    setName(region.name);
    setCode(region.code);
  }, [open, region]);

  const save = useMutation({
    mutationFn: () =>
      updateRegion({
        data: {
          id: region?.id ?? 0,
          name,
          code,
        },
      }),
    onSuccess: () => {
      toast.success("Bölge Adı güncellendi");
      void queryClient.invalidateQueries();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Kaydedilemedi");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bölgeyi Düzelt</DialogTitle>
          <DialogDescription>
            Ad menüde, programda ve yönetici raporunda güncellenir. Kod kısa bir etiket olarak
            kalır.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!region) return;
            save.mutate();
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="edit-region-name">Bölge Adı</Label>
            <Input
              id="edit-region-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
              placeholder="Örn. İstanbul Avrupa"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-region-code">Kod</Label>
            <Input
              id="edit-region-code"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              required
              minLength={2}
              maxLength={8}
              placeholder="Örn. IA"
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={save.isPending || !region}>
              {save.isPending ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
