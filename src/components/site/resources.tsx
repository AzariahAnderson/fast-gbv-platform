"use client";

import { Reveal, SectionHeading } from "./reveal";
import { Phone } from "lucide-react";

type Resource = {
  name: string;
  what: string;
  number: string;
  tel?: string;
  hours: string;
  tag: string;
};

const RESOURCES: Resource[] = [
  {
    name: "GBV Command Centre",
    what: "Crisis counselling, social workers, shelters and referrals, for survivors and abusers",
    number: "0800 428 428",
    tel: "0800428428",
    hours: "24 hours, free",
    tag: "First call",
  },
  {
    name: "SAPS, South African Police Service",
    what: "Emergencies, opening a case, protection order enforcement, FCS units for sexual offences",
    number: "10111",
    tel: "10111",
    hours: "24 hours, free",
    tag: "Emergency",
  },
  {
    name: "Cellphone emergency",
    what: "Routes you to the nearest police, ambulance or fire service from any cellphone",
    number: "112",
    tel: "112",
    hours: "24 hours, free",
    tag: "No airtime",
  },
  {
    name: "Ambulance and fire",
    what: "Medical emergencies, serious injuries and firefighting response",
    number: "10177",
    tel: "10177",
    hours: "24 hours, free",
    tag: "Emergency",
  },
  {
    name: "TEARS Foundation",
    what: "Free SMS helpline for survivors of gender based and sexual violence",
    number: "*134*7355#",
    hours: "24 hours, free",
    tag: "Silent help",
  },
  {
    name: "POWA, People Opposed to Women Abuse",
    what: "Counselling, shelters and court support for women experiencing abuse",
    number: "011 642 4345",
    tel: "0116424345",
    hours: "Office hours",
    tag: "Shelter",
  },
  {
    name: "Lifeline South Africa",
    what: "Emotional counselling for anyone, survivors, witnesses and those who cause harm",
    number: "0861 322 322",
    tel: "0861322322",
    hours: "24 hours, free",
    tag: "Counselling",
  },
  {
    name: "Childline South Africa",
    what: "Child abuse, neglect and support for children and teenagers",
    number: "116",
    tel: "116",
    hours: "24 hours, free",
    tag: "Children",
  },
  {
    name: "Sonke Gender Justice",
    what: "Men's behaviour change groups and gender justice advocacy",
    number: "011 339 3589",
    tel: "0113393589",
    hours: "Office hours",
    tag: "Change",
  },
  {
    name: "Family Life Centre, FAMSA",
    what: "Professional individual, relationship and family counselling in Johannesburg",
    number: "011 788 4784",
    tel: "0117884784",
    hours: "Mon to Fri, 08:00 to 17:00",
    tag: "Counselling",
  },
  {
    name: "Crime Stop",
    what: "Report crime anonymously, no names taken and no court appearances required",
    number: "0860 010 111",
    tel: "0860010111",
    hours: "24 hours, free",
    tag: "Anonymous",
  },
];

export function Resources() {
  return (
    <section
      id="resources"
      className="relative scroll-mt-28 py-20 sm:py-28"
      aria-labelledby="resources-heading"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="The full directory"
          title={
            <>
              Every service. <span className="text-brand">One page.</span> Zero
              excuses.
            </>
          }
          sub="Verified national and regional helplines. Save this page, screenshot the numbers, share them with someone who needs them today."
        />

        <div className="card-surface mt-14 overflow-hidden">
          <div className="hidden grid-cols-[1.1fr_1.6fr_auto_auto] gap-4 border-b-2 border-taupe/60 bg-ink-2 px-6 py-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground lg:grid">
            <span>Service</span>
            <span>What they do</span>
            <span>Number</span>
            <span className="text-right">Hours</span>
          </div>
          <ul className="flex flex-col">
            {RESOURCES.map((r, i) => (
              <Reveal key={r.name} delay={Math.min(i * 0.04, 0.3)} y={14}>
                <li
                  className={`group grid grid-cols-1 gap-3 px-5 py-5 transition-colors duration-300 hover:bg-ink-2 sm:px-6 lg:grid-cols-[1.1fr_1.6fr_auto_auto] lg:items-center lg:gap-4 ${
                    i !== RESOURCES.length - 1 ? "border-b-2 border-taupe/40" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-lg border-2 border-taupe/50 bg-ink-2 px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-brand">
                      {r.tag}
                    </span>
                    <span className="font-bold tracking-tight">{r.name}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{r.what}</p>
                  <div className="flex items-center gap-2">
                    {r.tel ? (
                      <a
                        href={`tel:${r.tel}`}
                        aria-label={`Call ${r.name} on ${r.number}`}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-brand/50 bg-brand/10 px-4 py-2 text-base font-black tracking-tight text-brand transition-all hover:bg-brand hover:text-ink-deep"
                      >
                        <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                        {r.number}
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-xl border-2 border-brand/50 bg-brand/10 px-4 py-2 text-base font-black tracking-tight text-brand">
                        {r.number}
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/80 lg:text-right">
                    {r.hours}
                  </p>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>

        <Reveal delay={0.2}>
          <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60">
            Details verified at the time of publishing, confirm office hours before travelling
          </p>
        </Reveal>
      </div>
    </section>
  );
}
