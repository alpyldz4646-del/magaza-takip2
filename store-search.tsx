import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getStoreOptions } from "@/lib/server/hr";

export function StoreSearch({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const options = useQuery({
    queryKey: ["store-options"],
    queryFn: () => getStoreOptions(),
    enabled: open,
  });

  const results = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    const rows = (options.data ?? []).flatMap((region) =>
      region.stores.map((store) => ({
        ...store,
        regionId: region.id,
        regionName: region.name,
        partnerName: region.partnerName,
      })),
    );
    if (!q) return rows.slice(0, 8);
    return rows
      .filter((store) =>
        `${store.code} ${store.name} ${store.district} ${store.regionName} ${store.partnerName}`
          .toLocaleLowerCase("tr")
          .includes(q),
      )
      .slice(0, 12);
  }, [options.data, query]);

  return (
    <>
      {compact ? (
        <Button
          variant="outline"
          size="icon"
          onClick={() => setOpen(true)}
          aria-label="Mağaza Bul"
        >
          <Search />
        </Button>
      ) : (
        <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
          <Search />
          Mağaza Bul
        </Button>
      )}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mağaza Bul</DialogTitle>
            <DialogDescription>
              Kod, mağaza, ilçe, bölge veya iş ortağı adıyla arayın.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Örn. Kadıköy, IA-04, Ayşe"
          />
          <div className="mt-3 grid max-h-80 gap-1 overflow-y-auto">
            {results.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted">Sonuç yok.</p>
            ) : (
              results.map((store) => (
                <button
                  key={store.id}
                  type="button"
                  className="rounded-xl px-3 py-2.5 text-left hover:bg-bg-warm"
                  onClick={() => {
                    setOpen(false);
                    void navigate({
                      to: "/magaza/$storeId",
                      params: { storeId: String(store.id) },
                    });
                  }}
                >
                  <span className="block text-sm font-medium">
                    {store.code} {store.name}
                  </span>
                  <span className="block text-xs text-muted">
                    {store.district} · {store.regionName} · {store.partnerName}
                  </span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
