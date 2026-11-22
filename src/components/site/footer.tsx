"use client";

import { ArrowUpRight, ShieldCheck, BadgeCheck, BookOpenCheck, WifiOff, Sparkles } from "lucide-react";

/**
 * Footer navigation carries no phone numbers, every line hands off to the
 * single emergency section instead. The closing row keeps one quiet pointer
 * to it for anyone who scrolls all the way down in a crisis.
 */

const COLUMNS = [
  {
    title: "Help",
    links: [
      { label: "Emergency numbers", href: "#emergency" },
      { label: "How Fast works", href: "#how" },
      { label: "Questions people ask", href: "#faq" },
      { label: "Back to top", href: "#top" },
    ],
  },
  {
    title: "For survivors",
    links: [
      { label: "Counselling and shelters", href: "#survivors" },
      { label: "Legal protection", href: "#survivors" },
      { label: "Safety planning", href: "#survivors" },
      { label: "Help for children", href: "#survivors" },
    ],
  },
  {
    title: "For change",
    links: [
      { label: "Three honest steps out", href: "#change" },
      { label: "Behaviour change programmes", href: "#change" },
      { label: "Family counselling", href: "#change" },
      { label: "Men's groups", href: "#change" },
    ],
  },
  {
    title: "About the data",
    links: [
      { label: "Live figures, refreshed hourly", href: "#live" },
      { label: "News with sources", href: "#live" },
      { label: "The full directory", href: "#emergency" },
      { label: "Today's safety tip", href: "#live" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative mt-auto overflow-hidden border-t-[3px] border-taupe pb-10 pt-16 sm:pt-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-30%] left-1/2 h-[22rem] w-[56rem] -translate-x-1/2 rounded-full bg-taupe/35 blur-[130px]"
      />
      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.2fr_2fr] lg:gap-16">
          <div className="flex flex-col gap-5">
            <p className="inline-flex items-center text-4xl font-black tracking-tight text-foreground">
              FAST
            </p>
            <p className="max-w-xs text-sm font-medium leading-relaxed text-body">
              A public awareness page that connects South Africans to official,
              free gender based violence services. It is not a substitute for
              police, medical or legal services.
            </p>
          </div>

          <nav
            aria-label="Footer navigation"
            className="grid grid-cols-2 gap-8 sm:grid-cols-4"
          >
            {COLUMNS.map((col) => (
              <div key={col.title} className="flex flex-col gap-3.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-dim">
                  {col.title}
                </p>
                <ul className="flex flex-col gap-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="group inline-flex items-start gap-1 text-[13px] font-semibold leading-snug text-body transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-14 grid gap-4 border-t-[3px] border-taupe pt-8 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-dim">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Private by design
            </p>
            <p className="text-[13px] font-medium leading-relaxed text-body">
              Fast is a static awareness page. No accounts, no tracking cookies
              and no personal information collected or stored.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-dim">
              <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
              Works without data
            </p>
            <p className="text-[13px] font-medium leading-relaxed text-body">
              Once this page has loaded, it stays available offline. Visit it
              once today and the emergency section keeps working with no
              connection and almost no airtime.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-dim">
              <BookOpenCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Statistics you can check
            </p>
            <p className="text-[13px] font-medium leading-relaxed text-body">
              Figures and headlines refresh hourly with Google Search grounding
              and every card links to its publishing source. Emergency numbers
              are always the verified official ones.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t-[3px] border-taupe pt-6 sm:flex-row">
          <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-faint">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Animated emoji artwork by Noto Emoji, built with care for South Africa, {new Date().getFullYear()}
          </p>
          <a
            href="#emergency"
            className="inline-flex items-center gap-1.5 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-faint transition-colors hover:text-brand"
          >
            In immediate danger? The emergency numbers are one tap away
            <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  );
}
