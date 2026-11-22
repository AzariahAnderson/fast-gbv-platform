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
      className="lift inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-taupe text-muted-foreground hover:border-brand hover:text-brand"
    >
      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      <span aria-hidden="true" className={copied ? "sr-only" : "hidden"}>
        Copied
      </span>
    </button>
  );
}

/** One word of the headline rising out of its own clip mask */
function Word({
  children,
  delay,
  className,
}: {
  children: React.ReactNode;
  delay: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <span className={className}>{children}</span>;
  }
  return (
    <span className="inline-block overflow-hidden pb-[0.08em] align-bottom">
      <motion.span
        className={`inline-block ${className ?? ""}`}
        initial={{ y: "112%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay, duration: 0.9, ease: EASE }}
      >
        {children}
      </motion.span>
    </span>
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
          initial: { opacity: 0, y: 26, filter: "blur(8px)" },
          animate: { opacity: 1, y: 0, filter: "blur(0px)" },
          transition: { delay, duration: 0.85, ease: EASE },
        };

  return (
    <section
      id="top"
      className="relative overflow-hidden pb-24 pt-32 sm:pt-40 lg:pb-32 lg:pt-48"
    >
      {/* Atmospheric backdrop: one warm light, two deep fields, faint grid */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="atmos-glow animate-drift-a" />
        <div className="atmos-field-l animate-drift-b" />
        <div className="atmos-field-r animate-drift-a" />
        <div className="horizon-glow" />
        <div className="absolute inset-0 bg-grid bg-fade-y opacity-40" />
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-5 text-center sm:px-8">
        <motion.div {...anim(D + 0.05)}>
          <span className="inline-flex items-center gap-2.5 rounded-lg border-2 border-taupe bg-taupe/15 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-dim">
            <span className="h-px w-3.5 bg-brand" aria-hidden="true" />
            Free, confidential, answered 24 hours a day
          </span>
        </motion.div>

        <motion.h1
          {...anim(D + 0.14)}
          className="mt-8 max-w-5xl text-balance font-display text-[2.7rem] font-black leading-[1.02] tracking-tight text-foreground sm:text-6xl lg:text-[4.9rem]"
        >
          <Word delay={D + 0.2}>When</Word>{" "}
          <Word delay={D + 0.26}>it</Word>{" "}
          <Word delay={D + 0.32}>hurts</Word>{" "}
          <Word delay={D + 0.38}>most,</Word>
          <br />
          <Word delay={D + 0.46}>help</Word>{" "}
          <Word delay={D + 0.52}>answers</Word>{" "}
          <Word delay={D + 0.6} className="text-brand">
            fast
          </Word>
        </motion.h1>

        <motion.p
          {...anim(D + 0.68)}
          className="mt-7 max-w-2xl text-balance text-base font-medium leading-relaxed text-body sm:text-lg lg:text-xl"
        >
          Fast connects South Africans to the country&apos;s free gender based
          violence services in seconds.{" "}
          <span className="font-semibold text-foreground">
            Counselling, shelters, police response, medical care and legal
            protection
          </span>{" "}
          for survivors. Guidance and behaviour change programmes for those
          ready to stop causing harm.
        </motion.p>

        <motion.div
          {...anim(D + 0.78)}
          className="mt-10 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row"
        >
          <a
            href="tel:0800428428"
            className="lift group inline-flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-brand px-8 text-base font-bold tracking-tight text-ink shadow-[0_16px_36px_-16px_rgba(216,211,101,0.45)] hover:bg-brand-2 sm:w-auto"
          >
            <Phone
              className="h-5 w-5 transition-transform duration-300 group-hover:rotate-12"
              aria-hidden="true"
            />
            Call 0800 428 428
          </a>
          <a
            href="#change"
            className="lift inline-flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl border-[3px] border-taupe bg-taupe/15 px-8 text-base font-bold tracking-tight text-foreground hover:border-brand hover:text-brand sm:w-auto"
          >
            I want to change
          </a>
        </motion.div>

        {/* Trust strip */}
        <motion.ul
          {...anim(D + 0.86)}
          aria-label="Why you can trust these services"
          className="mt-9 flex flex-wrap items-center justify-center gap-x-7 gap-y-2.5"
        >
          {TRUST.map((item) => (
            <li
              key={item.label}
              className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-dim"
            >
              <item.icon className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
              {item.label}
            </li>
          ))}
        </motion.ul>

        {/* App-style preview panel */}
        <motion.div
          {...anim(D + 0.94)}
          className="mt-16 w-full max-w-4xl sm:mt-20"
        >
          <div className="card-surface overflow-hidden text-left">
            {/* Panel header */}
            <div className="flex items-center justify-between border-b-[3px] border-taupe px-6 py-4 sm:px-8">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-ink">
                  <PhoneCall className="h-4 w-4" aria-hidden="true" />
                </span>
                <p className="text-sm font-bold tracking-tight text-foreground">Fast Assist</p>
              </div>
              <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-dim">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
                Counsellor available now
              </span>
            </div>

            {/* Panel body */}
            <div className="grid gap-3 px-6 py-6 sm:grid-cols-3 sm:px-8">
              <a
                href="tel:0800428428"
                className="lift group flex flex-col gap-2 rounded-2xl border-[3px] border-brand bg-brand p-5 text-ink hover:bg-brand-2"
              >
                <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-ink/70">
                  <PhoneCall className="h-3.5 w-3.5" aria-hidden="true" />
                  GBV Command Centre
                </span>
                <span className="text-2xl font-black tracking-tight">0800 428 428</span>
                <span className="text-xs font-medium text-ink/70">
                  Crisis counselling, shelters, social workers
                </span>
              </a>
              <a
                href="tel:10111"
                className="lift group flex flex-col gap-2 rounded-2xl border-[3px] border-taupe bg-taupe/20 p-5 hover:border-brand"
              >
                <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-dim">
                  <ShieldCheck className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                  Police
                </span>
                <span className="text-2xl font-black tracking-tight text-foreground">10111</span>
                <span className="text-xs font-medium text-body">
                  Life threatening emergencies
                </span>
              </a>
              <a
                href="tel:10177"
                className="lift group flex flex-col gap-2 rounded-2xl border-[3px] border-taupe bg-taupe/20 p-5 hover:border-brand"
              >
                <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-dim">
                  <Flame className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                  Ambulance and fire
                </span>
                <span className="text-2xl font-black tracking-tight text-foreground">10177</span>
                <span className="text-xs font-medium text-body">
                  Medical emergencies and injuries
                </span>
              </a>
            </div>

            {/* Panel footer: silent help */}
            <div className="flex flex-col gap-3 border-t-[3px] border-taupe px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <div className="flex items-center gap-4 rounded-2xl border-2 border-taupe bg-taupe/20 px-4 py-2.5">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-dim">
                    Can&apos;t speak safely? Free callback
                  </p>
                  <p className="text-lg font-black tracking-tight text-brand">
                    *120*7867#
                  </p>
                </div>
                <CopyCode value="*120*7867#" />
              </div>
              <div className="flex items-center gap-4 rounded-2xl border-2 border-taupe bg-taupe/20 px-4 py-2.5">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-dim">
                    Or SMS the word Help to
                  </p>
                  <p className="text-lg font-black tracking-tight text-brand">31531</p>
                </div>
                <CopyCode value="31531" />
              </div>
              <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-dim">
                <MessageSquareText className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                Works on every network
              </p>
            </div>
          </div>
        </motion.div>

        <motion.a
          {...anim(D + 1.04)}
          href="#emergency"
          aria-label="Scroll to emergency numbers"
          className="group mt-16 inline-flex flex-col items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em] text-dim transition-colors hover:text-brand"
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
