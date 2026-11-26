import { PwaRegister } from "@/components/site/pwa-register";

/**
 * Shell for the four authentication screens. The split-screen itself is
 * drawn per page through AuthSplit (src/components/app/auth-split.tsx),
 * which carries the brand panel, the emoji companions and the crisis
 * line; this layout only guarantees the page background. The service
 * worker registers here too: a survivor whose first visit is a shared
 * /login link still gets offline support from the very first page.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background">
      <PwaRegister />
      {children}
    </div>
  );
}
