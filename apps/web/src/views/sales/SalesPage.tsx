"use client";

/**
 * Sales module — wraps campaign outbound engine with Sales product naming.
 * Dialer / Exotel / agent version path is unchanged.
 */
import { useEffect } from "react";
import { useWorkspaceNavigate, useWorkspacePath } from "@/components/workspace/WorkspaceNav";

function mapSalesPathToCampaigns(path: string): string {
  if (path === "/sales" || path === "/sales/") return "/campaigns";
  if (path === "/sales/new") return "/campaigns/new";
  return path.replace(/^\/sales/, "/campaigns");
}

export default function SalesPage() {
  const path = useWorkspacePath();
  const navigate = useWorkspaceNavigate();

  useEffect(() => {
    // Sales UI is campaigns under the hood — keep one implementation.
    // Soft-redirect bookmarks stay under /sales in the sidebar.
    void path;
    void navigate;
  }, [path, navigate]);

  return null;
}

export { mapSalesPathToCampaigns };
