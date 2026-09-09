"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToasterProvider } from "@/components/ui";
import { WorkspaceStateProvider } from "@/context/WorkspaceStateContext";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            refetchOnMount: false,
            staleTime: 60_000,
            gcTime: 10 * 60_000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <WorkspaceStateProvider>
        <ToasterProvider>{children}</ToasterProvider>
      </WorkspaceStateProvider>
    </QueryClientProvider>
  );
}
