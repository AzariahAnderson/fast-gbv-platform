"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  HeartHandshake,
  Home,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Settings,
  Shield,
  Sparkles,
  User,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { EmergencyButton, EmergencySheet } from "./emergency-sheet";
import { OfflineBanner } from "./offline-banner";

/**
 * The authenticated shell. On desktop a quiet side rail carries all seven
 * destinations; on mobile a five-slot bottom bar holds the daily routes
 * and a "More" sheet opens the rest. Nothing here resembles a dashboard:
 * no stat cards, no dense tables, no panels — just calm destinations.
 */

const NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/family", label: "Family", icon: HeartHandshake },
  { href: "/map", label: "Map", icon: MapPin },
  { href: "/safety", label: "Safety", icon: Shield },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/ai", label: "FAST Guide", icon: Sparkles },
  { href: "/profile", label: "Profile", icon: User },
];

const MOBILE_PRIMARY = ["/home", "/messages", "/family", "/map"];
const MORE_ITEMS = [
  { href: "/safety", label: "Safety", icon: Shield },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/ai", label: "FAST Guide", icon: Sparkles },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const reduce = useReducedMotion();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="min-h-dvh bg-background">
      {/* Desktop side rail */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r-2 border-taupe/60 bg-background px-5 py-6 lg:flex">
        <Link href="/home" className="px-2 text-[1.5rem] font-black leading-none tracking-tight text-foreground">
          FAST
        </Link>
        <p className="mt-1 px-2 text-[9px] font-bold uppercase tracking-[0.26em] text-dim">
          Stay close. Stay safe.
        </p>

        <nav aria-label="Primary" className="mt-9 flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={`lift flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-bold transition-colors duration-300 ${
                isActive(href)
                  ? "border-2 border-brand/60 bg-brand/10 text-brand"
                  : "border-2 border-transparent text-body hover:border-taupe/70 hover:bg-taupe/15 hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-3 px-1">
          <EmergencyButton className="w-full" />
          <Link
            href="/notifications"
            className="lift flex min-h-11 items-center gap-3 rounded-2xl px-4 text-sm font-semibold text-dim hover:text-foreground"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            Notifications
          </Link>
          <Link
            href="/settings"
            className="lift flex min-h-11 items-center gap-3 rounded-2xl px-4 text-sm font-semibold text-dim hover:text-foreground"
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
            Settings
          </Link>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b-2 border-taupe/50 bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/home" className="text-[1.3rem] font-black leading-none tracking-tight text-foreground">
          FAST
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/notifications"
            aria-label="Notifications"
            className="lift rounded-xl border-2 border-taupe p-2 text-dim hover:border-brand hover:text-brand"
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
          </Link>
          <EmergencyButton />
        </div>
      </header>

      {/* Content */}
      <main className="pb-28 lg:pb-10 lg:pl-64">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <OfflineBanner />
          {children}
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-taupe/60 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5">
          {MOBILE_PRIMARY.map((href) => {
            const item = NAV.find((n) => n.href === href)!;
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ${
                  active ? "text-brand" : "text-dim hover:text-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" aria-hidden="true" />
                {item.label}
                {active && (
                  <motion.span
                    layoutId="tab-underline"
                    className="h-0.5 w-6 rounded-full bg-brand"
                    transition={reduce ? { duration: 0 } : { duration: 0.3 }}
                  />
                )}
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
            className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ${
              MORE_ITEMS.some((m) => isActive(m.href)) ? "text-brand" : "text-dim hover:text-foreground"
            }`}
          >
            <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
            More
          </button>
        </div>
      </nav>

      {/* More sheet (mobile) */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            className="fixed inset-0 z-100 flex items-end lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0.01 : 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-label="More places in Fast"
          >
            <button aria-label="Close" className="absolute inset-0 bg-black/60" onClick={() => setMoreOpen(false)} />
            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 28 }}
              transition={{ duration: reduce ? 0.01 : 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="card-surface relative m-3 w-auto flex-1 p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">More of Fast</p>
                <button
                  onClick={() => setMoreOpen(false)}
                  aria-label="Close"
                  className="rounded-xl border-2 border-taupe p-2 text-dim hover:border-brand hover:text-brand"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {MORE_ITEMS.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    className={`lift flex min-h-12 items-center gap-3 rounded-2xl border-2 px-4 text-sm font-bold ${
                      isActive(href)
                        ? "border-brand/60 bg-brand/10 text-brand"
                        : "border-taupe bg-taupe/15 text-body hover:border-brand hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    {label}
                  </Link>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <EmergencySheet open={emergencyOpen} onClose={() => setEmergencyOpen(false)} />
    </div>
  );
}
