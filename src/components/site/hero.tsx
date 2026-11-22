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
const D = 1.5; // splash curtain starts lifting at 1.5s

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
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-taupe/60 text-muted-foreground transition-colors hover:border-brand/60 hover:text-brand active:scale-90"
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
      className="relative overflow-hidden pb-24 pt-36 sm:pt-44 lg:pb-32 lg:pt-52"
    >
      {/* Atmospheric backdrop: drifting aurora light, horizon glow, faint grid, vignette */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="aurora-a" />
        <div className="aurora-b" />
        <div className="aurora-c" />
        <div className="horizon-glow" />
        <div className="absolute inset-0 bg-grid bg-fade-y opacity-30" />
        <div className="vignette-top absolute inset-0" />
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-5 text-center sm:px-8">
        <motion.div {...anim(D + 0.05)}>
          <span className="inline-flex items-center gap-2.5 rounded-lg border-2 border-taupe/50 bg-ink-deep/70 px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-brand backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute h-full w-full rounded-full bg-brand animate-ping-soft" />
              <span className="relative h-2 w-2 rounded-full bg-brand" />
            </span>
            Free, confidential, answered 24 hours a day
          </span>
        </motion.div>

        <motion.h1
          {...anim(D + 0.18)}
          className="mt-8 max-w-5xl text-balance text-[2.9rem] font-black leading-[1.03] tracking-tighter sm:text-7xl lg:text-[5.6rem]"
        >
          When it hurts most,
          <br />
          help answers. <span className="text-gradient-brand">Fast.</span>
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
            className="group inline-flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-brand px-8 text-base font-bold tracking-tight text-ink-deep transition-all hover:scale-[1.02] hover:bg-brand-2 hover:shadow-[0_0_44px_rgba(216,211,101,0.35)] sm:w-auto"
          >
            <Phone
              className="h-5 w-5 transition-transform group-hover:rotate-12"
              aria-hidden="true"
            />
            Call 0800 428 428
          </a>
          <a
            href="#change"
            className="inline-flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl border-2 border-taupe/60 bg-ink-deep/60 px-8 text-base font-semibold text-foreground backdrop-blur-md transition-all hover:border-brand/60 hover:text-brand sm:w-auto"
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
            <div className="flex items-center justify-between border-b-2 border-taupe/50 px-6 py-4 sm:px-8">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-ink-deep">
                  <PhoneCall className="h-4 w-4" aria-hidden="true" />
                </span>
                <p className="text-sm font-bold tracking-tight">Fast Assist</p>
              </div>
              <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-brand">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute h-full w-full rounded-full bg-brand animate-ping-soft" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-brand" />
                </span>
                Counsellor available now
              </span>
            </div>

            {/* Panel body */}
            <div className="grid gap-3 px-6 py-6 sm:grid-cols-3 sm:px-8">
              <a
                href="tel:0800428428"
                className="group flex flex-col gap-2 rounded-2xl border-2 border-brand/50 bg-brand/10 p-5 transition-colors hover:bg-brand hover:text-ink-deep"
              >
                <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-brand group-hover:text-ink-deep/70">
                  <PhoneCall className="h-3.5 w-3.5" aria-hidden="true" />
                  GBV Command Centre
                </span>
                <span className="text-2xl font-black tracking-tight">0800 428 428</span>
                <span className="text-xs text-muted-foreground group-hover:text-ink-deep/70">
                  Crisis counselling, shelters, social workers
                </span>
              </a>
              <a
                href="tel:10111"
                className="group flex flex-col gap-2 rounded-2xl border-2 border-taupe/50 bg-ink-2 p-5 transition-colors hover:border-brand/50"
              >
                <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Police
                </span>
                <span className="text-2xl font-black tracking-tight">10111</span>
                <span className="text-xs text-muted-foreground">
                  Life threatening emergencies
                </span>
              </a>
              <a
                href="tel:10177"
                className="group flex flex-col gap-2 rounded-2xl border-2 border-taupe/50 bg-ink-2 p-5 transition-colors hover:border-brand/50"
              >
                <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                  Ambulance and fire
                </span>
                <span className="text-2xl font-black tracking-tight">10177</span>
                <span className="text-xs text-muted-foreground">
                  Medical emergencies and injuries
                </span>
              </a>
            </div>

            {/* Panel footer: silent help */}
            <div className="flex flex-col gap-3 border-t-2 border-taupe/50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <div className="flex items-center gap-4 rounded-2xl border-2 border-taupe/50 bg-ink-2 px-4 py-2.5">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                    Can&apos;t speak safely? Free callback
                  </p>
                  <p className="text-lg font-black tracking-tight text-brand">
                    *120*7867#
                  </p>
                </div>
                <CopyCode value="*120*7867#" />
              </div>
              <div className="flex items-center gap-4 rounded-2xl border-2 border-taupe/50 bg-ink-2 px-4 py-2.5">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                    Or SMS the word Help to
                  </p>
                  <p className="text-lg font-black tracking-tight text-brand">31531</p>
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
          className="mt-16 inline-flex flex-col items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground/60 transition-colors hover:text-brand"
        >
          In danger right now
          <ArrowDown className="h-4 w-4 animate-bounce" aria-hidden="true" />
        </motion.a>
      </div>
    </section>
  );
}
