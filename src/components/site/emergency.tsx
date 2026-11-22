"use client";

import { Reveal, SectionHeading } from "./reveal";
import { CallCard, CopyChip } from "./cards";

export function Emergency() {
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
              One tap. <span className="text-brand">Real people.</span> Any hour.
            </>
          }
          sub="Every number on this page is free, official and answered around the clock. Tap to dial, or copy the code and send it from any phone, including a borrowed one."
        />

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* GBV Command Centre, featured */}
          <Reveal className="sm:col-span-2 lg:col-span-2" delay={0.05}>
            <CallCard
              title="GBV Command Centre"
              tagline="Department of Social Development"
              number="0800 428 428"
              href="tel:0800428428"
              featured
              description="South Africa's national 24 hour crisis line for gender based violence. Trained counsellors speak all 11 official languages, assess your immediate danger and can send a mobile social worker, arrange shelter space or stay on the line while you contact the police."
              chips={["Toll free", "24 hours", "11 languages", "Social worker callback"]}
              icon={
                <span className="relative flex h-3 w-3">
                  <span className="absolute h-full w-full rounded-full bg-brand animate-ping-soft" />
                  <span className="relative h-3 w-3 rounded-full bg-brand" />
                </span>
              }
              iconLabel="Live line"
            />
          </Reveal>

          {/* Silent help */}
          <Reveal delay={0.12}>
            <div className="card-hover card-surface flex h-full flex-col justify-between gap-6 p-6 sm:p-7">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-extrabold tracking-tight">
                  Can&apos;t speak out loud?
                </h3>
                <span className="rounded-lg border-2 border-taupe/50 bg-ink-2 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-brand">
                  Silent
                </span>
              </div>
              <div className="flex flex-col gap-4">
                <div className="rounded-2xl border-2 border-taupe/60 bg-ink-2 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Please Call Me, free callback
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-2xl font-black tracking-tight text-brand">*120*7867#</span>
                    <CopyChip value="*120*7867#" />
                  </div>
                </div>
                <div className="rounded-2xl border-2 border-taupe/60 bg-ink-2 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    SMS the word Help to
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-2xl font-black tracking-tight text-brand">31531</span>
                    <CopyChip value="31531" />
                  </div>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
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

        <Reveal delay={0.36}>
          <p className="rounded-2xl border-2 border-taupe/60 bg-ink px-5 py-4 text-center text-sm leading-relaxed text-muted-foreground sm:px-8">
            <span className="font-semibold text-foreground">A note on safety:</span>{" "}
            calls and SMS leave a record on your phone. If that puts you at risk,
            delete the entry afterwards and browse this page in private mode. If
            you are in immediate danger, leave the screen and call 10111.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
