"use client";

import { RefreshCw, PhoneCall, Users, Flame, ArrowUpRight } from "lucide-react";
import { Reveal, SectionHeading } from "./reveal";
import { InfoCard, CallCard } from "./cards";

export function BentoChange() {
  return (
    <section
      id="change"
      className="relative scroll-mt-28 py-20 sm:py-28"
      aria-labelledby="change-heading"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="If you are causing the harm"
          title={
            <>
              Real strength is
              <span className="text-brand"> choosing to stop.</span>
            </>
          }
          sub="Owning it is the hardest thing you will ever do, and the bravest. Violence is learned behaviour, which means it can be unlearned. There is no judgement on this page, only accountability, support and a way out of the cycle."
        />

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {/* Accountability steps */}
          <Reveal className="md:col-span-2 lg:col-span-2" delay={0.05}>
            <InfoCard
              icon={<RefreshCw className="h-5 w-5" aria-hidden="true" />}
              title="Three honest steps out"
              className="h-full"
            >
              <p className="mb-5">
                Changing a pattern starts with naming it. Control, threats,
                intimidation and violence are choices, and new choices are
                possible. Thousands of South African men have walked this path
                before you:
              </p>
              <ol className="flex flex-col gap-3">
                {[
                  {
                    n: "01",
                    t: "Name it",
                    d: "Say it plainly: I am hurting the person I love. No excuses, no blame shifting. This is the step most people never take.",
                  },
                  {
                    n: "02",
                    t: "Ask for help",
                    d: "Call 0800 428 428 and say I need help to change. The line exists for you too. You will be listened to and referred to support near you.",
                  },
                  {
                    n: "03",
                    t: "Do the work",
                    d: "Join a behaviour change programme, attend every session and let a professional walk beside you while you rebuild trust.",
                  },
                ].map((step) => (
                  <li
                    key={step.n}
                    className="flex gap-4 rounded-2xl border-2 border-taupe/60 bg-ink-2 p-4 sm:p-5"
                  >
                    <span className="font-mono text-lg font-bold text-brand">{step.n}</span>
                    <div>
                      <p className="font-bold tracking-tight text-foreground">{step.t}</p>
                      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                        {step.d}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </InfoCard>
          </Reveal>

          {/* Why it matters */}
          <Reveal delay={0.12}>
            <div className="card-hover card-surface flex h-full flex-col justify-between gap-6 p-6 sm:p-7">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border-2 border-taupe/60 bg-ink-2 text-brand">
                <Flame className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="text-2xl font-extrabold leading-snug tracking-tight sm:text-3xl">
                &ldquo;The cycle ends{" "}
                <span className="text-gradient-brand">with you</span>, not with
                the next child who watches.&rdquo;
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Children who grow up around violence are far more likely to repeat
                it as adults. When you change, you rewrite what your family learns
                about love and respect.
              </p>
            </div>
          </Reveal>

          {/* Counselling */}
          <Reveal delay={0.18}>
            <CallCard
              title="Counselling, for you"
              number="0861 322 322"
              href="tel:0861322322"
              description="Lifeline answers around the clock for anyone, and that includes you. The Family Life Centre, FAMSA, offers professional individual and relationship counselling on 011 788 4784 during weekdays."
              chips={["24 hours", "Confidential", "Men welcome"]}
            />
          </Reveal>

          {/* Programmes */}
          <Reveal delay={0.24}>
            <InfoCard
              icon={<Users className="h-5 w-5" aria-hidden="true" />}
              title="Behaviour change programmes"
              link={
                <a
                  href="tel:0113393589"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-brand transition-all hover:gap-2.5 hover:text-brand-2"
                >
                  Sonke Gender Justice: 011 339 3589
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </a>
              }
            >
              Structured programmes help men examine the beliefs that drive
              violence and practise new responses. Sonke Gender Justice runs
              men&apos;s groups across South Africa, and the GBV Command Centre can
              refer you to one close to home.
            </InfoCard>
          </Reveal>

          {/* Family repair */}
          <Reveal delay={0.3}>
            <InfoCard
              icon={<PhoneCall className="h-5 w-5" aria-hidden="true" />}
              title="Repairing the family"
              link={
                <a
                  href="tel:0117884784"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-brand transition-all hover:gap-2.5 hover:text-brand-2"
                >
                  FAMSA: 011 788 4784
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </a>
              }
            >
              Stopping the harm is step one, healing what it damaged is step two.
              FAMSA&apos;s psychologists and social workers help families rebuild
              safety, trust and communication, including supervised reunification
              where it is safe and appropriate.
            </InfoCard>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
