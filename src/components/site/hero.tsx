"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Phone,
  ArrowDown,
  ShieldCheck,
  Languages,
  Clock,
  PhoneCall,
} from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;
// The splash curtain starts lifting at 4.0s, the hero enters underneath it
const D = 3.9;

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
            Get help now
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

        <motion.a
          {...anim(D + 1.04)}
          href="#emergency"
          aria-label="Scroll to emergency numbers"
          className="group mt-20 inline-flex flex-col items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em] text-dim transition-colors hover:text-brand"
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
