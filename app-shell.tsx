import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import { ClipboardList, FileBarChart, LayoutGrid, LogOut, Menu, Pencil, Plus } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { AccessProvider, useAccess } from "@/components/access-context";
import { InitialsBadge } from "@/components/initials-badge";
import { ManagerEditDialog } from "@/components/manager-edit-dialog";
import { PartnerEditDialog, type EditablePartner } from "@/components/partner-edit-dialog";
import { ProfileGate } from "@/components/profile-gate";
import { SaveAreaButton } from "@/components/save-area-button";
import { VisitDialog } from "@/components/visit-dialog";
import { StoreSearch } from "@/components/store-search";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { getBearerToken, signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getAccess, getNav } from "@/lib/server/hr";
import type { NavRegion } from "@/lib/types";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Yönetici Özeti", icon: LayoutGrid },
  { to: "/program", label: "Aylık Program", icon: ClipboardList },
  { to: "/rapor", label: "Yönetici Raporu", icon: FileBarChart },
] as const;

function SecureSignOut({ compact = false }: { compact?: boolean }) {
  const [pending, setPending] = useState(false);

  function leave() {
    setPending(true);
    void signOut("/login").catch(() => {
      setPending(false);
      toast.error("Çıkış yapılamadı. Oturum açık kaldı, tekrar deneyin.");
    });
  }

  if (compact) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Güvenli Çıkış"
        disabled={pending}
        onClick={leave}
      >
        <LogOut />
      </Button>
    );
  }

  return (
    <Button type="button" variant="outline" className="w-full" disabled={pending} onClick={leave}>
      <LogOut />
      {pending ? "Çıkılıyor…" : "Güvenli Çıkış"}
    </Button>
  );
}

function BrandMark() {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-3 px-1">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-fg">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.95" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.7" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.7" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.45" />
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block truncate font-display text-lg leading-tight font-semibold tracking-tight">
          Saha Defteri
        </span>
      </span>
    </Link>
  );
}

function RegionNavItem({
  region,
  active,
  onNavigate,
  onEditPartner,
  onEditManager,
}: {
  region: NavRegion;
  active: boolean;
  onNavigate?: () => void;
  onEditPartner: (partner: EditablePartner) => void;
  onEditManager: (region: { id: number; managerName: string }) => void;
}) {
  const access = useAccess();
  const editable = access.canEdit(region.id);
  const assignable = access.canAssign(region.id);
  return (
    <div className="flex items-center gap-1">
      <Link
        to="/bolge/$regionId"
        params={{ regionId: String(region.id) }}
        onClick={onNavigate}
        className={cn(
          "flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl px-3 text-sm transition-colors duration-[var(--motion-quick)]",
          active ? "bg-bg-warm text-ink" : "text-muted hover:bg-bg-warm hover:text-ink",
        )}
      >
        <span className="flex shrink-0 -space-x-2">
          <InitialsBadge name={region.managerName} />
          <InitialsBadge name={region.partnerName} initials={region.initials} />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium text-ink">{region.name}</span>
          <span className="block truncate text-xs text-subtle">
            İş Ortağı Müdürü · {region.managerName || "Ad Girilmedi"}
          </span>
          <span className="block truncate text-xs text-subtle">
            İş Ortağı · {region.partnerName}
          </span>
        </span>
      </Link>
      {assignable ? (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0"
            aria-label={`${region.name} İş Ortağı Müdürü adını düzelt`}
            onClick={() => onEditManager({ id: region.id, managerName: region.managerName })}
          >
            <Pencil />
          </Button>
          {editable ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0"
            aria-label={`${region.partnerName} İş Ortağı adını düzelt`}
            onClick={() => onEditPartner({ id: region.partnerId, name: region.partnerName })}
          >
            <Pencil />
          </Button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function NavLinks({
  onNavigate,
  regions,
  onEditPartner,
  onEditManager,
}: {
  onNavigate?: () => void;
  regions: Awaited<ReturnType<typeof getNav>>;
  onEditPartner: (partner: EditablePartner) => void;
  onEditManager: (region: { id: number; managerName: string }) => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex flex-col gap-6">
      <nav className="grid gap-1">
        {NAV.map((item) => {
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors duration-[var(--motion-quick)]",
                active ? "bg-primary text-primary-fg" : "text-ink hover:bg-bg-warm",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div>
        <p className="px-3 pb-2 text-xs font-medium tracking-wide text-subtle uppercase">
          Bölgeler
        </p>
        <nav className="grid gap-1">
          {regions.map((region) => {
            const href = `/bolge/${region.id}`;
            const active = pathname === href;
            return (
              <RegionNavItem
                key={region.id}
                region={region}
                active={active}
                onNavigate={onNavigate}
                onEditPartner={onEditPartner}
                onEditManager={onEditManager}
              />
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const heldUser = useRef(user);
  if (user) heldUser.current = user;
  else if (!isPending && !getBearerToken()) heldUser.current = null;
  const activeUser = user ?? heldUser.current;

  const [open, setOpen] = useState(false);
  const [visitOpen, setVisitOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<EditablePartner | null>(null);
  const [editingManager, setEditingManager] = useState<{
    regionId: number;
    name: string;
  } | null>(null);
  const nav = useQuery({
    queryKey: ["nav"],
    queryFn: () => getNav(),
    enabled: Boolean(activeUser),
  });
  const accessQuery = useQuery({
    queryKey: ["access"],
    queryFn: () => getAccess(),
    enabled: Boolean(activeUser),
  });
  const regions = nav.data ?? [];

  const access = {
    managerName: accessQuery.data?.managerName ?? "",
    isAdmin: accessQuery.data?.isAdmin ?? false,
    role: accessQuery.data?.role ?? "manager",
    editableRegionIds: accessQuery.data?.editableRegionIds ?? [],
    openRegionIds: accessQuery.data?.openRegionIds ?? [],
    lastSavedAt: accessQuery.data?.lastSavedAt ?? null,
    ready: Boolean(accessQuery.data),
  };

  return (
    <AccessProvider value={access}>
    <div className="min-h-screen bg-bg text-ink">
      <aside className="no-print fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-surface p-4 lg:flex lg:flex-col">
        <BrandMark />
        <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
          <NavLinks
            regions={regions}
            onEditPartner={setEditingPartner}
            onEditManager={(region) =>
              setEditingManager({ regionId: region.id, name: region.managerName })
            }
          />
        </div>
        <div className="mt-4 grid gap-2">
          <StoreSearch />
          <Button className="w-full" onClick={() => setVisitOpen(true)}>
            <Plus />
            Yeni Ziyaret
          </Button>
          <SaveAreaButton />
          <div className="flex items-center gap-2 px-1">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
              {(activeUser?.displayName ?? activeUser?.primaryEmail ?? "S").charAt(0).toLocaleUpperCase("tr")}
            </span>
            <span className="min-w-0 truncate text-sm font-medium">
              {activeUser?.displayName ?? "Hesap"}
            </span>
          </div>
          <SecureSignOut />
          {access.role === "partner" ? (
            <p className="px-1 text-xs text-subtle">İş Ortağı</p>
          ) : access.isAdmin ? (
            <p className="px-1 text-xs text-subtle">Tam yetki</p>
          ) : (
            <p className="px-1 text-xs text-subtle">İş Ortağı Müdürü</p>
          )}
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="no-print sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-bg/90 px-3 py-3 backdrop-blur lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Menü">
            <Menu />
          </Button>
          <div className="min-w-0 flex-1">
            <BrandMark />
          </div>
          <StoreSearch compact />
          <SaveAreaButton compact />
          <SecureSignOut compact />
          <Button size="icon" onClick={() => setVisitOpen(true)} aria-label="Yeni Ziyaret">
            <Plus />
          </Button>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-10 sm:px-6 lg:py-8">
          <ProfileGate />
          {children}
        </main>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="flex flex-col">
          <SheetTitle className="sr-only">Menü</SheetTitle>
          <div className="mb-6">
            <BrandMark />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <NavLinks
              regions={regions}
              onNavigate={() => setOpen(false)}
              onEditPartner={setEditingPartner}
              onEditManager={(region) => {
                setOpen(false);
                setEditingManager({ regionId: region.id, name: region.managerName });
              }}
            />
          </div>
          <div className="mt-4">
            <SecureSignOut />
          </div>
        </SheetContent>
      </Sheet>

      <VisitDialog open={visitOpen} onOpenChange={setVisitOpen} />
      <PartnerEditDialog
        open={Boolean(editingPartner)}
        onOpenChange={(next) => {
          if (!next) setEditingPartner(null);
        }}
        partner={editingPartner}
      />
      <ManagerEditDialog
        open={Boolean(editingManager)}
        onOpenChange={(next) => {
          if (!next) setEditingManager(null);
        }}
        regionId={editingManager?.regionId ?? null}
        name={editingManager?.name ?? ""}
      />
    </div>
    </AccessProvider>
  );
}
