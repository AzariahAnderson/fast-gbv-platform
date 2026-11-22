"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Card system: one shared surface for the whole site so every card reads
 * identical. Fill is taupe over the ink background, the frame is a thick
 * 3px taupe border, featured cards swap the frame to the gold accent.
 * Titles run Inter black in warm white, body copy in the light grey tone,
 * phone numbers and actions are the only gold text on a card.
 */
export function CallCard({
  title,
  number,
  tel,
  href,
  description,
  chips = [],
  tagline,
  featured = false,
  icon,
  iconLabel,
  className,
}: {
  title: string;
  number: string;
  tel?: string;
  href: string;
  description?: string;
  chips?: string[];
  tagline?: string;
  featured?: boolean;
  icon?: ReactNode;
  iconLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "card-hover card-surface group flex h-full flex-col gap-5 p-6 sm:p-7",
        featured && "card-featured",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          {tagline ? (
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-dim">
              {tagline}
            </p>
          ) : null}
          <h3
            className={cn(
              "font-head font-black tracking-tight text-foreground",
              featured ? "text-2xl sm:text-[1.7rem]" : "text-xl"
            )}
          >
            {title}
          </h3>
        </div>
        {icon ? (
          <div
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border-2 border-taupe bg-taupe/20 px-3 py-1.5"
            aria-label={iconLabel}
          >
            {icon}
          </div>
        ) : null}
      </div>

      <a
        href={href}
        aria-label={`Call ${title} on ${number}`}
        className={cn(
          "group/cta inline-flex items-center gap-3 rounded-2xl tracking-tight transition-colors",
          featured
            ? "border-[3px] border-brand bg-brand px-5 py-4 text-3xl font-black text-ink hover:border-brand-2 hover:bg-brand-2 sm:text-4xl"
            : "border-[3px] border-taupe bg-taupe/20 px-4 py-3 text-2xl font-black text-brand hover:border-brand"
        )}
      >
        <Phone
          className={cn(
            "shrink-0 transition-transform group-hover/cta:rotate-12",
            featured ? "h-6 w-6 sm:h-7 sm:w-7" : "h-5 w-5"
          )}
          aria-hidden="true"
        />
        <span className="tabular-nums">{number}</span>
      </a>

      {description ? (
        <p className="text-sm font-medium leading-relaxed text-body">{description}</p>
      ) : null}

      {chips.length > 0 ? (
        <ul className="mt-auto flex flex-wrap gap-2" aria-label={`${title} features`}>
          {chips.map((chip) => (
            <li
              key={chip}
              className="rounded-lg border-2 border-taupe bg-taupe/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-dim"
            >
              {chip}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function CopyChip({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      onClick={copy}
      aria-label={`Copy ${value} to clipboard`}
      className="lift inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-lg border-2 border-taupe text-brand hover:border-brand hover:bg-brand hover:text-ink"
    >
      {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
    </button>
  );
}

export function InfoCard({
  icon,
  title,
  children,
  className,
  link,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  className?: string;
  link?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "card-hover card-surface group flex h-full flex-col gap-4 p-6 sm:p-7",
        className
      )}
    >
      <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-taupe bg-taupe/20 text-brand transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6">
        {icon}
      </div>
      <h3 className="font-head text-xl font-black tracking-tight text-foreground">{title}</h3>
      <div className="text-sm font-medium leading-relaxed text-body">{children}</div>
      {link ? <div className="mt-auto pt-2">{link}</div> : null}
    </div>
  );
}
