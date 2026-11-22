"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";

export function Cursor() {
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const reduce = useReducedMotion();

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 320, damping: 28, mass: 0.6 });
  const ringY = useSpring(y, { stiffness: 320, damping: 28, mass: 0.6 });

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    if (!fine || reduce) return;

    let shown = false;
    const move = (e: MouseEvent) => {
      if (!shown) {
        shown = true;
        setEnabled(true);
      }
      x.set(e.clientX);
      y.set(e.clientY);
      const target = e.target as HTMLElement | null;
      setHovering(
        Boolean(target?.closest("a, button, [role='button'], summary, input, textarea"))
      );
    };
    window.addEventListener("mousemove", move, { passive: true });
    return () => window.removeEventListener("mousemove", move);
  }, [x, y, reduce]);

  if (!enabled) return null;

  return (
    <>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[120] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand"
        style={{ x, y }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[120] -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand/60"
        style={{ x: ringX, y: ringY }}
        animate={{
          width: hovering ? 52 : 30,
          height: hovering ? 52 : 30,
          opacity: hovering ? 0.95 : 0.55,
        }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      />
    </>
  );
}
