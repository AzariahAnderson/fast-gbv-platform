"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Menu, Phone, X, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { label: "Emergency", href: "#emergency" },
  { label: "Survivors", href: "#survivors" },
  { label: "Change", href: "#change" },
  { label: "Resources", href: "#resources" },
  { label: "FAQ", href: "#faq" },
];

export function Logo({ className }: { className?: string }) {
  return (
    <a
      href="#top"
      className={cn(
        "group inline-flex items-baseline text-lg font-black tracking-tighter",
        className
      )}
      aria-label="Fast, back to top"
    >
      <span className="transition-colors group-hover:text-brand-2">FAST</span>
      <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-brand transition-transform duration-300 group-hover:scale-125" />
    </a>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex justify-center px-3 pt-3 sm:px-6 sm:pt-4"
      >
        <nav
          aria-label="Main navigation"
          className={cn(
            "pointer-events-auto flex h-14 w-full max-w-5xl items-center justify-between gap-2 rounded-2xl border-2 pl-4 pr-2 backdrop-blur-xl transition-all duration-500",
            scrolled
              ? "border-taupe/70 bg-ink-deep/90 shadow-[0_20px_50px_-16px_rgba(0,0,0,0.6)]"
              : "border-taupe/40 bg-ink-deep/50"
          )}
        >
          <Logo />

          <ul className="hidden items-center gap-0.5 lg:flex">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-ink/60 hover:text-foreground"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <a
              href="tel:0800428428"
              className="group hidden min-h-10 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold tracking-tight text-ink-deep transition-all hover:bg-brand-2 hover:shadow-[0_0_28px_rgba(216,211,101,0.35)] sm:inline-flex"
            >
              <Phone
                className="h-4 w-4 transition-transform group-hover:rotate-12"
                aria-hidden="true"
              />
              0800 428 428
            </a>
            <a
              href="tel:0800428428"
              aria-label="Call the GBV Command Centre now"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-ink-deep sm:hidden"
            >
              <Phone className="h-5 w-5" aria-hidden="true" />
            </a>
            <button
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-expanded={open}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 border-taupe/50 bg-ink/60 text-foreground transition-colors hover:border-taupe hover:bg-ink lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </nav>
      </motion.header>

      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[150] flex flex-col bg-ink-deep lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile menu"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-[-20%] h-[24rem] w-[36rem] -translate-x-1/2 rounded-full bg-brand/[0.07] blur-[120px]"
          />

          <div className="relative flex items-center justify-between px-4 pt-5">
            <div className="flex h-14 w-full items-center justify-between rounded-2xl border-2 border-taupe/40 bg-ink-deep/60 pl-4 pr-2">
              <Logo />
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 border-taupe/50 bg-ink/60"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          <nav
            className="relative flex flex-1 flex-col justify-center gap-1 px-7"
            aria-label="Mobile navigation"
          >
            {LINKS.map((link, i) => (
              <motion.a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: 0.06 + i * 0.05,
                  duration: 0.5,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="group flex items-center justify-between border-b-2 border-taupe/30 py-4 text-3xl font-extrabold tracking-tight"
              >
                {link.label}
                <ArrowUpRight
                  className="h-6 w-6 text-brand opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100"
                  aria-hidden="true"
                />
              </motion.a>
            ))}
          </nav>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="relative px-7 pb-[max(3rem,env(safe-area-inset-bottom))]"
          >
            <a
              href="tel:0800428428"
              className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-lg font-bold text-ink-deep"
            >
              <Phone className="h-5 w-5" aria-hidden="true" />
              Call 0800 428 428
            </a>
            <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Free, confidential, answered 24 hours a day
            </p>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
