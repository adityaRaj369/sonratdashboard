"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { ApiError } from "@/services/api/http";
import { Skeleton } from "@/components/ui";
import { SonratWorkspaceShell } from "@/components/shell/sonrat-workspace-shell";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { data, isLoading, error, isFetching, isError } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading || isFetching) return;
    if (error instanceof ApiError && error.status === 401) {
      router.replace(`/login?next=${encodeURIComponent(pathname || "/dashboard")}`);
    }
  }, [error, isFetching, isLoading, pathname, router]);

  if (isLoading && !data?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f1f5f9]">
        <div className="w-full max-w-sm space-y-3 p-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    );
  }

  if (isError && error instanceof ApiError && error.status === 401) {
    return null;
  }

  if (!data?.user) {
    return null;
  }

  return <SonratWorkspaceShell>{children}</SonratWorkspaceShell>;
}
