"use client";

import { PhoneCall, Home, Scale, HeartPulse, ListChecks, Baby, Smartphone, ArrowUpRight } from "lucide-react";
import { Reveal, SectionHeading } from "./reveal";
import { InfoCard } from "./cards";

function CardLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1.5 text-sm font-bold text-brand transition-all hover:gap-2.5"
    >
      {children}
      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
    </a>
  );
}

export function BentoSurvivors() {
  return (
    <section
      id="survivors"
      className="relative scroll-mt-28 py-20 sm:py-28"
      aria-labelledby="survivors-heading"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="If you are being abused"
          title={
            <>
              You are not alone,
              <br />
              and you are <span className="text-brand">not to blame</span>
            </>
          }
          sub="Abuse grows in silence and isolation. Reaching out is not weakness, it is the moment the pattern starts to break. This is what exists for you, free of charge."
        />

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-6">
          <Reveal className="md:col-span-2 lg:col-span-4" delay={0.05}>
            <InfoCard
              icon={<PhoneCall className="h-5 w-5" aria-hidden="true" />}
              title="Counselling at any hour, in your language"
              link={<CardLink href="tel:0800428428">Call 0800 428 428</CardLink>}
            >
              Counsellors at the GBV Command Centre answer day and night in all 11
              official languages. They listen without judgement, help you judge how
              much danger you are in and stay on the line while you decide your
              next step. Lifeline&apos;s national line, 0861 322 322, offers
              round the clock emotional support to anyone who needs a voice to
              listen.
            </InfoCard>
          </Reveal>

          <Reveal className="lg:col-span-2" delay={0.1}>
            <InfoCard
              icon={<Home className="h-5 w-5" aria-hidden="true" />}
              title="Safe places to stay"
              link={<CardLink href="tel:0116424345">POWA: 011 642 4345</CardLink>}
            >
              Shelters and safe houses in all nine provinces can take you and your
              children in, often the same day. The Command Centre and POWA locate
              the nearest open bed and arrange safe transport to get you there.
            </InfoCard>
          </Reveal>

          <Reveal className="lg:col-span-2" delay={0.15}>
            <InfoCard
              icon={<Scale className="h-5 w-5" aria-hidden="true" />}
              title="Legal protection, free of charge"
            >
              Under the Domestic Violence Act 116 of 1998 you can ask the clerk of
              any magistrates court for an interim protection order. No lawyer, no
              fee. SAPS must help you apply, must give you a case number and must
              arrest the abuser if the order is breached.
            </InfoCard>
          </Reveal>

          <Reveal className="lg:col-span-2" delay={0.2}>
            <InfoCard
              icon={<HeartPulse className="h-5 w-5" aria-hidden="true" />}
              title="Medical care and evidence"
              link={<CardLink href="tel:10177">Emergency: 10177</CardLink>}
            >
              Thuthuzela Care Centres at major hospitals are one stop facilities
              where you can be treated, counselled and, if you choose, report to
              police under one roof. Injuries and evidence are documented on the
              J88 form, which stands ready if you ever decide to open a case.
            </InfoCard>
          </Reveal>

          <Reveal className="lg:col-span-2" delay={0.25}>
            <InfoCard
              icon={<Smartphone className="h-5 w-5" aria-hidden="true" />}
              title="Help without a voice call"
              link={<CardLink href="tel:*134*7355%23">Dial *134*7355# free</CardLink>}
            >
              When a call is not safe, the TEARS Foundation answers *134*7355#
              with a free callback, and the Command Centre reads SMS sent to
              31531. Both cost nothing and can be sent from any phone, including
              a borrowed one.
            </InfoCard>
          </Reveal>

          <Reveal className="md:col-span-2 lg:col-span-4" delay={0.3}>
            <InfoCard
              icon={<ListChecks className="h-5 w-5" aria-hidden="true" />}
              title="Build your safety plan"
            >
              <p className="mb-4">
                A safety plan is a private plan for the moment things get worse. A
                counsellor will help you put one together in a single call:
              </p>
              <ul className="grid gap-3 sm:grid-cols-2">
                {[
                  "A code word shared with someone you trust",
                  "Documents and some cash in one grab bag",
                  "The nearest police station saved in your phone",
                  "Where you will go, and who knows about it",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 rounded-xl border-2 border-taupe bg-taupe/20 px-3.5 py-2.5 text-[13px] font-semibold text-foreground/90"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </InfoCard>
          </Reveal>

          <Reveal className="md:col-span-2 lg:col-span-2" delay={0.35}>
            <InfoCard
              icon={<Baby className="h-5 w-5" aria-hidden="true" />}
              title="Help for children"
              link={<CardLink href="tel:116">Childline: 116, free</CardLink>}
            >
              Children who witness or suffer abuse need their own support. Childline
              answers around the clock for children and teenagers, and helps adults
              report concerns about a child&apos;s safety to the proper authorities.
            </InfoCard>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
