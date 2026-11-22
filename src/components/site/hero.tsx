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
import { SPLASH_SKIPPED } from "@/lib/splash";

const EASE = [0.22, 1, 0.36, 1] as const;
// The splash curtain starts lifting at 4.0s and the hero enters underneath
// it. When the splash was already shown this session the curtain lifts
// immediately, so the entrance starts right away instead.
const D = SPLASH_SKIPPED ? 0.15 : 3.9;

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

/**
 * The animated emojis that frame the headline. Each one is a small local
 * webp (precached by the service worker), floated in the side gutters
 * where wide screens have room to spare and kept clear of the copy:
 * decoration lives in the margins, never on top of the words. Lg and up
 * only, because on narrower viewports the gutters disappear and an emoji
 * would sit on the text it is meant to celebrate.
 * Every pick is an always-visible animation (measured frame by frame in
 * scripts/fetch-emojis.py) and every pick carries the section's message:
 * a sparkling heart for love, a cherry blossom for gentleness, a clover
 * for hope and folded hands for support. The seedling and the star were
 * rejected for blinking fully transparent mid-loop; the bouquet and the
 * dizzy swoosh were rejected as too busy at 44px.
 */
const FLOATS = [
  {
    src: "/emojis/1f496-128.webp",
    pos: "left-[2%] top-[7%]",
    size: "lg:h-11 lg:w-11",
    rotate: -8,
    bob: "7s",
    bobDelay: "0s",
  },
  {
    src: "/emojis/1f338-128.webp",
    pos: "right-[2.5%] top-[7%]",
    size: "lg:h-11 lg:w-11",
    rotate: 10,
    bob: "6.4s",
    bobDelay: "0.9s",
  },
  {
    src: "/emojis/1f340-128.webp",
    pos: "left-[3.5%] top-[34%]",
    size: "lg:h-10 lg:w-10",
    rotate: -6,
    bob: "6.8s",
    bobDelay: "1.7s",
  },
  {
    src: "/emojis/1f64f-128.webp",
    pos: "right-[3.5%] top-[37%]",
    size: "lg:h-12 lg:w-12",
    rotate: 8,
    bob: "7.6s",
    bobDelay: "2.4s",
  },
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
        {/* The emoji frame: four gentle companions drifting in the gutters
            around the headline, arriving just after the words land. The
            framer span owns the entrance (scale and tilt), the img inside
            owns the endless bob, so the two transforms never fight. */}
        {FLOATS.map((f, i) => (
          <motion.span
            key={f.src}
            aria-hidden="true"
            className={`pointer-events-none absolute z-10 hidden lg:block ${f.pos}`}
            initial={
              reduce
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.4, rotate: f.rotate * 2 }
            }
            animate={
              reduce
                ? { opacity: 1 }
                : { opacity: 1, scale: 1, rotate: f.rotate }
            }
            transition={{
              delay: D + 1.05 + i * 0.12,
              duration: 0.8,
              ease: EASE,
            }}
          >
            <img
              src={f.src}
              alt=""
              width={88}
              height={88}
              draggable={false}
              className={`animate-bob drop-shadow-[0_10px_24px_rgba(0,0,0,0.35)] ${f.size}`}
              style={{
                animationDuration: f.bob,
                animationDelay: f.bobDelay,
              }}
            />
          </motion.span>
        ))}

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
          {/* The gold word and its sparkle share one no-wrap group so the
              sparkle can never wrap alone onto its own line at any width. */}
          <span className="whitespace-nowrap">
            <Word delay={D + 0.6} className="text-brand">
              fast
            </Word>
            {/* One sparkle pops in beside the gold word once it has landed:
                the site's whole promise in a single mark. */}
            <motion.span
              aria-hidden="true"
              className="ml-1 inline-block align-middle sm:ml-2.5"
              initial={
                reduce
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0, rotate: -30 }
              }
              animate={
                reduce
                  ? { opacity: 1 }
                  : { opacity: 1, scale: 1, rotate: 0 }
              }
              transition={
                reduce
                  ? { delay: D + 0.95, duration: 0.3 }
                  : {
                      delay: D + 0.95,
                      type: "spring",
                      stiffness: 300,
                      damping: 13,
                    }
              }
            >
              <img
                src="/emojis/2728-128.webp"
                alt=""
                width={88}
                height={88}
                draggable={false}
                className="animate-bob h-7 w-7 sm:h-9 sm:w-9 lg:h-12 lg:w-12"
              />
            </motion.span>
          </span>
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
