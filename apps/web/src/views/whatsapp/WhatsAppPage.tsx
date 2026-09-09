"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import {
  Workspace,
  WorkspaceContent,
  WorkspaceHeader,
} from "@/components/shell";
import {
  Button,
  Field,
  Input,
  Select,
  Textarea,
  useToast,
} from "@/components/ui";
import { settingsApi } from "@/services/api/settings";
import { useAgents } from "@/hooks/use-agents";

type WhatsAppConfig = {
  enabled: boolean;
  wabaId: string;
  phoneNumberId: string;
  displayPhone: string;
  accessToken: string;
  webhookVerifyToken: string;
  agentId: string;
  notes: string;
};

const EMPTY: WhatsAppConfig = {
  enabled: false,
  wabaId: "",
  phoneNumberId: "",
  displayPhone: "",
  accessToken: "",
  webhookVerifyToken: "",
  agentId: "",
  notes: "",
};

/**
 * WhatsApp setup — stores connection config on the org (featureFlags.whatsapp).
 * Conversations reuse Agents (WhatsApp type). Runtime channel lands after voice is stable.
 */
export default function WhatsAppPage() {
  const { toast } = useToast();
  const agents = useAgents({ limit: 100 });
  const [form, setForm] = useState<WhatsAppConfig>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const org = await settingsApi.getOrganization();
        const flags = (org.featureFlags || {}) as Record<string, unknown>;
        const wa = (flags.whatsapp || {}) as Partial<WhatsAppConfig>;
        if (!cancelled) {
          setForm({ ...EMPTY, ...wa });
        }
      } catch (err) {
        if (!cancelled) {
          toast({
            title: "Could not load WhatsApp settings",
            description: err instanceof Error ? err.message : undefined,
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const onSave = async () => {
    setSaving(true);
    try {
      const org = await settingsApi.getOrganization();
      const flags = {
        ...((org.featureFlags || {}) as Record<string, unknown>),
        whatsapp: {
          ...form,
          // Never echo token back in UI after save if empty update — keep previous
          accessToken: form.accessToken || undefined,
        },
      };
      await settingsApi.updateOrganization({ featureFlags: flags });
      toast({ title: "WhatsApp settings saved", variant: "success" });
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const whatsappAgents =
    agents.data?.items.filter((a) => {
      const purpose = (a.draftConfig as { general?: { purpose?: string } } | null)
        ?.general?.purpose;
      return purpose === "whatsapp" || purpose === "support" || purpose === "hybrid";
    }) ?? [];

  return (
    <Workspace>
      <WorkspaceHeader
        title="WhatsApp"
        description="Connect your company WhatsApp Business account and map a trained agent"
      />
      <WorkspaceContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="mx-auto max-w-2xl space-y-4 rounded-lg border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <MessageCircle className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Train a WhatsApp agent under Agents with company knowledge first.
                Point Meta&apos;s webhook to your API{" "}
                <code className="rounded bg-muted px-1 text-xs">
                  /webhooks/whatsapp
                </code>{" "}
                and use the verify token below. Inbound texts reply from the mapped
                agent&apos;s knowledge (FAQ / support info).
              </p>
            </div>

            <Field label="Enable WhatsApp channel">
              <Select
                value={form.enabled ? "yes" : "no"}
                onChange={(e) =>
                  setForm((f) => ({ ...f, enabled: e.target.value === "yes" }))
                }
              >
                <option value="no">Disabled</option>
                <option value="yes">Enabled</option>
              </Select>
            </Field>

            <Field label="Mapped agent">
              <Select
                value={form.agentId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, agentId: e.target.value }))
                }
              >
                <option value="">Select agent…</option>
                {whatsappAgents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="WABA ID">
                <Input
                  value={form.wabaId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, wabaId: e.target.value }))
                  }
                  placeholder="WhatsApp Business Account ID"
                />
              </Field>
              <Field label="Phone number ID">
                <Input
                  value={form.phoneNumberId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phoneNumberId: e.target.value }))
                  }
                  placeholder="Cloud API phone number ID"
                />
              </Field>
            </div>

            <Field label="Display phone (E.164)">
              <Input
                value={form.displayPhone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, displayPhone: e.target.value }))
                }
                placeholder="+9198…"
              />
            </Field>

            <Field label="Access token">
              <Input
                type="password"
                value={form.accessToken}
                onChange={(e) =>
                  setForm((f) => ({ ...f, accessToken: e.target.value }))
                }
                placeholder="Meta permanent token"
                autoComplete="off"
              />
            </Field>

            <Field label="Webhook verify token">
              <Input
                value={form.webhookVerifyToken}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    webhookVerifyToken: e.target.value,
                  }))
                }
                placeholder="Shared secret for Meta webhook verification"
              />
            </Field>

            <Field label="Notes">
              <Textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="BSP name, template status, etc."
              />
            </Field>

            <div className="flex justify-end">
              <Button onClick={onSave} loading={saving}>
                Save WhatsApp setup
              </Button>
            </div>
          </div>
        )}
      </WorkspaceContent>
    </Workspace>
  );
}
