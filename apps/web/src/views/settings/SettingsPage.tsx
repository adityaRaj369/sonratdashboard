"use client";

import { useEffect, useState } from "react";
import {
  Workspace,
  WorkspaceContent,
  WorkspaceHeader,
} from "@/components/shell";
import {
  Badge,
  Button,
  ErrorState,
  Field,
  Input,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from "@/components/ui";
import {
  useCreatePhoneNumber,
  useEnvironmentInfo,
  useMembers,
  useOrganizationSettings,
  usePhoneNumbers,
  useUpdateOrganizationSettings,
} from "./hooks";

export default function SettingsPage() {
  const org = useOrganizationSettings();
  const updateOrg = useUpdateOrganizationSettings();
  const phones = usePhoneNumbers();
  const createPhone = useCreatePhoneNumber();
  const members = useMembers();
  const environment = useEnvironmentInfo();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [maxConcurrentCalls, setMaxConcurrentCalls] = useState(10);
  const [retentionDays, setRetentionDays] = useState(365);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneLabel, setPhoneLabel] = useState("");

  useEffect(() => {
    if (!org.data) return;
    setName(org.data.name);
    setTimezone(org.data.timezone);
    setMaxConcurrentCalls(org.data.maxConcurrentCalls);
    setRetentionDays(org.data.retentionDays);
  }, [org.data]);

  return (
    <Workspace>
      <WorkspaceHeader
        title="Settings"
        description="Organization, phone numbers, members, and environment"
      />
      <WorkspaceContent>
        <Tabs defaultValue="organization">
          <TabsList>
            <TabsTrigger value="organization">Organization</TabsTrigger>
            <TabsTrigger value="phones">Phone numbers</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="environment">Environment</TabsTrigger>
          </TabsList>

          <TabsContent value="organization">
            {org.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : org.isError ? (
              <ErrorState
                description={org.error.message}
                onRetry={() => org.refetch()}
              />
            ) : (
              <div className="max-w-xl space-y-3 rounded-lg border border-border bg-card p-4">
                <Field label="Organization name">
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
                <Field label="Timezone">
                  <Input
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  />
                </Field>
                <Field label="Max concurrent calls">
                  <Input
                    type="number"
                    value={maxConcurrentCalls}
                    onChange={(e) =>
                      setMaxConcurrentCalls(Number(e.target.value))
                    }
                  />
                </Field>
                <Field label="Retention days">
                  <Input
                    type="number"
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(Number(e.target.value))}
                  />
                </Field>
                <Button
                  loading={updateOrg.isPending}
                  onClick={async () => {
                    try {
                      await updateOrg.mutateAsync({
                        name,
                        timezone,
                        maxConcurrentCalls,
                        retentionDays,
                      });
                      toast({ title: "Settings saved", variant: "success" });
                    } catch (err) {
                      toast({
                        title: "Save failed",
                        description:
                          err instanceof Error ? err.message : undefined,
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  Save organization
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="phones" className="space-y-4">
            <div className="max-w-xl space-y-3 rounded-lg border border-border bg-card p-4">
              <Field label="Phone number">
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+919876543210"
                />
              </Field>
              <Field label="Label">
                <Input
                  value={phoneLabel}
                  onChange={(e) => setPhoneLabel(e.target.value)}
                  placeholder="Primary outbound"
                />
              </Field>
              <Button
                loading={createPhone.isPending}
                disabled={!phoneNumber.trim()}
                onClick={async () => {
                  try {
                    await createPhone.mutateAsync({
                      phoneNumber,
                      label: phoneLabel || undefined,
                    });
                    setPhoneNumber("");
                    setPhoneLabel("");
                    toast({ title: "Phone number added", variant: "success" });
                  } catch (err) {
                    toast({
                      title: "Could not add number",
                      description:
                        err instanceof Error ? err.message : undefined,
                      variant: "destructive",
                    });
                  }
                }}
              >
                Add number
              </Button>
            </div>

            {phones.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : phones.isError ? (
              <ErrorState
                description={phones.error.message}
                onRetry={() => phones.refetch()}
              />
            ) : !phones.data?.items.length ? (
              <p className="text-sm text-muted-foreground">
                No phone numbers configured yet.
              </p>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Number</TH>
                    <TH>Label</TH>
                    <TH>Provider</TH>
                    <TH>Active</TH>
                  </TR>
                </THead>
                <TBody>
                  {phones.data.items.map((phone) => (
                    <TR key={phone.id}>
                      <TD>{phone.phoneNumber}</TD>
                      <TD>{phone.label || "—"}</TD>
                      <TD>{phone.provider || "—"}</TD>
                      <TD>
                        <Badge
                          variant={
                            phone.isActive === false ? "warning" : "success"
                          }
                        >
                          {phone.isActive === false ? "Inactive" : "Active"}
                        </Badge>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="members">
            {members.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : members.isError ? (
              <ErrorState
                description={members.error.message}
                onRetry={() => members.refetch()}
              />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Name</TH>
                    <TH>Email</TH>
                    <TH>Role</TH>
                  </TR>
                </THead>
                <TBody>
                  {members.data?.items.map((member) => (
                    <TR key={member.id}>
                      <TD>{member.user.name}</TD>
                      <TD>{member.user.email}</TD>
                      <TD>
                        <Badge variant="outline">{member.role}</Badge>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="environment">
            {environment.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : environment.isError ? (
              <ErrorState
                description={environment.error.message}
                onRetry={() => environment.refetch()}
              />
            ) : environment.data ? (
              <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
                {[
                  ["Environment", environment.data.nodeEnv],
                  ["Demo mode", environment.data.demoMode ? "On" : "Off"],
                  ["AI provider", environment.data.aiProvider],
                  ["Telephony", environment.data.telephonyProvider],
                  ["Mock AI", environment.data.mockAi ? "On" : "Off"],
                  [
                    "Mock telephony",
                    environment.data.mockTelephony ? "On" : "Off",
                  ],
                  ["App URL", environment.data.publicAppUrl],
                  ["API URL", environment.data.apiBaseUrl],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-border bg-card p-3"
                  >
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1 text-sm font-medium break-all">{value}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </TabsContent>
        </Tabs>
      </WorkspaceContent>
    </Workspace>
  );
}
