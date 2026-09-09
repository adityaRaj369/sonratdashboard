import { AuthGate } from "@/components/providers/auth-gate";

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <link rel="stylesheet" href="/dashboard-styles.css" />
      <AuthGate>{children}</AuthGate>
    </>
  );
}
