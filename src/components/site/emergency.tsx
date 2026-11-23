"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, Phone, PhoneCall } from "lucide-react";
import { Reveal, SectionHeading } from "./reveal";
import { CallCard, CopyChip } from "./cards";
import { EASE } from "@/lib/motion";
import {
  CRISIS_LINE,
  CRISIS_TEL_HREF,
  DIRECTORY,
  DIRECTORY_GROUPS,
  telHref,
  telOf,
  type DirectoryEntry,
} from "@/lib/numbers";

/**
 * The one and only section of the site that carries phone numbers. Critical
 * lines come first as large tap targets, the full verified directory follows
 * inside a collapsed disclosure so the page stays calm: open it only when
 * the moment needs it. Every other section links here instead of repeating
 * numbers. The numbers themselves live in src/lib/numbers.ts — the single
 * immutable source of truth — and are only rendered here.
 */

function DirectoryRow({ r, last }: { r: DirectoryEntry; last: boolean }) {
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

  // The featured cards and the silent channels read their numbers from the
  // directory (never hardcoded here), looked up by their official name so a
  // renamed entry fails loudly instead of silently diverging.
  const entry = (name: string): DirectoryEntry => {
    const found = DIRECTORY.find((d) => d.name === name);
    if (!found) throw new Error(`Directory is missing the "${name}" entry`);
    return found;
  };
  const crisis = entry(CRISIS_LINE.name);
  const saps = entry("SAPS, South African Police Service");
  const ambulance = entry("Ambulance and fire");
  const childline = entry("Childline South Africa");
  const cellphone = entry("Cellphone emergency");
  const pleaseCallMe = entry("GBV Command Centre Please Call Me");
  const smsHelp = entry("GBV Command Centre SMS");

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
              title={crisis.name}
              tagline="Department of Social Development"
              number={crisis.number}
              href={telHref(telOf(crisis))}
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
                    <span className="text-2xl font-black tracking-tight text-brand">{pleaseCallMe.number}</span>
                    <CopyChip value={pleaseCallMe.number} />
                  </div>
                </div>
                <div className="rounded-2xl border-2 border-taupe bg-taupe/20 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-dim">
                    SMS the word Help to
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-2xl font-black tracking-tight text-brand">{smsHelp.number}</span>
                    <CopyChip value={smsHelp.number} />
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
              number={saps.number}
              href={telHref(telOf(saps))}
              description="For life threatening emergencies. Police must respond to every domestic violence complaint, help you reach a place of safety and assist with a protection order. Dedicated Family Violence, Child Protection and Sexual Offences units handle these cases."
              chips={["24 hours", "Free", "FCS units"]}
            />
          </Reveal>

          {/* Ambulance */}
          <Reveal delay={0.24}>
            <CallCard
              title="Ambulance and fire"
              number={ambulance.number}
              href={telHref(telOf(ambulance))}
              description={`Medical emergencies and serious injuries. From any cellphone you can also dial ${cellphone.number}, which works on MTN, Vodacom, Cell C and Telkom even without airtime.`}
              chips={["24 hours", "Free", `Cellphone: ${cellphone.number}`]}
            />
          </Reveal>

          {/* Childline */}
          <Reveal delay={0.3}>
            <CallCard
              title="Childline SA"
              number={childline.number}
              href={telHref(telOf(childline))}
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
                      : { duration: 0.5, ease: EASE }
                  }
                  className="overflow-hidden border-t-[3px] border-taupe"
                >
                  {DIRECTORY_GROUPS.map((group, gi) => {
                    const rows = DIRECTORY.filter((r) => r.group === group.label);
                    return (
                      <div
                        key={group.label}
                        className={gi !== DIRECTORY_GROUPS.length - 1 ? "border-b-2 border-taupe/60" : ""}
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
