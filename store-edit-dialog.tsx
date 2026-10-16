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
import { updateStore } from "@/lib/server/hr";

export type EditableStore = {
  id: number;
  name: string;
  district: string;
  city: string;
  code: string;
};

export function StoreEditDialog({
  open,
  onOpenChange,
  store,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: EditableStore | null;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [code, setCode] = useState("");

  useEffect(() => {
    if (!open || !store) return;
    setName(store.name);
    setDistrict(store.district);
    setCity(store.city);
    setCode(store.code);
  }, [open, store]);

  const save = useMutation({
    mutationFn: () =>
      updateStore({
        data: {
          id: store?.id ?? 0,
          name,
          district,
          city,
          code,
        },
      }),
    onSuccess: () => {
      toast.success("Mağaza Adı güncellendi");
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
          <DialogTitle>Mağazayı Düzelt</DialogTitle>
          <DialogDescription>
            Ad mağaza programında görünür. Kod yalnızca arama ve raporda kullanılır; program
            listesinde bölge kısaltması yer almaz.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!store) return;
            save.mutate();
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="edit-store-name">Mağaza Adı</Label>
            <Input
              id="edit-store-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-store-code">Kod</Label>
            <Input
              id="edit-store-code"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              required
              minLength={2}
              maxLength={20}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-store-district">İlçe / Lokasyon</Label>
              <Input
                id="edit-store-district"
                value={district}
                onChange={(event) => setDistrict(event.target.value)}
                required
                minLength={2}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-store-city">İl</Label>
              <Input
                id="edit-store-city"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                required
                minLength={2}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={save.isPending || !store}>
              {save.isPending ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
