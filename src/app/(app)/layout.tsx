import { AppShell } from "@/components/app/app-shell";
import { Heartbeat } from "@/components/app/heartbeat";
import { SetupNotice } from "@/components/app/setup-notice";
import { isServerSupabaseConfigured } from "@/lib/supabase/server";

/**
 * Shell for every authenticated route. When the Supabase project has not
 * been connected yet, every app route shows the honest setup notice
 * instead of a half-broken screen.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isServerSupabaseConfigured()) {
    return <SetupNotice what="The signed-in part of Fast" />;
  }
  return (
    <>
      <Heartbeat />
      <AppShell>{children}</AppShell>
    </>
  );
}
