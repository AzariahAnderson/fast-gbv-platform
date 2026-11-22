"use client";

import { Reveal, SectionHeading } from "./reveal";
import { PhoneCall, Compass, HandHeart } from "lucide-react";

const STEPS = [
  {
    n: "01",
    icon: <PhoneCall className="h-6 w-6" aria-hidden="true" />,
    title: "Reach out",
    body: "Call, SMS or send a free Please Call Me from any network, at any hour, in any language. No airtime needed and nothing recorded on your bill. Just a trained human voice.",
  },
  {
    n: "02",
    icon: <Compass className="h-6 w-6" aria-hidden="true" />,
    title: "Get matched",
    body: "A counsellor assesses your situation and connects you to exactly what you need: police, an ambulance, a shelter, a social worker, legal help, or a behaviour change programme if you are the one causing harm.",
  },
  {
    n: "03",
    icon: <HandHeart className="h-6 w-6" aria-hidden="true" />,
    title: "Stay supported",
    body: "Help does not hang up after one call. You receive follow up contact, a personal safety plan, court preparation and counselling for you, your children and the wider family.",
  },
];

export function Steps() {
  return (
    <section
      id="how"
      className="relative scroll-mt-28 py-20 sm:py-28"
      aria-labelledby="how-heading"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="How Fast works"
          title={
            <>
              Three steps between
              <span className="text-brand"> fear and safety.</span>
            </>
          }
          align="center"
        />

        <div className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={0.08 * i}>
              <div className="card-hover card-surface group relative flex h-full flex-col gap-5 p-7">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-5 top-3 font-display text-[4.6rem] font-black leading-none text-taupe/40 transition-colors duration-500 group-hover:text-brand/30"
                >
                  {step.n}
                </span>
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border-2 border-taupe bg-taupe/20 text-brand transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6">
                  {step.icon}
                </div>
                <h3 className="font-head text-2xl font-black tracking-tight text-foreground">{step.title}</h3>
                <p className="text-sm font-medium leading-relaxed text-body">{step.body}</p>
                {i < 2 ? (
                  <span
                    aria-hidden="true"
                    className="absolute -right-[20px] top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 rotate-45 items-center justify-center border-[3px] border-taupe bg-background md:flex"
                  >
                    <span className="h-1.5 w-1.5 bg-brand" />
                  </span>
                ) : null}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
