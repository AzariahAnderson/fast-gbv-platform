"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Phone, type LucideIcon } from "lucide-react";
import { EASE } from "@/lib/motion";
import { CRISIS_LINE, CRISIS_TEL_HREF } from "@/lib/numbers";

/**
 * The split-screen shell every authentication screen shares. The left
 * panel is the "why": the brand's warm side, animated emoji companions,
 * the privacy promises that matter before anyone hands over an email, and
 * — always — the crisis line, because someone in danger can land on a
 * sign-in screen too. The right panel is the "task": whatever the page
 * needs to collect, centred and quiet.
 *
 * On small screens the brand panel folds into a compact banner above the
 * form (the bullet list hides, the trio of emojis, the statement and the
 * crisis card stay), so the form is never more than a scroll away.
 */

/** One decorative emoji floating in the left panel's gutters. */
type PanelEmoji = {
  src: string;
  pos: string;
  size: string;
  rotate: number;
  drift: "a" | "b";
  life: "bob" | "sway" | "twinkle";
  lifeDur?: string;
};

export type AuthSplitBullet = {
  icon: LucideIcon;
  label: string;
};

export type AuthSplitProps = {
  /** Uppercase kicker above the statement. */
  eyebrow: string;
  /** The big statement; pages mark their one gold word or phrase. */
  title: React.ReactNode;
  /** One supporting sentence under the statement. */
  note: string;
  /** Privacy / trust promises, drawn from what Fast actually does. */
  bullets: AuthSplitBullet[];
  /** Emoji companions: the first three lead the strip, the rest float. */
  emojis: PanelEmoji[];
  /** The form side. */
  children: React.ReactNode;
};

const LIFE_CLASS = {
  bob: "animate-bob",
  sway: "animate-sway",
  twinkle: "animate-twinkle",
} as const;

function PanelFloat({
  emoji,
  index,
  reduce,
}: {
  emoji: PanelEmoji;
  index: number;
  reduce: boolean;
}) {
  return (
    <motion.span
      aria-hidden="true"
      // Hidden by default; each float's pos carries its own visibility
      // breakpoint (e.g. "sm:block top-[7%] right-[4%]"), so a page can
      // hold floats back from widths where its banner is tightest.
      className={`pointer-events-none absolute z-0 hidden ${emoji.pos}`}
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.4, rotate: emoji.rotate * 2 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: emoji.rotate }}
      transition={{ delay: 0.55 + index * 0.12, duration: 0.8, ease: EASE }}
    >
      <span className={`block ${emoji.drift === "a" ? "animate-float-a" : "animate-float-b"}`}>
        <img
          src={emoji.src}
          alt=""
          width={88}
          height={88}
          draggable={false}
          className={`${LIFE_CLASS[emoji.life]} ${emoji.size}`}
          style={{
            animationDuration: emoji.lifeDur,
            animationDelay: `${(index * 0.7) % 2.4}s`,
          }}
        />
      </span>
    </motion.span>
  );
}

export function AuthSplit({
  eyebrow,
  title,
  note,
  bullets,
  emojis,
  children,
}: AuthSplitProps) {
  const reduce = useReducedMotion();
  const rise = (delay: number) =>
    reduce
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay, duration: 0.4 } }
      : {
          initial: { opacity: 0, y: 22, filter: "blur(6px)" },
          animate: { opacity: 1, y: 0, filter: "blur(0px)" },
          transition: { delay, duration: 0.7, ease: EASE },
        };

  const [lead, ...floaters] = emojis;

  return (
    <div className="flex min-h-dvh flex-col lg:grid lg:h-dvh lg:grid-cols-[1fr_1.1fr]">
      {/* ————— LEFT · the why ————— */}
      <aside className="relative overflow-hidden border-b-[3px] border-taupe bg-ink-deep/70 lg:h-dvh lg:border-b-0 lg:border-r-[3px]">
        {/* Atmosphere: one warm light, one deep field, a faint grid.
            overflow-hidden on the wrapper keeps the oversized glow fields
            from extending the page's scrollable area — same discipline as
            the hero section. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="atmos-glow animate-drift-a opacity-70" />
          <div className="atmos-field-l animate-drift-b" />
          <div className="absolute inset-0 bg-grid bg-fade-y opacity-30" />
        </div>

        {floaters.map((emoji, i) => (
          <PanelFloat key={emoji.src} emoji={emoji} index={i} reduce={!!reduce} />
        ))}

        <div className="relative z-10 flex h-full flex-col px-5 pb-7 pt-6 sm:px-8 lg:px-10 lg:pb-8 lg:pt-7">
          <motion.header
            {...rise(0.05)}
            className="flex items-center justify-between gap-3"
          >
            <Link
              href="/"
              className="text-[1.35rem] font-black leading-none tracking-tight text-foreground transition-colors duration-300 hover:text-brand"
              aria-label="Fast, back to the homepage"
            >
              FAST
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-taupe bg-taupe/15 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-dim transition-colors duration-300 hover:border-brand hover:text-brand"
            >
              <ArrowLeft className="h-3 w-3" aria-hidden="true" />
              Back to the site
            </Link>
          </motion.header>

          <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-9 lg:py-6">
            {/* The lead trio: a small welcome party above the statement.
                On every width, because they are small enough to sit beside
                the words instead of over them. */}
            {lead ? (
              <motion.div {...rise(0.12)} className="mb-6 flex items-center gap-3">
                {emojis.slice(0, 3).map((emoji, i) => (
                  <span key={emoji.src} className="inline-block">
                    <img
                      src={emoji.src}
                      alt=""
                      width={88}
                      height={88}
                      draggable={false}
                      className={`${LIFE_CLASS[emoji.life]} h-9 w-9 drop-shadow-[0_8px_18px_rgba(0,0,0,0.35)] sm:h-10 sm:w-10`}
                      style={{
                        animationDuration: emoji.lifeDur,
                        animationDelay: `${i * 0.8}s`,
                      }}
                    />
                  </span>
                ))}
              </motion.div>
            ) : null}

            <motion.p
              {...rise(0.18)}
              className="inline-flex w-fit items-center gap-2 rounded-lg border-2 border-brand/50 bg-brand/10 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-brand sm:text-[11px]"
            >
              <span className="h-px w-3 bg-brand" aria-hidden="true" />
              {eyebrow}
            </motion.p>

            <motion.h2
              {...rise(0.26)}
              className="mt-5 max-w-md text-balance font-display text-3xl font-black leading-[1.06] tracking-tight text-foreground sm:text-4xl lg:text-[2.85rem]"
            >
              {title}
            </motion.h2>

            <motion.p
              {...rise(0.34)}
              className="mt-4 max-w-md text-balance text-sm font-medium leading-relaxed text-body sm:text-base"
            >
              {note}
            </motion.p>

            {/* The promises. Hidden on the folded mobile banner, where the
                form must stay close, and full strength from lg. */}
            <motion.ul {...rise(0.44)} className="mt-8 hidden flex-col gap-3.5 lg:flex">
              {bullets.map((bullet) => (
                <li key={bullet.label} className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border-2 border-taupe bg-taupe/15 text-brand">
                    <bullet.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="pt-2 text-sm font-medium leading-snug text-body">
                    {bullet.label}
                  </span>
                </li>
              ))}
            </motion.ul>

            {/* The crisis line, always in reach — sign-in screens are
                public pages, and someone in danger can land on one. */}
            <motion.div
              {...rise(0.55)}
              className="mt-8 rounded-2xl border-2 border-brand/40 bg-brand/10 p-4 sm:p-5"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-dim">
                In danger right now
              </p>
              <a
                href={CRISIS_TEL_HREF}
                className="lift mt-2 inline-flex items-center gap-2.5 text-xl font-black tracking-tight text-brand sm:text-2xl"
              >
                <Phone className="h-5 w-5" aria-hidden="true" />
                {CRISIS_LINE.display}
              </a>
              <p className="mt-1.5 text-xs leading-relaxed text-dim">
                Free, answered 24 hours · {CRISIS_LINE.name}
              </p>
            </motion.div>
          </div>
        </div>
      </aside>

      {/* ————— RIGHT · the task ————— */}
      <main className="relative flex flex-1 flex-col overflow-hidden lg:overflow-y-auto">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="atmos-field-r animate-drift-a opacity-50" />
        </div>
        <div className="relative flex w-full flex-1 flex-col px-5 pb-[max(3.5rem,env(safe-area-inset-bottom))] pt-9 sm:px-8 lg:py-10">
          <motion.div
            {...rise(0.3)}
            className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
