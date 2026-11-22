"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/**
 * Splash screen: the wordmark rises, a soft glow breathes behind it,
 * then the curtain lifts. No progress bar, no counters.
 */
export function Preloader() {
  const [done, setDone] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    const t = setTimeout(() => setDone(true), 1500);
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
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-ink-deep"
          exit={{ y: "-100%", transition: { duration: 0.65, ease: [0.76, 0, 0.24, 1] } }}
          aria-hidden="true"
        >
          {/* Soft breathing glow behind the wordmark */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.4, ease: "easeOut" }}
            className="pointer-events-none absolute left-1/2 top-1/2 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/[0.07] blur-[110px]"
          />

          <div className="relative flex items-baseline overflow-hidden font-extrabold tracking-tighter">
            {["F", "A", "S", "T"].map((letter, i) => (
              <motion.span
                key={letter}
                initial={reduce ? { opacity: 0 } : { y: "110%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  delay: 0.12 + i * 0.08,
                  duration: 0.65,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="text-6xl sm:text-7xl"
              >
                {letter}
              </motion.span>
            ))}
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
              className="ml-1 h-3 w-3 rounded-full bg-brand sm:h-3.5 sm:w-3.5"
            />
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.62, duration: 0.55 }}
            className="mt-5 font-mono text-[11px] uppercase tracking-[0.32em] text-muted-foreground"
          >
            Help that answers
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
