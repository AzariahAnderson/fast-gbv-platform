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
        "group inline-flex items-center gap-1.5 font-display text-[1.35rem] leading-none tracking-tight text-foreground",
        className
      )}
      aria-label="Fast, back to top"
    >
      FAST
      <span
        className="h-[7px] w-[7px] rotate-45 bg-brand transition-transform duration-300 group-hover:scale-125"
        aria-hidden="true"
      />
    </a>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
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
        initial={{ y: -90, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 4.05, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "fixed inset-x-0 top-0 z-[100] transition-all duration-500",
          scrolled
            ? "border-b-[3px] border-taupe bg-ink/90 backdrop-blur-xl"
            : "border-b-[3px] border-transparent bg-transparent"
        )}
      >
        <nav
          aria-label="Main navigation"
          className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-5 sm:px-8"
        >
          <Logo />

          <ul className="hidden items-center gap-1 lg:flex">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="rounded-lg px-3.5 py-2 font-head text-[15px] font-medium text-muted-foreground transition-colors hover:bg-taupe/25 hover:text-foreground"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2.5">
            <a
              href="tel:0800428428"
              className="group hidden min-h-10 items-center gap-2 rounded-xl bg-brand px-5 font-head text-sm font-semibold tracking-tight text-ink transition-colors hover:bg-brand-2 sm:inline-flex"
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
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-ink sm:hidden"
            >
              <Phone className="h-5 w-5" aria-hidden="true" />
            </a>
            <button
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-expanded={open}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 border-taupe bg-taupe/20 text-foreground transition-colors hover:border-brand hover:text-brand lg:hidden"
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
          className="fixed inset-0 z-[150] flex flex-col bg-ink lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile menu"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-grid bg-fade-y opacity-25"
          />

          <div className="relative flex h-16 items-center justify-between px-5 sm:px-8">
            <Logo />
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 border-taupe bg-taupe/20"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
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
                className="group flex items-center justify-between border-b-[3px] border-taupe/50 py-4 font-display text-3xl uppercase tracking-tight text-foreground"
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
              className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand font-head text-lg font-semibold text-ink"
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
