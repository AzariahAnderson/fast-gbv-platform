/**
 * Shell for the four authentication screens. The split-screen itself is
 * drawn per page through AuthSplit (src/components/app/auth-split.tsx),
 * which carries the brand panel, the emoji companions and the crisis
 * line; this layout only guarantees the page background.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-dvh bg-background">{children}</div>;
}
