"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/**
 * Splash screen. The wordmark rises, the four values behind the name
 * appear in sequence, then the curtain lifts. Four seconds, no progress
 * bar, no counters, no pulsing indicators.
 */
const VALUES = ["Free", "Anonymous", "Safe", "Trusted"];

export function Preloader() {
  const [done, setDone] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
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
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-ink"
          exit={{ y: "-100%", transition: { duration: 0.7, ease: [0.76, 0, 0.24, 1] } }}
          aria-hidden="true"
        >
          {/* One warm light source behind the wordmark, completely still */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[30rem] w-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/[0.07] blur-[130px]" />

          <div className="relative flex items-baseline overflow-hidden pb-1 font-display">
            {["F", "A", "S", "T"].map((letter, i) => (
              <motion.span
                key={letter}
                initial={reduce ? { opacity: 0 } : { y: "115%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  delay: 0.3 + i * 0.16,
                  duration: 0.85,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={`text-7xl tracking-tight sm:text-8xl ${
                  letter === "A" ? "text-brand" : "text-foreground"
                }`}
              >
                {letter}
              </motion.span>
            ))}
          </div>

          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.7 }}
            className="mt-8 h-px w-44 bg-taupe"
          />

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.35, duration: 0.6 }}
            className="mt-6 font-mono text-[11px] uppercase tracking-[0.34em] text-muted-foreground"
          >
            South African GBV support, always on
          </motion.p>

          <div className="mt-10 flex items-center gap-4">
            {VALUES.map((word, i) => (
              <div key={word} className="flex items-center gap-4">
                <motion.span
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 2.1 + i * 0.32,
                    duration: 0.55,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="font-head text-sm font-medium tracking-wide text-brand-2/90"
                >
                  {word}
                </motion.span>
                {i < VALUES.length - 1 ? (
                  <span
                    className="h-3.5 w-px bg-taupe/80"
                    aria-hidden="true"
                  />
                ) : null}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
