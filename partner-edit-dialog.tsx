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
import { updatePartner } from "@/lib/server/hr";

export type EditablePartner = {
  id: number;
  name: string;
};

export function PartnerEditDialog({
  open,
  onOpenChange,
  partner,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partner: EditablePartner | null;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  useEffect(() => {
    if (!open || !partner) return;
    setName(partner.name);
  }, [open, partner]);

  const save = useMutation({
    mutationFn: () =>
      updatePartner({
        data: { id: partner?.id ?? 0, name },
      }),
    onSuccess: () => {
      toast.success("İş Ortağı adı güncellendi");
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
          <DialogTitle>İş Ortağı Adı</DialogTitle>
          <DialogDescription>
            Bu bölgenin sorumlu İş Ortağı. Menüde ve yönetici raporunda bu ad görünür.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!partner || name.trim().length < 2) return;
            save.mutate();
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="edit-partner-name">Ad Soyad</Label>
            <Input
              id="edit-partner-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={save.isPending || !partner}>
              {save.isPending ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
