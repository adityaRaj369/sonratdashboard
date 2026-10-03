"use client";

import React, { memo } from "react";
import CloneModal from "@/components/ui/CloneModal";
import type { Agent } from "@/lib/types";

export type AgentNewCloneModalProps = {
  row: Agent | null;
  cloning?: boolean;
  error?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
};

const AgentNewCloneModal = memo(function AgentNewCloneModal({
  row,
  cloning = false,
  error = "",
  onConfirm,
  onCancel,
}: AgentNewCloneModalProps) {
  return (
    <CloneModal
      open={Boolean(row)}
      row={
        row
          ? {
              id: row.id,
              key: row.name,
              name: row.name,
              description: row.description,
            }
          : null
      }
      cloning={cloning}
      error={error}
      onConfirm={onConfirm}
      onCancel={onCancel}
      title="Clone Agent"
      itemName="agent"
      itemKey="name"
      accentColor="blue"
      confirmButtonClass="bg-[#3b82f6] hover:bg-[#2563eb] shadow-blue-500/25"
      description="A duplicate agent will be created with all configuration, voice settings, and objectives copied over as a draft."
    />
  );
});

export default AgentNewCloneModal;
