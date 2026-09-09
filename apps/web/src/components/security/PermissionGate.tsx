"use client";

import { WorkspaceLink as Link } from "@/components/workspace/WorkspaceNav";
import { useAuth } from "@/hooks/use-auth";

function ForbiddenPanel() {
  return (
    <div className="permission-gate flex min-h-[60vh] w-full items-center justify-center bg-slate-50 px-6 py-12">
      <div className="max-w-lg text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/forbidden.png"
          alt="403 Forbidden"
          className="permission-gate__image mx-auto max-h-80 w-auto object-contain"
        />
        <h2 className="mt-4 text-2xl font-black text-slate-900">Forbidden</h2>
        <p className="mt-2 text-sm font-semibold text-slate-600">
          You do not have permission to access this page. Please contact admin.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            Go Back
          </button>
          <Link
            href="/dashboard"
            className="rounded-2xl border border-slate-900 bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-wide text-white shadow-sm"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export function PermissionGate({
  permission,
  children,
}: {
  permission?: string | string[];
  children: React.ReactNode;
}) {
  const { data, isLoading, can, permissions } = useAuth();

  if (isLoading && !data?.user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
        Checking access…
      </div>
    );
  }

  if (!data?.user) {
    return (
      <div className="p-8 text-center text-sm">
        <Link href="/login" className="underline">
          Sign in required
        </Link>
      </div>
    );
  }

  if (data.role === "OWNER" || data.role === "ADMIN") {
    return <>{children}</>;
  }

  const required = Array.isArray(permission) ? permission : permission ? [permission] : [];
  const allowed =
    required.length === 0 ||
    required.some((key) => can(key)) ||
    (permissions.length === 0 && Boolean(data.role));

  if (!allowed) return <ForbiddenPanel />;
  return <>{children}</>;
}

export default PermissionGate;
