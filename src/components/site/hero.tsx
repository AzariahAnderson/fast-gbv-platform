"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Phone,
  ArrowDown,
  ShieldCheck,
  Languages,
  Clock,
  PhoneCall,
  Flame,
  Copy,
  MessageSquareText,
} from "lucide-react";
import { useState } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;
// The splash curtain starts lifting at 4.0s, the hero enters underneath it
const D = 3.9;

function CopyCode({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      /* clipboard unavailable */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <button
      onClick={copy}
      aria-label={`Copy ${value}`}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-taupe text-muted-foreground transition-colors hover:border-brand hover:text-brand active:scale-90"
    >
      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      <span aria-hidden="true" className={copied ? "sr-only" : "hidden"}>
        Copied
      </span>
    </button>
  );
}

const TRUST = [
  { icon: ShieldCheck, label: "Free and confidential" },
  { icon: Clock, label: "Answered 24 hours" },
  { icon: Languages, label: "All 11 official languages" },
  { icon: PhoneCall, label: "Nothing on your bill" },
];

export function Hero() {
  const reduce = useReducedMotion();
  const anim = (delay: number) =>
    reduce
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay, duration: 0.4 } }
      : {
          initial: { opacity: 0, y: 30, filter: "blur(10px)" },
          animate: { opacity: 1, y: 0, filter: "blur(0px)" },
          transition: { delay, duration: 0.95, ease: EASE },
        };

  return (
    <section
      id="top"
      className="relative overflow-hidden pb-24 pt-32 sm:pt-40 lg:pb-32 lg:pt-48"
    >
      {/* Atmospheric backdrop: one warm light, two deep fields, faint grid */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="atmos-glow" />
        <div className="atmos-field-l" />
        <div className="atmos-field-r" />
        <div className="horizon-glow" />
        <div className="absolute inset-0 bg-grid bg-fade-y opacity-40" />
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-5 text-center sm:px-8">
        <motion.div {...anim(D + 0.05)}>
          <span className="inline-flex items-center gap-2.5 rounded-lg border-2 border-taupe bg-taupe/15 px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-brand">
            <span className="h-1.5 w-1.5 rotate-45 bg-brand" aria-hidden="true" />
            Free, confidential, answered 24 hours a day
          </span>
        </motion.div>

        <motion.h1
          {...anim(D + 0.18)}
          className="mt-8 max-w-5xl text-balance font-display text-[2.4rem] uppercase leading-[0.98] tracking-tight text-foreground sm:text-6xl sm:leading-[0.96] lg:text-[4.7rem]"
        >
          When it hurts most,
          <br />
          help answers. <span className="text-brand">Fast.</span>
        </motion.h1>

        <motion.p
          {...anim(D + 0.3)}
          className="mt-7 max-w-2xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg lg:text-xl"
        >
          Fast connects South Africans to the country&apos;s free gender based
          violence services in seconds. Counselling, shelters, police response,
          medical care and legal protection for survivors. Guidance and behaviour
          change programmes for those ready to stop causing harm.
        </motion.p>

        <motion.div
          {...anim(D + 0.42)}
          className="mt-10 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row"
        >
          <a
            href="tel:0800428428"
            className="group inline-flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-brand px-8 font-head text-base font-semibold tracking-tight text-ink transition-colors hover:bg-brand-2 sm:w-auto"
          >
            <Phone
              className="h-5 w-5 transition-transform group-hover:rotate-12"
              aria-hidden="true"
            />
            Call 0800 428 428
          </a>
          <a
            href="#change"
            className="inline-flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl border-[3px] border-taupe bg-taupe/15 px-8 font-head text-base font-medium text-foreground transition-colors hover:border-brand hover:text-brand sm:w-auto"
          >
            I want to change
          </a>
        </motion.div>

        {/* Trust strip */}
        <motion.ul
          {...anim(D + 0.52)}
          aria-label="Why you can trust these services"
          className="mt-9 flex flex-wrap items-center justify-center gap-x-7 gap-y-2.5"
        >
          {TRUST.map((item) => (
            <li
              key={item.label}
              className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
            >
              <item.icon className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
              {item.label}
            </li>
          ))}
        </motion.ul>

        {/* App-style preview panel */}
        <motion.div
          {...anim(D + 0.64)}
          className="mt-16 w-full max-w-4xl sm:mt-20"
        >
          <div className="card-surface overflow-hidden text-left">
            {/* Panel header */}
            <div className="flex items-center justify-between border-b-[3px] border-taupe px-6 py-4 sm:px-8">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-ink">
                  <PhoneCall className="h-4 w-4" aria-hidden="true" />
                </span>
                <p className="font-head text-sm font-semibold tracking-tight">Fast Assist</p>
              </div>
              <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-brand">
                <span className="h-1.5 w-1.5 rotate-45 bg-brand" aria-hidden="true" />
                Counsellor available now
              </span>
            </div>

            {/* Panel body */}
            <div className="grid gap-3 px-6 py-6 sm:grid-cols-3 sm:px-8">
              <a
                href="tel:0800428428"
                className="group flex flex-col gap-2 rounded-2xl border-[3px] border-brand bg-brand/10 p-5 transition-colors hover:bg-brand hover:text-ink"
              >
                <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-brand group-hover:text-ink/70">
                  <PhoneCall className="h-3.5 w-3.5" aria-hidden="true" />
                  GBV Command Centre
                </span>
                <span className="font-display text-2xl tracking-tight">0800 428 428</span>
                <span className="text-xs text-muted-foreground group-hover:text-ink/70">
                  Crisis counselling, shelters, social workers
                </span>
              </a>
              <a
                href="tel:10111"
                className="group flex flex-col gap-2 rounded-2xl border-[3px] border-taupe bg-taupe/20 p-5 transition-colors hover:border-brand"
              >
                <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Police
                </span>
                <span className="font-display text-2xl tracking-tight text-foreground">10111</span>
                <span className="text-xs text-muted-foreground">
                  Life threatening emergencies
                </span>
              </a>
              <a
                href="tel:10177"
                className="group flex flex-col gap-2 rounded-2xl border-[3px] border-taupe bg-taupe/20 p-5 transition-colors hover:border-brand"
              >
                <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                  Ambulance and fire
                </span>
                <span className="font-display text-2xl tracking-tight text-foreground">10177</span>
                <span className="text-xs text-muted-foreground">
                  Medical emergencies and injuries
                </span>
              </a>
            </div>

            {/* Panel footer: silent help */}
            <div className="flex flex-col gap-3 border-t-[3px] border-taupe px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <div className="flex items-center gap-4 rounded-2xl border-2 border-taupe bg-taupe/20 px-4 py-2.5">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                    Can&apos;t speak safely? Free callback
                  </p>
                  <p className="font-display text-lg tracking-tight text-brand">
                    *120*7867#
                  </p>
                </div>
                <CopyCode value="*120*7867#" />
              </div>
              <div className="flex items-center gap-4 rounded-2xl border-2 border-taupe bg-taupe/20 px-4 py-2.5">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                    Or SMS the word Help to
                  </p>
                  <p className="font-display text-lg tracking-tight text-brand">31531</p>
                </div>
                <CopyCode value="31531" />
              </div>
              <p className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <MessageSquareText className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                Works on every network
              </p>
            </div>
          </div>
        </motion.div>

        <motion.a
          {...anim(D + 0.78)}
          href="#emergency"
          aria-label="Scroll to emergency numbers"
          className="group mt-16 inline-flex flex-col items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground transition-colors hover:text-brand"
        >
          In danger right now
          <ArrowDown
            className="h-4 w-4 transition-transform group-hover:translate-y-1"
            aria-hidden="true"
          />
        </motion.a>
      </div>
    </section>
  );
}
