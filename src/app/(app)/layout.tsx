import { AppShell } from "@/components/app/app-shell";
import { Heartbeat } from "@/components/app/heartbeat";
import { SetupNotice } from "@/components/app/setup-notice";
import { PwaRegister } from "@/components/site/pwa-register";
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
      {/* The service worker used to be registered only by the public
          homepage; people whose first visit was a shared /login link never
          got offline support at all. Register on every shell. */}
      <PwaRegister />
      <Heartbeat />
      <AppShell>{children}</AppShell>
    </>
  );
}
