"use client";

import { Phone, Plus } from "lucide-react";
import { Reveal } from "./reveal";

export function Cta() {
  return (
    <section className="relative py-20 sm:py-28" aria-labelledby="cta-heading">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <div className="card-surface card-featured relative overflow-hidden px-6 py-16 text-center sm:px-12 sm:py-24">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
            >
              <div className="absolute inset-0 bg-grid opacity-25 bg-fade-y" />
            </div>

            <div className="relative flex flex-col items-center">
              <span className="mb-6 inline-flex items-center gap-2 rounded-lg border-2 border-taupe bg-taupe/20 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-dim">
                <span className="h-px w-3.5 bg-brand" aria-hidden="true" />
                Save this number today
              </span>
              <h2
                id="cta-heading"
                className="text-balance font-display text-4xl font-black leading-[1.02] tracking-tight text-foreground sm:text-6xl lg:text-7xl"
              >
                One call can change
                <span className="text-brand"> everything</span>
              </h2>
              <p className="mt-6 max-w-xl text-balance text-base font-medium leading-relaxed text-body sm:text-lg">
                Yours, or someone else&apos;s. Save the Command Centre in your
                contacts today, not because you expect trouble, but because
                trouble never sends an invitation.
              </p>
              <a
                href="tel:0800428428"
                className="lift group mt-10 inline-flex min-h-16 items-center gap-3 rounded-2xl bg-brand px-9 text-2xl font-black tracking-tight text-ink shadow-[0_20px_44px_-18px_rgba(216,211,101,0.5)] hover:bg-brand-2"
              >
                <Phone
                  className="h-6 w-6 transition-transform group-hover:rotate-12"
                  aria-hidden="true"
                />
                0800 428 428
              </a>
              <p className="mt-6 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-dim">
                <Plus className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                Free, confidential, all 11 languages, never closed
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
