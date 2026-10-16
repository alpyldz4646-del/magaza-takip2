import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { downloadExcel } from "@/lib/excel";
import { getExcelBundle } from "@/lib/server/hr";

export function ExcelButton({ month }: { month: string }) {
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void getExcelBundle({ data: { month } })
          .then((bundle) => {
            downloadExcel(bundle);
            toast.success("Excel indirildi");
          })
          .catch((error: unknown) => {
            toast.error(error instanceof Error ? error.message : "Excel oluşturulamadı");
          })
          .finally(() => setPending(false));
      }}
    >
      <Download />
      {pending ? "Hazırlanıyor…" : "Excel"}
    </Button>
  );
}
