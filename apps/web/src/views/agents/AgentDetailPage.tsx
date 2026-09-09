"use client";

import { useEffect } from "react";
import { useWorkspaceParams, useWorkspaceNavigate } from "@/components/workspace/WorkspaceNav";

/** Client redirect /agents/:id → /agents/:id/general */
export default function AgentDetailPage() {
  const params = useWorkspaceParams<{ id?: string }>();
  const navigate = useWorkspaceNavigate();
  const id = params.id;

  useEffect(() => {
    if (id) navigate.push(`/agents/${id}/general`);
  }, [id, navigate]);

  return (
    <div className="flex min-h-[30vh] items-center justify-center text-sm text-slate-500">
      Opening agent…
    </div>
  );
}
