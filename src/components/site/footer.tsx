"use client";

import { ArrowUpRight } from "lucide-react";

const COLUMNS = [
  {
    title: "Emergency",
    links: [
      { label: "GBV Command Centre, 0800 428 428", href: "tel:0800428428" },
      { label: "SAPS Police, 10111", href: "tel:10111" },
      { label: "Ambulance and Fire, 10177", href: "tel:10177" },
      { label: "Childline, 116", href: "tel:116" },
    ],
  },
  {
    title: "For survivors",
    links: [
      { label: "Emergency numbers", href: "#emergency" },
      { label: "Counselling and shelters", href: "#survivors" },
      { label: "Legal protection", href: "#survivors" },
      { label: "Safety planning", href: "#survivors" },
    ],
  },
  {
    title: "For change",
    links: [
      { label: "Three honest steps", href: "#change" },
      { label: "Behaviour change programmes", href: "#change" },
      { label: "Family counselling, FAMSA", href: "tel:0117884784" },
      { label: "Sonke Gender Justice", href: "tel:0113393589" },
    ],
  },
  {
    title: "Site",
    links: [
      { label: "The crisis in numbers", href: "#stats" },
      { label: "Full resource directory", href: "#resources" },
      { label: "FAQ", href: "#faq" },
      { label: "Back to top", href: "#top" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative mt-auto overflow-hidden border-t-2 border-taupe/50 pb-10 pt-16 sm:pt-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[-30%] left-1/2 h-[22rem] w-[56rem] -translate-x-1/2 rounded-full bg-brand/[0.05] blur-[130px]"
      />
      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.2fr_2fr] lg:gap-16">
          <div className="flex flex-col gap-5">
            <p className="text-4xl font-black tracking-tighter">
              FAST<span className="ml-1 inline-block h-2.5 w-2.5 rounded-full bg-brand" />
            </p>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
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
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand">
                  {col.title}
                </p>
                <ul className="flex flex-col gap-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="group inline-flex items-start gap-1 text-[13px] leading-snug text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                        {link.href.startsWith("tel:") ? (
                          <ArrowUpRight
                            className="mt-0.5 h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                            aria-hidden="true"
                          />
                        ) : null}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-14 select-none overflow-hidden" aria-hidden="true">
          <p className="text-center text-[19vw] font-black leading-[0.8] tracking-tighter text-taupe/15 mask-fade-b">
            FAST
          </p>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t-2 border-taupe/50 pt-6 sm:flex-row">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60">
            Built with care for South Africa, {new Date().getFullYear()}
          </p>
          <p className="text-center font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60">
            In immediate danger? Call <span className="font-bold text-brand">10111</span> now
          </p>
        </div>
      </div>
    </footer>
  );
}
