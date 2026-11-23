"use client";

import { useState, useSyncExternalStore } from "react";
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
import { GREETINGS } from "@/lib/languages";
import { EASE } from "@/lib/motion";
import { CRISIS_TEL_HREF } from "@/lib/numbers";
import {
  getProfileSnapshot,
  greetingName,
  subscribeProfile,
  type FastProfile,
} from "@/lib/profile";

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
 * The animated emoji frame around the headline — nineteen companions in
 * four depth tiers, each an ally with a reason to be here:
 *
 *   balloon           lightness      rose            respect
 *   wave              calm           sparkling heart love
 *   cherry blossom    gentleness     clover          hope
 *   folded hands      support        bouquet         appreciation
 *   butterfly         change         lion            courage
 *   sun with face     warmth         purple heart    compassion
 *   confetti          joy            full moon face  company at 3am
 *   two hearts        care           gift            new beginnings
 *   dove              peace          heart decoration devotion
 *   globe (Africa held in view) — the whole country stands with you
 *
 * Layered motion, one transform per element so nothing fights:
 *   outer motion.span  — entrance (pop in, tilt to its resting angle)
 *   middle span        — a slow closed wander loop (float-a / float-b)
 *   img                — an endless life: bob, breeze sway or twinkle
 *
 * Tiers deepen with the viewport, so wide screens gain companions while
 * narrow ones stay uncluttered: two tiny corner companions from the
 * smallest phone (tucked between navbar and badge), the wave from sm, the
 * main frame from lg, the change ring from lg, a mid ring from xl and the
 * innermost pair from 2xl. Every position sits in the gutters above, beside or
 * below the copy — never on the words. Every pick is an always-visible
 * animation (measured frame by frame in scripts/fetch-emojis.py); the
 * seedling, the star, the rainbow and the raised hands all blink fully
 * transparent mid-loop and were rejected. None of these nineteen repeats
 * the encouragement strip's set, so no animation ever feels copy-pasted.
 */
type Float = {
  src: string;
  pos: string;
  size: string;
  show: string;
  rotate: number;
  drift: "a" | "b";
  life: "bob" | "sway" | "twinkle";
  lifeDur?: string;
  lifeDelay?: string;
  /** extra seconds on top of the shared entrance beat */
  stagger: number;
};

const FLOATS: Float[] = [
  // —— smallest tier: three quiet companions, visible from the smallest
  // phone up. On phones they tuck into the band between the fixed navbar
  // and the badge (negative offsets: this frame is positioned relative to
  // the copy block, which starts one section-padding below the page top);
  // from sm they climb into the corners.
  {
    src: "/emojis/1f388-128.webp",
    pos: "left-[4.5%] top-[-52px] sm:left-[6%] sm:top-[4%]",
    size: "h-5 w-5 sm:h-7 sm:w-7",
    show: "block",
    rotate: -10,
    drift: "a",
    life: "bob",
    lifeDur: "6.1s",
    lifeDelay: "0.2s",
    stagger: 0.55,
  },
  {
    src: "/emojis/1f339-128.webp",
    pos: "right-[4.5%] top-[-44px] sm:right-[6%] sm:top-[5%]",
    size: "h-5 w-5 sm:h-7 sm:w-7",
    show: "block",
    rotate: 12,
    drift: "b",
    life: "sway",
    lifeDur: "7.4s",
    lifeDelay: "0.6s",
    stagger: 0.9,
  },
  {
    src: "/emojis/1f30a-128.webp",
    pos: "right-[7%] top-[85%]",
    size: "sm:h-7 sm:w-7",
    show: "hidden sm:block",
    rotate: -8,
    drift: "a",
    life: "bob",
    lifeDur: "6.9s",
    lifeDelay: "1.4s",
    stagger: 1.1,
  },
  // —— main frame from lg: the four original companions
  {
    src: "/emojis/1f496-128.webp",
    pos: "left-[2%] top-[7%]",
    size: "lg:h-12 lg:w-12",
    show: "hidden lg:block",
    rotate: -8,
    drift: "a",
    life: "bob",
    lifeDur: "7s",
    lifeDelay: "0s",
    stagger: 0,
  },
  {
    src: "/emojis/1f338-128.webp",
    pos: "right-[2.5%] top-[7%]",
    size: "lg:h-12 lg:w-12",
    show: "hidden lg:block",
    rotate: 10,
    drift: "b",
    life: "sway",
    lifeDur: "6.4s",
    lifeDelay: "0.9s",
    stagger: 0.12,
  },
  {
    src: "/emojis/1f340-128.webp",
    pos: "left-[3.5%] top-[34%]",
    size: "lg:h-10 lg:w-10",
    show: "hidden lg:block",
    rotate: -6,
    drift: "b",
    life: "bob",
    lifeDur: "6.8s",
    lifeDelay: "1.7s",
    stagger: 0.24,
  },
  {
    src: "/emojis/1f64f-128.webp",
    pos: "right-[3.5%] top-[37%]",
    size: "lg:h-12 lg:w-12",
    show: "hidden lg:block",
    rotate: 8,
    drift: "a",
    life: "bob",
    lifeDur: "7.6s",
    lifeDelay: "2.4s",
    stagger: 0.36,
  },
  // —— lg gains the change ring near the actions: appreciation, change, courage
  {
    src: "/emojis/1f490-128.webp",
    pos: "left-[4%] top-[63%]",
    size: "lg:h-10 lg:w-10",
    show: "hidden lg:block",
    rotate: -9,
    drift: "a",
    life: "sway",
    lifeDur: "7.8s",
    lifeDelay: "1.1s",
    stagger: 0.48,
  },
  {
    src: "/emojis/1f98b-128.webp",
    pos: "right-[4%] top-[66%]",
    size: "lg:h-10 lg:w-10",
    show: "hidden lg:block",
    rotate: 14,
    drift: "b",
    life: "bob",
    lifeDur: "6.5s",
    lifeDelay: "0.5s",
    stagger: 0.62,
  },
  {
    src: "/emojis/1f981-128.webp",
    pos: "left-[5%] top-[85%]",
    size: "lg:h-10 lg:w-10",
    show: "hidden lg:block",
    rotate: 10,
    drift: "b",
    life: "bob",
    lifeDur: "7.2s",
    lifeDelay: "0.9s",
    stagger: 0.76,
  },
  // —— mid ring from xl
  {
    src: "/emojis/1f31e-128.webp",
    pos: "left-[6.5%] top-[16%]",
    size: "xl:h-9 xl:w-9",
    show: "hidden xl:block",
    rotate: -14,
    drift: "a",
    life: "bob",
    lifeDur: "6.2s",
    lifeDelay: "0.5s",
    stagger: 0.18,
  },
  {
    src: "/emojis/1f49c-128.webp",
    pos: "right-[6%] top-[19%]",
    size: "xl:h-8 xl:w-8",
    show: "hidden xl:block",
    rotate: 12,
    drift: "b",
    life: "bob",
    lifeDur: "7.1s",
    lifeDelay: "1.3s",
    stagger: 0.3,
  },
  {
    src: "/emojis/1f38a-128.webp",
    pos: "right-[5.5%] top-[40%]",
    size: "xl:h-8 xl:w-8",
    show: "hidden xl:block",
    rotate: 15,
    drift: "a",
    life: "twinkle",
    lifeDur: "4.4s",
    lifeDelay: "1.1s",
    stagger: 0.38,
  },
  {
    src: "/emojis/1f31d-128.webp",
    pos: "left-[5.5%] top-[52%]",
    size: "xl:h-9 xl:w-9",
    show: "hidden xl:block",
    rotate: -10,
    drift: "a",
    life: "bob",
    lifeDur: "7.4s",
    lifeDelay: "2.1s",
    stagger: 0.42,
  },
  {
    src: "/emojis/1f495-128.webp",
    pos: "right-[4.5%] top-[55%]",
    size: "xl:h-8 xl:w-8",
    show: "hidden xl:block",
    rotate: 14,
    drift: "b",
    life: "bob",
    lifeDur: "6.6s",
    lifeDelay: "2.9s",
    stagger: 0.54,
  },
  {
    src: "/emojis/1f381-128.webp",
    pos: "left-[8%] top-[70%]",
    size: "xl:h-8 xl:w-8",
    show: "hidden xl:block",
    rotate: -12,
    drift: "b",
    life: "bob",
    lifeDur: "7.3s",
    lifeDelay: "0.8s",
    stagger: 0.7,
  },
  {
    src: "/emojis/1f54a-128.webp",
    pos: "right-[8%] top-[72%]",
    size: "xl:h-9 xl:w-9",
    show: "hidden xl:block",
    rotate: 10,
    drift: "a",
    life: "bob",
    lifeDur: "6.7s",
    lifeDelay: "1.9s",
    stagger: 0.84,
  },
  // —— innermost pair from 2xl, nearest the copy but still clear of it
  {
    src: "/emojis/1f49f-128.webp",
    pos: "left-[10.5%] top-[27%]",
    size: "2xl:h-7 2xl:w-7",
    show: "hidden 2xl:block",
    rotate: -8,
    drift: "a",
    life: "twinkle",
    lifeDur: "3.9s",
    lifeDelay: "0.4s",
    stagger: 0.26,
  },
  {
    src: "/emojis/1f30d-128.webp",
    pos: "right-[10.5%] top-[29%]",
    size: "2xl:h-8 2xl:w-8",
    show: "hidden 2xl:block",
    rotate: 8,
    drift: "b",
    life: "bob",
    lifeDur: "7.9s",
    lifeDelay: "2.6s",
    stagger: 0.4,
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

  // The on-device profile drives the greeting eyebrow. It is an external
  // store read through useSyncExternalStore: null on the server and during
  // hydration (so the markup stays hydration-safe), the real profile after
  // that. A profile saved while the page is open (the welcome flow just
  // finished) is "late" and reveals immediately; one that existed before
  // this page loaded lands with the rest of the choreography at D.
  const [mountedAt] = useState(() => Date.now());
  const profile = useSyncExternalStore(
    subscribeProfile,
    getProfileSnapshot,
    () => null,
  );
  const late =
    !!profile && new Date(profile.completedAt).getTime() > mountedAt;

  const greetingEl = profile ? (
    <motion.p
      {...(late
        ? {
            initial: { opacity: 0, y: 12 },
            animate: { opacity: 1, y: 0 },
            transition: { delay: 0.3, duration: 0.6, ease: EASE },
          }
        : anim(D + 0.0))}
      className="relative z-10 inline-flex items-center gap-2 rounded-lg border-2 border-brand/50 bg-brand/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-brand sm:text-[13px]"
    >
      {GREETINGS[profile.lang] ?? "Welcome"}, {greetingName(profile)}
      <img
        src="/emojis/1f338-128.webp"
        alt=""
        width={88}
        height={88}
        draggable={false}
        className="animate-sway h-4 w-4"
        style={{ animationDuration: "5.6s" }}
      />
    </motion.p>
  ) : null;

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
        {/* The emoji frame: sixteen companions drifting in the gutters
            around the headline, arriving just after the words land. Each
            one is three nested layers — framer owns the entrance, a slow
            CSS wander moves the middle span around a closed loop, and the
            img carries its endless life (bob, sway or twinkle) — so the
            transforms never fight. */}
        {FLOATS.map((f, i) => (
          <motion.span
            key={f.src}
            aria-hidden="true"
            className={`pointer-events-none absolute z-10 ${f.show} ${f.pos}`}
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
              delay: D + 1.05 + f.stagger,
              duration: 0.8,
              ease: EASE,
            }}
          >
            <span
              className={`block ${
                f.drift === "a" ? "animate-float-a" : "animate-float-b"
              }`}
            >
              <img
                src={f.src}
                alt=""
                width={88}
                height={88}
                draggable={false}
                className={`drop-shadow-[0_10px_24px_rgba(0,0,0,0.35)] ${f.size} ${
                  f.life === "bob"
                    ? "animate-bob"
                    : f.life === "sway"
                      ? "animate-sway"
                      : "animate-twinkle"
                }`}
                style={{
                  animationDuration: f.lifeDur,
                  animationDelay: f.lifeDelay,
                }}
              />
            </span>
          </motion.span>
        ))}

        {/* Personal greeting, when the visitor set one up in the welcome
            flow. Above the badge, because it is a hello, not a claim. */}
        {greetingEl}

        <motion.div {...anim(D + 0.05)} className={profile ? "mt-6" : undefined}>
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
          {/* The gold word and its sparkle cluster share one no-wrap group
              so nothing can wrap alone onto its own line at any width. */}
          <span className="whitespace-nowrap">
            <Word delay={D + 0.6} className="text-shimmer">
              fast
            </Word>
            {/* A cluster of three sparkles pops in beside the gold word
                once it has landed: the big one bobs, two minis twinkle on
                offset rhythms — the site's whole promise in one mark. */}
            <motion.span
              aria-hidden="true"
              className="relative ml-1 inline-block align-middle sm:ml-2.5"
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
              <motion.span
                className="absolute -right-1.5 -top-2 block sm:-right-2.5 sm:-top-3.5"
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0 }}
                animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                transition={
                  reduce
                    ? { delay: D + 1.2, duration: 0.3 }
                    : {
                        delay: D + 1.2,
                        type: "spring",
                        stiffness: 320,
                        damping: 12,
                      }
                }
              >
                <img
                  src="/emojis/2728-128.webp"
                  alt=""
                  width={88}
                  height={88}
                  draggable={false}
                  className="animate-twinkle h-3.5 w-3.5 sm:h-5 sm:w-5"
                  style={{ animationDuration: "3.2s" }}
                />
              </motion.span>
              <motion.span
                className="absolute -bottom-1.5 -left-3 block sm:-bottom-2.5 sm:-left-4.5"
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0 }}
                animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                transition={
                  reduce
                    ? { delay: D + 1.35, duration: 0.3 }
                    : {
                        delay: D + 1.35,
                        type: "spring",
                        stiffness: 320,
                        damping: 12,
                      }
                }
              >
                <img
                  src="/emojis/2728-128.webp"
                  alt=""
                  width={88}
                  height={88}
                  draggable={false}
                  className="animate-twinkle h-3 w-3 sm:h-4 sm:w-4"
                  style={{ animationDuration: "4.1s", animationDelay: "0.7s" }}
                />
              </motion.span>
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
            href={CRISIS_TEL_HREF}
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
          // The accessible name must contain the visible text (axe:
          // label-content-name-mismatch), so the eyebrow words come first.
          aria-label="In danger right now — scroll to the emergency numbers"
          className="group mt-20 inline-flex flex-col items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em] text-dim transition-colors hover:text-brand"
        >
          In danger right now
          {/* The wrapper owns the endless bob so the arrow's own hover
              transform keeps working underneath it. */}
          <span className="inline-block animate-bob" style={{ animationDuration: "4.6s" }}>
            <ArrowDown
              className="h-4 w-4 transition-transform group-hover:translate-y-1"
              aria-hidden="true"
            />
          </span>
        </motion.a>
      </div>
    </section>
  );
}
