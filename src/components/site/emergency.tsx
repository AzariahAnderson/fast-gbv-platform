"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, Phone, PhoneCall } from "lucide-react";
import { Reveal, SectionHeading } from "./reveal";
import { CallCard, CopyChip } from "./cards";

/**
 * The one and only section of the site that carries phone numbers. Critical
 * lines come first as large tap targets, the full verified directory follows
 * inside a collapsed disclosure so the page stays calm: open it only when
 * the moment needs it. Every other section links here instead of repeating
 * numbers.
 */

type Directory = {
  name: string;
  what: string;
  number: string;
  tel?: string;
  hours: string;
  tag: string;
  group: string;
};

const DIRECTORY: Directory[] = [
  {
    name: "GBV Command Centre",
    what: "Crisis counselling, social workers, shelters and referrals, for survivors and abusers",
    number: "0800 428 428",
    tel: "0800428428",
    hours: "24 hours, free",
    tag: "First call",
    group: "Urgent and first call",
  },
  {
    name: "SAPS, South African Police Service",
    what: "Emergencies, opening a case, protection order enforcement, FCS units for sexual offences",
    number: "10111",
    tel: "10111",
    hours: "24 hours, free",
    tag: "Emergency",
    group: "Urgent and first call",
  },
  {
    name: "Cellphone emergency",
    what: "Routes you to the nearest police, ambulance or fire service from any cellphone",
    number: "112",
    tel: "112",
    hours: "24 hours, free",
    tag: "No airtime",
    group: "Urgent and first call",
  },
  {
    name: "Ambulance and fire",
    what: "Medical emergencies, serious injuries and firefighting response",
    number: "10177",
    tel: "10177",
    hours: "24 hours, free",
    tag: "Emergency",
    group: "Urgent and first call",
  },
  {
    name: "TEARS Foundation",
    what: "Free SMS helpline for survivors of gender based and sexual violence",
    number: "*134*7355#",
    hours: "24 hours, free",
    tag: "Silent help",
    group: "Silent and anonymous help",
  },
  {
    name: "Crime Stop",
    what: "Report crime anonymously, no names taken and no court appearances required",
    number: "0860 010 111",
    tel: "0860010111",
    hours: "24 hours, free",
    tag: "Anonymous",
    group: "Silent and anonymous help",
  },
  {
    name: "POWA, People Opposed to Women Abuse",
    what: "Counselling, shelters and court support for women experiencing abuse",
    number: "011 642 4345",
    tel: "0116424345",
    hours: "Office hours",
    tag: "Shelter",
    group: "Counselling, shelters and families",
  },
  {
    name: "Lifeline South Africa",
    what: "Emotional counselling for anyone, survivors, witnesses and those who cause harm",
    number: "0861 322 322",
    tel: "0861322322",
    hours: "24 hours, free",
    tag: "Counselling",
    group: "Counselling, shelters and families",
  },
  {
    name: "Family Life Centre, FAMSA",
    what: "Professional individual, relationship and family counselling in Johannesburg",
    number: "011 788 4784",
    tel: "0117884784",
    hours: "Mon to Fri, 08:00 to 17:00",
    tag: "Counselling",
    group: "Counselling, shelters and families",
  },
  {
    name: "Childline South Africa",
    what: "Child abuse, neglect and support for children and teenagers",
    number: "116",
    tel: "116",
    hours: "24 hours, free",
    tag: "Children",
    group: "Children and young people",
  },
  {
    name: "Sonke Gender Justice",
    what: "Men's behaviour change groups and gender justice advocacy",
    number: "011 339 3589",
    tel: "0113393589",
    hours: "Office hours",
    tag: "Change",
    group: "For those who cause harm",
  },
];

const GROUPS: { label: string; blurb: string }[] = [
  {
    label: "Urgent and first call",
    blurb: "Life-threatening danger, the police and medical response",
  },
  {
    label: "Silent and anonymous help",
    blurb: "Reach out without a voice call, without leaving a name",
  },
  {
    label: "Counselling, shelters and families",
    blurb: "Ongoing support for survivors, witnesses and their families",
  },
  {
    label: "Children and young people",
    blurb: "Abuse, neglect and anyone reporting a child at risk",
  },
  {
    label: "For those who cause harm",
    blurb: "Behaviour change support, without judgement",
  },
];

function DirectoryRow({ r, last }: { r: Directory; last: boolean }) {
  return (
    <li
      className={`grid grid-cols-1 gap-3 px-5 py-5 transition-colors duration-300 hover:bg-taupe/15 sm:px-6 lg:grid-cols-[1.1fr_1.6fr_auto_auto] lg:items-center lg:gap-4 ${
        last ? "" : "border-b-2 border-taupe/60"
      }`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-lg border-2 border-taupe bg-taupe/20 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-dim">
          {r.tag}
        </span>
        <span className="font-black tracking-tight text-foreground">{r.name}</span>
      </div>
      <p className="text-sm font-medium leading-relaxed text-body">{r.what}</p>
      <div className="flex items-center gap-2">
        {r.tel ? (
          <a
            href={`tel:${r.tel}`}
            aria-label={`Call ${r.name} on ${r.number}`}
            className="lift inline-flex min-h-11 items-center gap-2 rounded-xl border-[3px] border-brand bg-brand/10 px-4 py-2 text-base font-bold tracking-tight text-brand hover:bg-brand hover:text-ink"
          >
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            {r.number}
          </a>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-xl border-[3px] border-brand bg-brand/10 px-4 py-2 text-base font-bold tracking-tight text-brand">
            {r.number}
            <CopyChip value={r.number} />
          </span>
        )}
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-faint lg:text-right">
        {r.hours}
      </p>
    </li>
  );
}

export function Emergency() {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  return (
    <section
      id="emergency"
      className="relative scroll-mt-28 py-20 sm:py-28"
      aria-labelledby="emergency-heading"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="In danger right now"
          title={
            <>
              Every number you need,
              <span className="text-brand"> one place</span>
            </>
          }
          sub="This is the only section of the page that carries numbers, so nothing competes with it. Every line here is free, official and answered around the clock. Tap to dial, or copy the code and send it from any phone, including a borrowed one."
        />

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* GBV Command Centre, featured */}
          <Reveal className="sm:col-span-2" delay={0.05}>
            <CallCard
              title="GBV Command Centre"
              tagline="Department of Social Development"
              number="0800 428 428"
              href="tel:0800428428"
              featured
              description="South Africa's national 24 hour crisis line for gender based violence. Trained counsellors speak all 11 official languages, assess your immediate danger and can send a mobile social worker, arrange shelter space or stay on the line while you contact the police."
              chips={["Toll free", "24 hours", "11 languages", "Social worker callback"]}
              icon={
                <PhoneCall className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
              }
              iconLabel="Live line, answered around the clock"
            />
          </Reveal>

          {/* Silent help */}
          <Reveal delay={0.12}>
            <div className="card-hover card-surface flex h-full flex-col justify-between gap-6 p-6 sm:p-7">
              <div className="flex items-center justify-between">
                <h3 className="font-head text-lg font-black tracking-tight text-foreground">
                  Can&apos;t speak out loud?
                </h3>
                <span className="rounded-lg border-2 border-taupe bg-taupe/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-dim">
                  Silent
                </span>
              </div>
              <div className="flex flex-col gap-4">
                <div className="rounded-2xl border-2 border-taupe bg-taupe/20 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-dim">
                    Please Call Me, free callback
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-2xl font-black tracking-tight text-brand">*120*7867#</span>
                    <CopyChip value="*120*7867#" />
                  </div>
                </div>
                <div className="rounded-2xl border-2 border-taupe bg-taupe/20 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-dim">
                    SMS the word Help to
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-2xl font-black tracking-tight text-brand">31531</span>
                    <CopyChip value="31531" />
                  </div>
                </div>
              </div>
              <p className="text-sm font-medium leading-relaxed text-body">
                A counsellor calls you back and the request costs nothing. Nothing
                appears on your phone bill and no number shows on your screen.
              </p>
            </div>
          </Reveal>

          {/* Police */}
          <Reveal delay={0.18}>
            <CallCard
              title="SAPS, police"
              number="10111"
              href="tel:10111"
              description="For life threatening emergencies. Police must respond to every domestic violence complaint, help you reach a place of safety and assist with a protection order. Dedicated Family Violence, Child Protection and Sexual Offences units handle these cases."
              chips={["24 hours", "Free", "FCS units"]}
            />
          </Reveal>

          {/* Ambulance */}
          <Reveal delay={0.24}>
            <CallCard
              title="Ambulance and fire"
              number="10177"
              href="tel:10177"
              description="Medical emergencies and serious injuries. From any cellphone you can also dial 112, which works on MTN, Vodacom, Cell C and Telkom even without airtime."
              chips={["24 hours", "Free", "Cellphone: 112"]}
            />
          </Reveal>

          {/* Childline */}
          <Reveal delay={0.3}>
            <CallCard
              title="Childline SA"
              number="116"
              href="tel:116"
              description="For children and young people facing abuse or neglect, and for adults reporting a child at risk. Toll free from every network, any time of day."
              chips={["Toll free", "24 hours", "Children and teens"]}
            />
          </Reveal>
        </div>

        {/* Full verified directory: collapsed by default so the emergency
            section stays calm, grouped so it is scannable once opened. */}
        <Reveal delay={0.1}>
          <h3
            id="directory"
            className="mt-16 scroll-mt-28 text-balance font-head text-2xl font-black tracking-tight text-foreground sm:text-3xl"
          >
            The full directory, <span className="text-brand">verified</span>
          </h3>
        </Reveal>
        <Reveal delay={0.14}>
          <div className="card-surface mt-8 overflow-hidden">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="directory-panel"
              className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition-colors duration-300 hover:bg-taupe/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand sm:px-6 sm:py-6"
            >
              <span className="flex flex-col gap-1.5">
                <span className="font-head text-lg font-black tracking-tight text-foreground">
                  {open ? "Hide the full directory" : "Open the full directory"}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-dim">
                  11 verified services · grouped · tap to call or copy
                </span>
              </span>
              <span
                className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 transition-all duration-500 ${
                  open
                    ? "border-brand bg-brand/15 text-brand"
                    : "border-taupe bg-taupe/20 text-foreground"
                }`}
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-500 ${open ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </span>
            </button>

            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  id="directory-panel"
                  key="directory-panel"
                  initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
                  exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={
                    reduce
                      ? { duration: 0.15 }
                      : { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
                  }
                  className="overflow-hidden border-t-[3px] border-taupe"
                >
                  {GROUPS.map((group, gi) => {
                    const rows = DIRECTORY.filter((r) => r.group === group.label);
                    return (
                      <div
                        key={group.label}
                        className={gi !== GROUPS.length - 1 ? "border-b-2 border-taupe/60" : ""}
                      >
                        <p className="px-5 pb-1 pt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-brand sm:px-6">
                          {group.label}
                        </p>
                        <p className="px-5 pb-4 text-xs font-medium leading-relaxed text-faint sm:px-6">
                          {group.blurb}
                        </p>
                        <ul className="flex flex-col">
                          {rows.map((r, i) => (
                            <DirectoryRow key={r.name} r={r} last={i === rows.length - 1} />
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Reveal>
        <Reveal delay={0.18}>
          <p className="mt-6 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-faint">
            Details verified at the time of publishing, confirm office hours before travelling
          </p>
        </Reveal>

        <Reveal delay={0.22}>
          <p className="mt-10 rounded-2xl border-2 border-taupe bg-taupe/15 px-5 py-4 text-center text-sm font-medium leading-relaxed text-body sm:px-8">
            <span className="font-bold text-foreground">A note on safety:</span>{" "}
            calls and SMS leave a record on your phone. If that puts you at risk,
            delete the entry afterwards and browse this page in private mode. If
            you are in immediate danger, leave the screen and call the police.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
