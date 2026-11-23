"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Phone } from "lucide-react";
import { EASE } from "@/lib/motion";
import { CRISIS_LINE, CRISIS_TEL_HREF } from "@/lib/numbers";

/**
 * The 404 page. A wrong URL must never become a dead end on a crisis
 * platform: this page is calm, warm and short, and the one tap that
 * matters — the verified Command Centre line — sits above the fold. The
 * three companions are the same frame-verified 3D animated emoji the hero
 * uses (local webp, precached by the service worker), bobbing on the same
 * `animate-bob` loop; under prefers-reduced-motion they render still and
 * the entrance fades politely. All contact details come from the
 * directory module — nothing here is ever typed by hand.
 */

const COMPANIONS = [
  { src: "/emojis/1f31e-128.webp", label: "sun", bob: "6.4s", delay: "0.4s" },
  { src: "/emojis/1f340-128.webp", label: "clover", bob: "7.1s", delay: "1.2s" },
  { src: "/emojis/1fac2-128.webp", label: "heart hands", bob: "6.8s", delay: "2s" },
];

export function NotFound() {
  const reduce = useReducedMotion();
  const enter = (delay: number) =>
    reduce
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay, duration: 0.4 } }
      : {
          initial: { opacity: 0, y: 22, filter: "blur(8px)" },
          animate: { opacity: 1, y: 0, filter: "blur(0px)" },
          transition: { delay, duration: 0.85, ease: EASE },
        };

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-background">
      {/* Same atmospheric backdrop as the hero: one warm light, two deep
          fields, faint grid — so a wrong turn still feels like Fast. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="atmos-glow animate-drift-a" />
        <div className="atmos-field-l animate-drift-b" />
        <div className="atmos-field-r animate-drift-a" />
        <div className="absolute inset-0 bg-grid bg-fade-y opacity-40" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-5 pb-2 pt-7 sm:px-8">
        <a
          href="/"
          className="text-[1.35rem] font-black leading-none tracking-tight text-foreground transition-colors duration-300 hover:text-brand"
          aria-label="Fast, back to the homepage"
        >
          FAST
        </a>
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-dim">
          Stay close. Stay safe.
        </p>
      </div>

      <div className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-5 pb-24 text-center sm:px-8">
        {/* The three companions arrive first, gently, the way the hero's
            frame does: framer owns the entrance, the img owns the bob. */}
        <div className="flex items-center gap-7 sm:gap-9">
          {COMPANIONS.map((c, i) => (
            <motion.span
              key={c.src}
              aria-hidden="true"
              {...enter(0.1 + i * 0.14)}
              className="inline-block"
            >
              <img
                src={c.src}
                alt=""
                width={128}
                height={128}
                draggable={false}
                className={
                  reduce
                    ? "h-12 w-12 sm:h-14 sm:w-14"
                    : "animate-bob h-12 w-12 sm:h-14 sm:w-14"
                }
                style={
                  reduce
                    ? undefined
                    : { animationDuration: c.bob, animationDelay: c.delay }
                }
              />
            </motion.span>
          ))}
        </div>

        <motion.p
          {...enter(0.35)}
          className="mt-9 inline-flex items-center gap-2 rounded-lg border-2 border-brand/50 bg-brand/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-brand sm:text-xs"
        >
          404 &middot; this page isn&apos;t here
        </motion.p>

        <motion.h1
          {...enter(0.45)}
          className="mt-6 text-balance font-display text-5xl font-black leading-[1.02] tracking-tight text-foreground sm:text-7xl"
        >
          You are not
          <span className="text-brand"> lost</span>
          <span className="text-brand">.</span>
        </motion.h1>

        <motion.p
          {...enter(0.55)}
          className="mt-6 max-w-xl text-balance text-base font-medium leading-relaxed text-body sm:text-lg"
        >
          A wrong turn happens to everyone. Everything that matters on Fast
          is still exactly where it always is — one tap away, free,
          confidential and answered around the clock.
        </motion.p>

        <motion.div
          {...enter(0.65)}
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
            href="/"
            className="lift inline-flex min-h-14 w-full items-center justify-center rounded-2xl border-[3px] border-taupe bg-taupe/15 px-8 text-base font-bold tracking-tight text-foreground hover:border-brand hover:text-brand sm:w-auto"
          >
            Back to Fast
          </a>
        </motion.div>

        <motion.p
          {...enter(0.75)}
          className="mt-7 text-[11px] font-bold uppercase tracking-[0.16em] text-dim"
        >
          {CRISIS_LINE.name} &middot; {CRISIS_LINE.display} &middot; free,
          confidential, 24 hours
        </motion.p>

        <motion.blockquote
          {...enter(0.85)}
          className="mt-12 max-w-md border-t-2 border-taupe/60 pt-6 text-sm font-medium italic leading-relaxed text-body"
        >
          Asking for help is a strong and brave thing to do. Whatever brought
          you here today, that courage travels with you.
        </motion.blockquote>
      </div>
    </main>
  );
}
