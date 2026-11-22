"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { markSplashShown, splashShownThisSession } from "@/lib/splash";

/**
 * Splash screen. The white wordmark rises in Inter black over the same ink
 * the page itself sits on, one gold rule draws beneath it, the four values
 * arrive as a single quiet line and the curtain lifts into the hero. Four
 * seconds on the first visit of a browser session, skipped via
 * sessionStorage for repeat visits. Composition follows the professional
 * rules for launch screens: one centred idea, generous breathing space,
 * motion that supports rather than decorates, and a look that matches the
 * first screen so the lift feels continuous rather than like a page change.
 */
const VALUES = ["Free", "Anonymous", "Safe", "Trusted"];
const EASE = [0.22, 1, 0.36, 1] as const;

export function Preloader() {
  const [done, setDone] = useState(false);
  const [skip, setSkip] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    // Repeat visit inside the same browser session: lift the curtain right
    // away instead of holding it for the full four seconds. The unmount is
    // queued on the next frame so the first paint stays consistent and the
    // skip decision, which reads sessionStorage (an external store), does
    // not fire a synchronous cascading render.
    if (splashShownThisSession()) {
      const r = requestAnimationFrame(() => {
        setSkip(true);
        setDone(true);
      });
      return () => cancelAnimationFrame(r);
    }
    markSplashShown();
    const t = setTimeout(() => setDone(true), 4000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = done ? "" : "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [done]);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          id="splash"
          className="fast-preloader fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden bg-ink"
          exit={
            skip
              ? { opacity: 0, transition: { duration: 0.3, ease: "linear" } }
              : { y: "-100%", transition: { duration: 0.75, ease: [0.76, 0, 0.24, 1] } }
          }
          aria-hidden="true"
        >
          {/* Site texture, fading towards the edges, and one warm light
              source behind the wordmark, both completely still */}
          <div className="bg-fade-y pointer-events-none absolute inset-0 bg-grid opacity-30" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[30rem] w-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/[0.09] blur-[130px]" />

          {/* Everything inside drifts up and fades while the curtain lifts */}
          <motion.div
            className="relative flex flex-col items-center"
            exit={{ y: -40, opacity: 0, transition: { duration: 0.4, ease: EASE } }}
          >
            {/* One local 3D emoji introduces the warmth the strip below
                will carry on with */}
            <motion.img
              src="/emojis/2728-128.webp"
              alt=""
              width={88}
              height={88}
              draggable={false}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 26, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.9, ease: EASE }}
              className="h-14 w-14 sm:h-16 sm:w-16"
            />

            <div className="relative mt-6 flex items-baseline overflow-hidden pb-1 font-display">
              {["F", "A", "S", "T"].map((letter, i) => (
                <motion.span
                  key={letter}
                  initial={reduce ? { opacity: 0 } : { y: "115%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{
                    delay: 0.3 + i * 0.16,
                    duration: 0.85,
                    ease: EASE,
                  }}
                  className="text-7xl font-black tracking-tight text-foreground sm:text-8xl"
                >
                  {letter}
                </motion.span>
              ))}
            </div>

            {/* A gold sweep draws itself over a quiet taupe base line */}
            <span className="mt-8 h-px w-44 bg-taupe sm:w-52" />
            <motion.span
              initial={reduce ? { opacity: 0 } : { scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 1.15, duration: 0.9, ease: EASE }}
              className="-mt-px h-[3px] w-44 origin-left bg-brand sm:w-52"
            />

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 0.6, ease: EASE }}
              className="mt-7 text-[11px] font-bold uppercase tracking-[0.34em] text-body"
            >
              South African GBV support, always on
            </motion.p>

            {/* The four values as one quiet dotted line, not a row of boxes:
                four bordered chips read as UI, one line of small caps reads
                as a promise, which is what a launch screen should carry. */}
            <div className="mt-8 flex items-center justify-center gap-2.5 sm:gap-3">
              {VALUES.map((word, i) => (
                <span key={word} className="flex items-center gap-2.5 sm:gap-3">
                  {i > 0 && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 2.15 + i * 0.18, duration: 0.4 }}
                      className="h-1 w-1 rounded-full bg-taupe"
                      aria-hidden="true"
                    />
                  )}
                  <motion.span
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 2.15 + i * 0.18,
                      duration: 0.5,
                      ease: EASE,
                    }}
                    className="text-[10px] font-bold uppercase tracking-[0.22em] text-dim sm:text-[11px]"
                  >
                    {word}
                  </motion.span>
                </span>
              ))}
            </div>
          </motion.div>

          {/* Pinned quiet line: what the site promises, no movement */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.9, duration: 0.7, ease: "linear" }}
            className="absolute inset-x-0 bottom-10 text-center text-[10px] font-bold uppercase tracking-[0.24em] text-faint sm:bottom-12"
          >
            No accounts · No tracking · Works offline
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
