"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth, useLogout } from "@/hooks/use-auth";
import { useWorkspaceState } from "@/hooks/workspace/useWorkspaceState";
import useServiceSearch from "@/hooks/workspace/useServiceSearch";
import services, {
  HOME_ROUTE,
  resolveServiceFromPath,
  type ServiceDefinition,
} from "@/data/services";
import WorkspaceLayout from "@/layouts/WorkspaceLayout";
import MainSidebar from "@/components/dashboard/MainSidebar";
import WorkspaceHeaderLeft from "@/components/workspace/WorkspaceHeaderLeft";
import ServiceBrowserDrawer from "@/components/workspace/ServiceBrowserDrawer";
import ModuleSubnav from "@/components/workspace/ModuleSubnav";
import ModuleRouter from "@/components/workspace/ModuleRouter";
import {
  WorkspaceNavProvider,
  useWorkspaceNav,
} from "@/components/workspace/WorkspaceNav";
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed";

function ShellInner() {
  const { data, can } = useAuth();
  const logout = useLogout();
  const workspace = useWorkspaceState();
  const { path, navigate } = useWorkspaceNav();
  const [collapsed] = useSidebarCollapsed();

  const headerRef = useRef<HTMLElement | null>(null);
  const [headerTabWidth, setHeaderTabWidth] = useState(280);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [activeNav, setActiveNav] = useState<"home" | "service">("home");

  useLayoutEffect(() => {
    const node = headerRef.current;
    if (!node || typeof window === "undefined") return undefined;
    const update = () => {
      const measured = node.getBoundingClientRect().width || 0;
      const screenWidth = window.innerWidth;
      let maxWidth = 520;
      if (screenWidth < 640) maxWidth = 320;
      else if (screenWidth < 768) maxWidth = 400;
      else if (screenWidth < 1024) maxWidth = 460;
      const padding = screenWidth < 768 ? 80 : 120;
      setHeaderTabWidth(Math.min(Math.max(Math.ceil(measured) + padding, 180), maxWidth));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [path]);

  const SERVICES = useMemo(
    () => services.filter((svc) => !svc.permission || can(svc.permission)),
    [can],
  );

  const activeService = useMemo(() => {
    const match = resolveServiceFromPath(path);
    if (!match) return undefined;
    return SERVICES.find((svc) => svc.key === match.key) || match;
  }, [SERVICES, path]);

  useEffect(() => {
    setActiveNav(path === HOME_ROUTE || path === "/" ? "home" : "service");
  }, [path]);

  useEffect(() => {
    if (activeService?.key) workspace.recordVisit(activeService.key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeService?.key]);

  const pinnedServices = useMemo(() => {
    return workspace.pinnedKeys
      .map((key) => SERVICES.find((svc) => svc.key === key))
      .filter(Boolean) as ServiceDefinition[];
  }, [workspace.pinnedKeys, SERVICES]);

  const recentServices = useMemo(
    () =>
      workspace.recentItems
        .map((item) => {
          const svc = SERVICES.find((service) => service.key === item.key);
          return svc ? { svc, ts: item.lastVisitedAt } : null;
        })
        .filter(Boolean) as Array<{ svc: ServiceDefinition; ts: number }>,
    [workspace.recentItems, SERVICES],
  );

  const { serviceQuery, setServiceQuery, filteredServices, groupedServices } =
    useServiceSearch(SERVICES);

  const goService = useCallback(
    (svc: { key: string; route: string }) => {
      if (!svc?.route) return;
      setActiveNav(svc.route === HOME_ROUTE ? "home" : "service");
      setServicesOpen(false);
      if (svc.key) workspace.recordVisit(svc.key);
      navigate(svc.route);
    },
    [navigate, workspace],
  );

  const onGoHome = useCallback(() => {
    setActiveNav("home");
    setServicesOpen(false);
    navigate(HOME_ROUTE);
  }, [navigate]);

  const onLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        window.location.href = "/login";
      },
    });
  };

  const sidebarOffset = collapsed ? 0 : 256;

  return (
    <>
      <WorkspaceLayout
        headerTabWidth={headerTabWidth}
        onGoHome={onGoHome}
        sidebar={
          <MainSidebar
            user={data?.user}
            can={can}
            env={process.env.NODE_ENV === "production" ? "Production" : "Development"}
            activeNav={activeNav}
            activeServiceKey={activeService?.key}
            onGoHome={onGoHome}
            servicesOpen={servicesOpen}
            serviceQuery={serviceQuery}
            onChangeServiceQuery={setServiceQuery}
            serviceSearchResults={filteredServices}
            onToggleServices={() => setServicesOpen((v) => !v)}
            pinnedServices={pinnedServices}
            recentServices={recentServices}
            onServiceClick={goService}
            onPinToggle={workspace.togglePin}
            onLogout={onLogout}
          />
        }
        headerLeft={<WorkspaceHeaderLeft ref={headerRef} mode="date" />}
      >
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
          <ModuleSubnav service={activeService} />
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <ModuleRouter />
          </div>
        </div>
      </WorkspaceLayout>

      <ServiceBrowserDrawer
        open={servicesOpen}
        serviceQuery={serviceQuery}
        groupedServices={groupedServices}
        pinnedKeys={workspace.pinnedKeys}
        onPinToggle={workspace.togglePin}
        can={can}
        sidebarOffset={sidebarOffset}
        onSelectService={(svc) => goService(svc)}
        onClose={() => setServicesOpen(false)}
      />
    </>
  );
}

export function SonratWorkspaceShell({ children: _children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <WorkspaceNavProvider initialPath={pathname || HOME_ROUTE}>
      <ShellInner />
    </WorkspaceNavProvider>
  );
}

export default SonratWorkspaceShell;
