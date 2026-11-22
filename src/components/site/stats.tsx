"use client";

import type { ReactNode } from "react";
import { Reveal } from "./reveal";
import { CountUp } from "./count-up";

const STATS: {
  value: ReactNode;
  unit?: string;
  label: string;
  source: string;
}[] = [
  {
    value: <span>1 in 3</span>,
    label: "women in South Africa experience physical and/or sexual violence in their lifetime",
    source: "HSRC National GBV Prevalence Survey, 2024",
  },
  {
    value: <CountUp to={5.5} decimals={1} />,
    unit: "per 100,000 women",
    label: "intimate partner femicide rate, close to five times the global average",
    source: "South African Medical Research Council",
  },
  {
    value: (
      <>
        <CountUp to={5} />
        <span>×</span>
      </>
    ),
    label: "South Africa's femicide rate compared to the global average",
    source: "WHO global femicide estimates",
  },
  {
    value: <span>24/7</span>,
    label: "the GBV Command Centre never closes, and neither should hope",
    source: "Department of Social Development",
  },
];

export function Stats() {
  return (
    <section
      id="stats"
      className="relative scroll-mt-28 border-y-[3px] border-taupe bg-taupe/15 py-20 sm:py-28"
      aria-labelledby="stats-heading"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-grid opacity-30 bg-fade-y"
      />
      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand">
            The crisis, and why Fast exists
          </p>
          <h2
            id="stats-heading"
            className="mt-5 text-balance font-head text-4xl font-black leading-[1.02] tracking-tight text-foreground sm:text-5xl"
          >
            Silence is the most dangerous
            <span className="text-brand"> number</span> of all.
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((stat, i) => (
            <Reveal key={stat.source} delay={0.06 * i}>
              <div className="card-hover card-surface group flex h-full flex-col gap-5 p-6 sm:p-7">
                <p
                  className={`font-display text-5xl font-black tracking-tight sm:text-[3.1rem] ${
                    i % 2 === 0 ? "text-foreground" : "text-brand"
                  }`}
                >
                  {stat.value}
                </p>
                {stat.unit ? (
                  <p className="-mt-3 text-sm font-bold uppercase tracking-wide text-brand-2">
                    {stat.unit}
                  </p>
                ) : null}
                <p className="text-sm font-medium leading-relaxed text-body">
                  {stat.label}
                </p>
                <p className="mt-auto text-[10px] font-bold uppercase tracking-[0.14em] text-faint">
                  {stat.source}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.3}>
          <p className="mt-10 text-center text-sm font-medium leading-relaxed text-body">
            Behind every number is a name, a family, a street in your city.{" "}
            <span className="font-bold text-foreground">
              Every one of them deserved help sooner.
            </span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
