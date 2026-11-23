"use client";

import { useState } from "react";
import { Phone, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { DIRECTORY, DIRECTORY_GROUPS, telHref, telOf, type DirectoryEntry } from "@/lib/numbers";
import { CopyChip } from "@/components/site/cards";

/**
 * GET HELP NOW. One tap from anywhere inside the app. The verified
 * directory is imported from src/lib/numbers.ts — the single source of
 * truth — so this sheet can never drift from the public pages. Call
 * entries dial directly; SMS and USSD short codes are copied, never
 * dialed, exactly as the directory's self-describing channel field
 * demands. Emergency services are visually separated from family alerts:
 * this sheet only ever lists official services.
 */
export function EmergencySheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-100 flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0.01 : 0.25 }}
          role="dialog"
          aria-modal="true"
          aria-label="Get help now"
        >
          <button
            aria-label="Close"
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
          />
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 48 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 32 }}
            transition={{ duration: reduce ? 0.01 : 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="card-surface relative m-3 flex max-h-[86dvh] w-full max-w-lg flex-col overflow-hidden p-0"
          >
            <div className="flex items-center justify-between gap-3 border-b-2 border-taupe px-6 py-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand">
                  Get help now
                </p>
                <p className="mt-1 text-sm text-body">
                  Free, official, answered around the clock.
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="lift rounded-xl border-2 border-taupe p-2 text-dim hover:border-brand hover:text-brand"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5">
              {DIRECTORY_GROUPS.map((group) => {
                const entries = DIRECTORY.filter((d) => d.group === group.label);
                if (entries.length === 0) return null;
                return (
                  <section key={group.label} className="mb-6 last:mb-1">
                    <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-dim">
                      {group.label}
                    </h2>
                    <p className="mt-1 text-xs text-faint">{group.blurb}</p>
                    <div className="mt-3 flex flex-col gap-2.5">
                      {entries.map((entry) => (
                        <DirectoryRow key={entry.name + entry.number} entry={entry} />
                      ))}
                    </div>
                  </section>
                );
              })}
              <p className="px-1 pb-2 text-xs leading-relaxed text-faint">
                Call cards dial when tapped. Short codes are copied so you can
                send them from any phone, including a borrowed one.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DirectoryRow({ entry }: { entry: DirectoryEntry }) {
  if (entry.channel === "call" && entry.tel) {
    return (
      <a
        href={telHref(telOf(entry))}
        className="lift flex min-h-13 items-center justify-between gap-3 rounded-2xl border-2 border-taupe bg-taupe/15 px-4 py-3 hover:border-brand"
      >
        <span className="min-w-0">
          <span className="block text-sm font-bold text-foreground">{entry.name}</span>
          <span className="block text-xs text-dim">
            {entry.number} · {entry.hours}
          </span>
        </span>
        <Phone className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
      </a>
    );
  }
  // Silent channels: copy, never dial.
  return (
    <div className="flex min-h-13 items-center justify-between gap-3 rounded-2xl border-2 border-taupe bg-taupe/15 px-4 py-3">
      <span className="min-w-0">
        <span className="block text-sm font-bold text-foreground">{entry.name}</span>
        <span className="block text-xs text-dim">
          {entry.number} · {entry.hours}
        </span>
      </span>
      <CopyChip value={entry.number} />
    </div>
  );
}

export function EmergencyButton({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`lift inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-brand px-5 text-sm font-bold text-ink ${className}`}
      >
        <Phone className="h-4 w-4" aria-hidden="true" />
        Get help now
      </button>
      <EmergencySheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
