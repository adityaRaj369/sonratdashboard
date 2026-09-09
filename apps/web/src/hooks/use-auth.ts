"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import {
  canPermission,
  permissionsForRole,
  type Role,
} from "@sonrat/shared";
import { authApi } from "@/services/api/auth";
import { ApiError } from "@/services/api/http";
import type { AuthMeResponse } from "@/lib/types";

export const authKeys = {
  me: ["auth", "me"] as const,
};

function resolvePermissions(data?: {
  permissions?: string[];
  role?: string;
} | null): string[] {
  if (data?.permissions?.length) return data.permissions;
  if (data?.role) {
    try {
      return [...permissionsForRole(data.role as Role)];
    } catch {
      return [];
    }
  }
  return [];
}

export function useAuth() {
  const query = useQuery<AuthMeResponse | null>({
    queryKey: authKeys.me,
    queryFn: () => authApi.me(),
    retry: (failureCount, error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        return false;
      }
      return failureCount < 1;
    },
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const permissions = useMemo(
    () => resolvePermissions(query.data),
    [query.data],
  );

  const can = useCallback(
    (permission: string) => {
      if (!permission) return true;
      if (canPermission(permissions, permission)) return true;
      // OWNER/ADMIN always pass menu/ACL checks when role is present
      const role = query.data?.role;
      if (role === "OWNER" || role === "ADMIN") return true;
      return false;
    },
    [permissions, query.data?.role],
  );

  return {
    ...query,
    data: query.data ?? null,
    permissions,
    can,
  };
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: () => qc.invalidateQueries({ queryKey: authKeys.me }),
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: () => qc.invalidateQueries({ queryKey: authKeys.me }),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      qc.setQueryData<AuthMeResponse | null>(authKeys.me, null);
      qc.clear();
    },
  });
}

export function useSwitchOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (organizationId: string) =>
      authApi.switchOrganization(organizationId),
    onSuccess: () => qc.invalidateQueries(),
  });
}
