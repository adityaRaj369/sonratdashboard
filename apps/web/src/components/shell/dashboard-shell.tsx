"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getSidebarItems } from "@/modules/types";
import "@/modules/registry";
import { useAuth, useLogout, useSwitchOrganization } from "@/hooks/use-auth";
import { Button, Drawer, Dropdown, DropdownItem, Input, Tooltip } from "@/components/ui";

type ShellContextValue = {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
  search: string;
  setSearch: (v: string) => void;
};

const ShellContext = React.createContext<ShellContextValue | null>(null);

export function useShell() {
  const ctx = React.useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used within DashboardShell");
  return ctx;
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  return (
    <ShellContext.Provider
      value={{
        collapsed,
        setCollapsed,
        mobileOpen,
        setMobileOpen,
        search,
        setSearch,
      }}
    >
      <div className="flex min-h-screen bg-background">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <Drawer
          open={mobileOpen}
          onOpenChange={setMobileOpen}
          title="Sonrat"
          side="left"
        >
          <SidebarContent mobile />
        </Drawer>
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </ShellContext.Provider>
  );
}

export function Sidebar() {
  const { collapsed } = useShell();
  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-[width]",
        collapsed ? "w-[68px]" : "w-[248px]",
      )}
    >
      <SidebarContent />
    </aside>
  );
}

function SidebarContent({ mobile = false }: { mobile?: boolean }) {
  return (
    <div className="flex h-full flex-col">
      <SidebarHeader />
      <SidebarSearch />
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        <SidebarSection title="Workspace" mobile={mobile} />
      </nav>
      <SidebarFooter />
    </div>
  );
}

export function SidebarHeader() {
  const { collapsed, setCollapsed, setMobileOpen } = useShell();
  const { data } = useAuth();
  const switchOrg = useSwitchOrganization();
  const org = data?.organization;
  const orgs = data?.organizations || [];

  return (
    <div className="border-b border-sidebar-border p-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
        {!collapsed ? (
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-semibold tracking-tight">
              Sonrat
            </p>
            <p className="truncate text-[11px] text-sidebar-muted">
              Voice control plane
            </p>
          </div>
        ) : null}
        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:inline-flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed(!collapsed)}
        >
          <Menu className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>
      {!collapsed && org ? (
        <div className="mt-3">
          <Dropdown
            align="start"
            trigger={
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent px-2 py-1.5 text-left text-sm focus-ring"
              >
                <Building2 className="h-3.5 w-3.5 text-sidebar-muted" />
                <span className="min-w-0 flex-1 truncate">{org.name}</span>
                <ChevronDown className="h-3.5 w-3.5 text-sidebar-muted" />
              </button>
            }
          >
            {orgs.map((o) => (
              <DropdownItem
                key={o.id}
                onClick={() => switchOrg.mutate(o.id)}
                className={cn(o.id === org.id && "bg-muted")}
              >
                {o.name}
              </DropdownItem>
            ))}
          </Dropdown>
          <p className="mt-1.5 px-1 text-[10px] uppercase tracking-wider text-sidebar-muted">
            {process.env.NODE_ENV === "production" ? "Production" : "Development"}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function SidebarSearch() {
  const { collapsed, search, setSearch } = useShell();
  if (collapsed) return null;
  return (
    <div className="px-3 py-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search modules…"
          className="h-8 pl-8"
          aria-label="Search modules"
        />
      </div>
    </div>
  );
}

export function SidebarSection({
  title,
  mobile,
}: {
  title?: string;
  mobile?: boolean;
}) {
  const { collapsed, search, setMobileOpen } = useShell();
  const { data } = useAuth();
  const permissions = data?.permissions || [];
  const items = getSidebarItems(permissions).filter((item) => {
    if (!search.trim()) return true;
    return item.label.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div>
      {!collapsed && title ? (
        <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted">
          {title}
        </p>
      ) : null}
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item.id}>
            <SidebarItem
              href={item.route}
              label={item.label}
              icon={item.icon}
              onNavigate={mobile ? () => setMobileOpen(false) : undefined}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SidebarItem({
  href,
  label,
  icon: Icon,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onNavigate?: () => void;
}) {
  const pathname = usePathname() || "";
  const { collapsed } = useShell();
  const active =
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  const link = (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-sidebar-foreground transition-colors focus-ring",
        active
          ? "bg-sidebar-accent text-foreground"
          : "text-sidebar-muted hover:bg-sidebar-accent hover:text-foreground",
        collapsed && "justify-center px-0",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed ? <span className="truncate">{label}</span> : null}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip content={label} side="right">
        {link}
      </Tooltip>
    );
  }
  return link;
}

export function SidebarFooter() {
  const { collapsed } = useShell();
  const { data } = useAuth();
  const logout = useLogout();

  return (
    <div className="border-t border-sidebar-border p-3">
      {!collapsed ? (
        <div className="mb-2 min-w-0">
          <p className="truncate text-sm font-medium">{data?.user.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {data?.user.email}
          </p>
        </div>
      ) : null}
      <Button
        variant="ghost"
        size={collapsed ? "icon" : "sm"}
        className={cn("w-full", !collapsed && "justify-start")}
        onClick={() => {
          logout.mutate(undefined, {
            onSuccess: () => {
              window.location.href = "/login";
            },
          });
        }}
        aria-label="Log out"
      >
        <LogOut className="h-4 w-4" />
        {!collapsed ? "Log out" : null}
      </Button>
    </div>
  );
}
