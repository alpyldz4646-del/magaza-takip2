import { createContext, useContext, type ReactNode } from "react";

export type AccessState = {
  managerName: string;
  isAdmin: boolean;
  role: "manager" | "partner";
  editableRegionIds: number[];
  openRegionIds: number[];
  lastSavedAt: string | null;
  ready: boolean;
};

const AccessContext = createContext<AccessState>({
  managerName: "",
  isAdmin: false,
  role: "manager",
  editableRegionIds: [],
  openRegionIds: [],
  lastSavedAt: null,
  ready: false,
});

export function AccessProvider({
  value,
  children,
}: {
  value: AccessState;
  children: ReactNode;
}) {
  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const access = useContext(AccessContext);
  return {
    ...access,
    canEdit: (regionId: number) => access.editableRegionIds.includes(regionId),
    canAssign: (_regionId?: number) => access.isAdmin,
  };
}
