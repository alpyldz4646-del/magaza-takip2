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
import { updateManagerName } from "@/lib/server/hr";

export function ManagerEditDialog({
  open,
  onOpenChange,
  regionId,
  name,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  regionId: number | null;
  name: string;
}) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!open) return;
    setValue(name);
  }, [open, name]);

  const save = useMutation({
    mutationFn: () => {
      if (!regionId) throw new Error("Bölge bulunamadı.");
      return updateManagerName({ data: { regionId, name: value } });
    },
    onSuccess: () => {
      toast.success("İş Ortağı Müdürü güncellendi");
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
          <DialogTitle>İş Ortağı Müdürü</DialogTitle>
          <DialogDescription>
            Bu ad yalnızca seçili bölgede, programda ve Excel raporunda görünür.
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
            <Label htmlFor="manager-name">Ad Soyad</Label>
            <Input
              id="manager-name"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              maxLength={80}
              placeholder="İş Ortağı Müdürünün adı"
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={save.isPending || !regionId}>
              {save.isPending ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}