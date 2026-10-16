import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useAccess } from "@/components/access-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveManagerProfile } from "@/lib/server/hr";

export function ProfileGate() {
  const access = useAccess();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [role, setRole] = useState<"manager" | "partner">("manager");
  const save = useMutation({
    mutationFn: () => saveManagerProfile({ data: { managerName: name, role } }),
    onSuccess: () => {
      toast.success(role === "partner" ? "İş Ortağı adı kaydedildi" : "İş Ortağı Müdürü adı kaydedildi");
      void queryClient.invalidateQueries({ queryKey: ["access"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Kaydedilemedi");
    },
  });

  if (!access.ready || access.managerName) return null;

  return (
    <form
      className="mb-6 grid gap-3 rounded-2xl bg-surface p-5 shadow-[var(--shadow-card)]"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <div>
        <h2 className="font-display text-2xl tracking-tight">
          {role === "partner" ? "İş Ortağı Adı" : "İş Ortağı Müdürü Adı"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Ad, CMK’nın eklediği İş Ortağı Müdürü veya İş Ortağı adı ile aynı olmalıdır. Yanlış ekrandan kayıt açılmaz.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className={
            role === "manager"
              ? "min-h-11 rounded-lg bg-primary px-3 text-sm font-medium text-primary-fg"
              : "min-h-11 rounded-lg bg-bg px-3 text-sm text-muted"
          }
          onClick={() => setRole("manager")}
        >
          İş Ortağı Müdürü
        </button>
        <button
          type="button"
          className={
            role === "partner"
              ? "min-h-11 rounded-lg bg-primary px-3 text-sm font-medium text-primary-fg"
              : "min-h-11 rounded-lg bg-bg px-3 text-sm text-muted"
          }
          onClick={() => setRole("partner")}
        >
          İş Ortağı
        </button>
      </div>
      <Label htmlFor="profile-manager">Ad Soyad</Label>
      <Input
        id="profile-manager"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <Button type="submit" disabled={save.isPending || name.trim().length < 2}>
        Kaydet
      </Button>
    </form>
  );
}
