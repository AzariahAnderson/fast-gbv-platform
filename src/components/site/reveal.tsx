"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { EASE } from "@/lib/motion";

export function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
}) {
  const reduce = useReducedMotion();
  // Opacity, translate and scale only: animating a blur filter forces the
  // compositor to re-filter every frame, which is the single most expensive
  // effect in this design on a low end phone. Dropping it costs nothing
  // visually at this distance and makes mid page scrolling visibly smoother.
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once, margin: "-70px" }}
      transition={{ duration: 0.85, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 rounded-lg border-2 border-taupe bg-taupe/15 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-dim",
        className
      )}
    >
      <span className="h-px w-3.5 bg-brand" aria-hidden="true" />
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  sub,
  align = "left",
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  sub?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5",
        align === "center" && "items-center text-center",
        className
      )}
    >
      <Reveal>
        <Eyebrow>{eyebrow}</Eyebrow>
      </Reveal>
      <Reveal delay={0.08}>
        <h2 className="max-w-3xl text-balance font-head text-4xl font-black leading-[1.02] tracking-tight text-foreground sm:text-5xl lg:text-[3.4rem]">
          {title}
        </h2>
      </Reveal>
      {sub ? (
        <Reveal delay={0.16}>
          <p
            className={cn(
              "max-w-2xl text-balance text-base font-medium leading-relaxed text-body sm:text-lg",
              align === "center" && "mx-auto"
            )}
          >
            {sub}
          </p>
        </Reveal>
      ) : null}
    </div>
  );
}
