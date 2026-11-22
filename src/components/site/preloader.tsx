"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

export function Preloader() {
  const [done, setDone] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    const t = setTimeout(() => setDone(true), 1700);
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
          exit={{ y: "-100%", transition: { duration: 0.7, ease: [0.76, 0, 0.24, 1] } }}
          aria-hidden="true"
        >
          <div className="flex items-baseline overflow-hidden font-extrabold tracking-tighter">
            {["F", "A", "S", "T"].map((letter, i) => (
              <motion.span
                key={letter}
                initial={reduce ? { opacity: 0 } : { y: "110%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  delay: 0.15 + i * 0.09,
                  duration: 0.7,
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
              transition={{ delay: 0.55, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              className="ml-1 h-3 w-3 rounded-full bg-brand sm:h-3.5 sm:w-3.5"
            />
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="mt-4 font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground"
          >
            Help that answers
          </motion.p>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.4, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 h-px w-40 origin-left bg-gradient-to-r from-brand to-brand-2"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
