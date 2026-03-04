"use client";

import {
  type VeilRole,
  getStoredVeilRole,
  getVeilRoleFromSearch,
  resolveVeilRole,
  setStoredVeilRole,
} from "@/lib/veil/role-state";
import { useEffect, useSyncExternalStore } from "react";

interface RoleGuardProps {
  requiredRole: VeilRole;
  redirectTo: string;
  children: React.ReactNode;
}

export function RoleGuard({
  requiredRole,
  redirectTo,
  children,
}: RoleGuardProps) {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const queryRole = isClient
    ? getVeilRoleFromSearch(window.location.search)
    : null;
  const storedRole = isClient ? getStoredVeilRole() : null;
  const { currentRole, shouldPersistRole } = resolveVeilRole({
    requiredRole,
    queryRole,
    storedRole,
  });
  const allowed = isClient && currentRole === requiredRole;

  useEffect(() => {
    if (!isClient) {
      return;
    }

    if (shouldPersistRole) {
      setStoredVeilRole(shouldPersistRole);
    }

    if (!allowed) {
      window.location.replace(redirectTo);
    }
  }, [allowed, isClient, redirectTo, shouldPersistRole]);

  if (!allowed) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center text-sm text-slate-400">
        Checking access...
      </div>
    );
  }

  return <>{children}</>;
}
