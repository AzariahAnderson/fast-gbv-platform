"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLive } from "@/hooks/use-live";
import { BASELINE } from "@/lib/live-types";

/**
 * Encouragement strip. Replaces the old emergency numbers ticker with a
 * slow rotating set of compassionate messages, each paired with an official
 * animated 3D emoji from Google's Noto Emoji Animation set. The emojis are
 * stored locally and scaled down, so they add almost nothing to mobile data
 * and keep working with no connection at all.
 */

const EMOJIS = [
  { src: "/emojis/2728-128.webp", alt: "Sparkles" },
  { src: "/emojis/1f49b-128.webp", alt: "Yellow heart" },
  { src: "/emojis/1f331-128.webp", alt: "Seedling" },
  { src: "/emojis/1f4aa-128.webp", alt: "Flexed biceps" },
  { src: "/emojis/1f91d-128.webp", alt: "Handshake" },
  { src: "/emojis/1fac2-128.webp", alt: "People hugging" },
  { src: "/emojis/1f49a-128.webp", alt: "Green heart" },
  { src: "/emojis/1f31f-128.webp", alt: "Glowing star" },
];

const ROTATE_MS = 6500;

export function Encouragement() {
  const { data } = useLive();
  // The strip must never go blank, not even if the AI payload is missing or
  // malformed: the verified baseline always backs it up.
  const messages = data.encouragement.length ? data.encouragement : BASELINE.encouragement;
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const paused = useRef(false);

  useEffect(() => {
    if (reduce || messages.length < 2) return;
    const t = setInterval(() => {
      if (!paused.current) {
        setIndex((i) => (i + 1) % messages.length);
      }
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, [reduce, messages.length]);

  const safeIndex = messages.length ? index % messages.length : 0;
  const emoji = EMOJIS[safeIndex % EMOJIS.length];

  const hold = useCallback(() => {
    paused.current = true;
  }, []);
  const release = useCallback(() => {
    paused.current = false;
  }, []);

  return (
    <section
      aria-label="A word of encouragement"
      className="relative z-10 overflow-hidden border-y-[3px] border-taupe bg-taupe/20"
    >
      <div
        className="mx-auto flex min-h-28 max-w-4xl items-center justify-center gap-6 px-5 py-6 sm:gap-10 sm:px-8 sm:py-7"
        onMouseEnter={hold}
        onMouseLeave={release}
        onFocus={hold}
        onBlur={release}
      >
        {reduce ? (
          <img
            src={emoji.src}
            alt={emoji.alt}
            width={88}
            height={88}
            draggable={false}
            className="h-[72px] w-[72px] shrink-0 sm:h-[88px] sm:w-[88px]"
          />
        ) : (
          <img
            src={emoji.src}
            alt={emoji.alt}
            width={88}
            height={88}
            draggable={false}
            className="animate-bob h-[72px] w-[72px] shrink-0 drop-shadow-[0_10px_24px_rgba(0,0,0,0.35)] sm:h-[88px] sm:w-[88px]"
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-dim">
            Hold on, read this
          </p>
          <div className="relative min-h-[3.2rem] sm:min-h-[2.6rem]">
            <AnimatePresence mode="wait">
              <motion.p
                key={`${safeIndex}-${messages[safeIndex] ?? "empty"}`}
                initial={reduce ? false : { opacity: 0, y: 14, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={reduce ? undefined : { opacity: 0, y: -14, filter: "blur(6px)" }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="text-balance text-lg font-black leading-snug tracking-tight text-foreground sm:text-2xl"
              >
                {messages[safeIndex] ?? ""}
              </motion.p>
            </AnimatePresence>
          </div>
          {messages.length > 1 ? (
            <div
              className="flex flex-wrap items-center gap-x-2 gap-y-1.5"
              aria-hidden="true"
            >
              {messages.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    i === safeIndex ? "w-6 bg-brand" : "w-1.5 bg-taupe"
                  }`}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
