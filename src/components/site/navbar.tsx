"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Phone, X, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SPLASH_SKIPPED } from "@/lib/splash";
import { EASE } from "@/lib/motion";
import { CRISIS_TEL_HREF } from "@/lib/numbers";

const LINKS = [
  { label: "Emergency", href: "#emergency" },
  { label: "Survivors", href: "#survivors" },
  { label: "Live", href: "#live" },
  { label: "Change", href: "#change" },
  { label: "FAQ", href: "#faq" },
];

export function Logo({
  className,
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) {
  return (
    <a
      href="#top"
      onClick={onClick}
      className={cn(
        "inline-flex items-center text-[1.35rem] font-black leading-none tracking-tight text-foreground transition-colors duration-300 hover:text-brand",
        className
      )}
      aria-label="Fast, back to top"
    >
      FAST
    </a>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  // Scroll spy and the bar's scrolled style, computed from geometry on
  // every frame the page actually moves. The bar never hides: on a crisis
  // page the one tap to "Get help now" has to stay reachable no matter how
  // far a visitor has scrolled, and anchor navigation must never leave the
  // bar stranded off-screen (the old hide-on-scroll-down logic did exactly
  // that after clicking a nav link). A narrow band around the vertical
  // middle of the viewport is matched against the five nav sections, so the
  // highlight always answers "where am I" for wheel scrolling, anchor jumps
  // and keyboard moves alike. IntersectionObserver was tried first but its
  // callbacks are tick-timing dependent in headless and low power browsers:
  // after a smooth anchor jump the last callback can report a stale band
  // and leave the highlight wrong or missing. Geometry does not have that
  // failure mode, and five rect reads per scroll frame are nothing.
  useEffect(() => {
    let raf = 0;
    const compute = () => {
      raf = 0;
      setScrolled(window.scrollY > 16);

      const bandTop = window.innerHeight * 0.38;
      const bandBottom = window.innerHeight * 0.48;
      let found: string | null = null;
      for (const link of LINKS) {
        const el = document.getElementById(link.href.slice(1));
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= bandTop && rect.bottom >= bandBottom) {
          found = link.href;
          break;
        }
      }
      // Pinned to the very bottom of a long page the band can fall between
      // sections (steps and cta carry no nav link); keeping the nearest
      // section above highlighted reads better than dropping the marker.
      if (!found && window.scrollY > 0) {
        const doc = document.documentElement;
        if (window.scrollY + window.innerHeight >= doc.scrollHeight - 4) {
          for (let i = LINKS.length - 1; i >= 0; i--) {
            const el = document.getElementById(LINKS[i].href.slice(1));
            if (el && el.getBoundingClientRect().top < bandTop) {
              found = LINKS[i].href;
              break;
            }
          }
        }
      }
      setActive(found);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };
    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Anchor jumps get their own immediate highlight: setting the clicked
  // link right away is honest feedback — the browser is on its way there,
  // so the nav should say so at once. The scroll handler then keeps it
  // correct for every movement afterwards.
  const onNavLink = (href: string) => setActive(href);

  // Locking the page scroll while the mobile menu is open.
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  // The mobile menu is a modal dialog: move focus in, keep it trapped between
  // the menu controls while open, close on Escape and hand focus back.
  useEffect(() => {
    if (!open) return;
    const opener = openerRef.current;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const dialog = menuRef.current;
      if (!dialog) return;
      const focusable = dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !dialog.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !dialog.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, [open]);

  return (
    <>
      <motion.header
        initial={{ y: "-90%", opacity: 0 }}
        animate={{ y: "0%", opacity: 1 }}
        transition={
          SPLASH_SKIPPED
            ? { delay: 0.2, duration: 0.7, ease: EASE }
            : { delay: 4.05, duration: 0.7, ease: EASE }
        }
        className={cn(
          "fixed inset-x-0 top-0 z-[100] pt-[env(safe-area-inset-top)] transition-[background-color,border-color,box-shadow] duration-500",
          scrolled
            ? "border-b-[3px] border-taupe bg-ink/95 shadow-[0_16px_40px_-24px_rgba(0,0,0,0.55)] supports-[backdrop-filter]:bg-ink/80 supports-[backdrop-filter]:backdrop-blur-xl"
            : "border-b-[3px] border-transparent bg-transparent"
        )}
      >
        <nav
          aria-label="Main navigation"
          className={cn(
            "mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 transition-[height] duration-500 sm:px-8",
            scrolled ? "h-14" : "h-16"
          )}
        >
          <Logo />

          <ul className="hidden items-center gap-1 lg:flex">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => onNavLink(link.href)}
                  aria-current={active === link.href ? "true" : undefined}
                  className={cn(
                    "relative rounded-lg px-3.5 py-2 text-[15px] font-bold transition-colors duration-300 after:absolute after:inset-x-3.5 after:bottom-1 after:h-0.5 after:origin-left after:rounded-full after:bg-brand after:transition-transform after:duration-300 after:ease-out",
                    active === link.href
                      ? "text-foreground after:scale-x-100"
                      : "text-body after:scale-x-0 hover:text-foreground hover:after:scale-x-100"
                  )}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2.5">
            <a
              href="tel:0800428428"
              className="lift group hidden min-h-10 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold tracking-tight text-ink hover:bg-brand-2 sm:inline-flex"
            >
              <Phone
                className="h-4 w-4 transition-transform group-hover:rotate-12"
                aria-hidden="true"
              />
              Get help now
            </a>
            <a
              href="tel:0800428428"
              aria-label="Call the GBV Command Centre now"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-ink sm:hidden"
            >
              <Phone className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Get help now</span>
            </a>
            <button
              ref={openerRef}
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-expanded={open}
              aria-haspopup="dialog"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 border-taupe bg-taupe/20 text-foreground transition-colors hover:border-brand hover:text-brand lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </nav>

      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[150] flex flex-col bg-ink pt-[env(safe-area-inset-top)] lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile menu"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-grid bg-fade-y opacity-25"
            />

            <div className="relative flex h-16 items-center justify-between px-5 sm:px-8">
              <Logo onClick={() => setOpen(false)} />
              <button
                ref={closeRef}
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
                    ease: EASE,
                  }}
                  className="group flex items-center justify-between border-b-[3px] border-taupe/50 py-4 text-3xl font-black tracking-tight text-foreground"
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
                href={CRISIS_TEL_HREF}
                className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-lg font-bold text-ink"
              >
                <Phone className="h-5 w-5" aria-hidden="true" />
                Call the Command Centre now
              </a>
              <p className="mt-4 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-dim">
                Free, confidential, answered 24 hours a day
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
