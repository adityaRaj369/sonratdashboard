"use client";

import { useWorkspacePath, useWorkspaceNavigate } from "@/components/workspace/WorkspaceNav";
import { useAuth } from "@/hooks/use-auth";
import { getServiceSubpages } from "@/data/serviceSubpages";
import type { ServiceDefinition } from "@/data/services";
import cx from "@/utils/cx";

export default function ModuleSubnav({
  service,
}: {
  service?: ServiceDefinition | null;
}) {
  const path = useWorkspacePath();
  const navigate = useWorkspaceNavigate();
  const { can } = useAuth();

  if (!service) return null;

  const items = (service.subpages || getServiceSubpages(service.key)).filter(
    (item) => !item.permission || can(item.permission),
  );

  if (items.length <= 1) return null;

  return (
    <div className="shrink-0 border-b border-slate-50 bg-white px-4 py-3">
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const isExact = path === item.route;
          const isSubRoute =
            item.route !== service.route && path.startsWith(`${item.route}/`);
          const isMainServiceSubroute =
            item.route === service.route &&
            path.startsWith(`${service.route}/`) &&
            !items.some(
              (other) =>
                other.route !== item.route &&
                (path === other.route || path.startsWith(`${other.route}/`)),
            );
          const active = isExact || isSubRoute || isMainServiceSubroute;

          return (
            <button
              key={item.route}
              type="button"
              onClick={() => navigate.push(item.route)}
              className={cx(
                "rounded-2xl px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-all focus-visible:outline focus-visible:ring",
                active
                  ? "bg-slate-900 text-white shadow-lg"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
