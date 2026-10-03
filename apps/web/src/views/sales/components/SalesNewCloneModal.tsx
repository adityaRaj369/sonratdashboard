"use client";

import React, { memo } from "react";
import CloneModal from "@/components/ui/CloneModal";
import type { Campaign } from "@/lib/types";

export type SalesNewCloneModalProps = {
  row: Campaign | null;
  cloning?: boolean;
  error?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
};

const SalesNewCloneModal = memo(function SalesNewCloneModal({
  row,
  cloning = false,
  error = "",
  onConfirm,
  onCancel,
}: SalesNewCloneModalProps) {
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
      title="Clone Campaign"
      itemName="campaign"
      itemKey="name"
      accentColor="blue"
      confirmButtonClass="bg-[#3b82f6] hover:bg-[#2563eb] shadow-blue-500/25"
      description="A duplicate sales campaign will be created as a draft with all calling rules, objective, and script copied."
    />
  );
});

export default SalesNewCloneModal;
