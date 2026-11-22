"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Card system — strict grey theme:
 * surface #454040 (ink), border #605B51 (taupe, thick 2px, soft),
 * accents limited to the two brand yellows for numbers and actions.
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
      data-cursor="hover"
      className={cn(
        "group relative flex h-full flex-col gap-5 rounded-[26px] border-2 bg-ink p-6 transition-all duration-500 sm:p-7",
        featured
          ? "border-brand/45 shadow-[0_0_64px_rgba(216,211,101,0.07)]"
          : "border-taupe/60 hover:-translate-y-1 hover:border-taupe hover:shadow-[0_20px_60px_rgba(0,0,0,0.35)]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          {tagline ? (
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {tagline}
            </p>
          ) : null}
          <h3
            className={cn(
              "font-extrabold tracking-tight",
              featured ? "text-2xl sm:text-3xl" : "text-xl"
            )}
          >
            {title}
          </h3>
        </div>
        {icon ? (
          <div
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border-2 border-taupe/50 bg-ink-2 px-3 py-1.5"
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
          "group/cta inline-flex items-center gap-3 rounded-2xl font-black tracking-tight transition-all",
          featured
            ? "border-2 border-brand bg-brand px-5 py-4 text-3xl text-ink-deep hover:bg-brand-2 sm:text-4xl"
            : "border-2 border-taupe/60 bg-ink-2/70 px-4 py-3 text-2xl text-brand hover:border-brand/60 sm:text-3xl"
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
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}

      {chips.length > 0 ? (
        <ul className="mt-auto flex flex-wrap gap-2" aria-label={`${title} features`}>
          {chips.map((chip) => (
            <li
              key={chip}
              className="rounded-lg border-2 border-taupe/50 bg-ink-2/70 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
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
      className="inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-lg border-2 border-taupe/60 text-brand transition-all hover:border-brand hover:bg-brand hover:text-ink-deep active:scale-90"
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
      data-cursor="hover"
      className={cn(
        "group relative flex h-full flex-col gap-4 rounded-[26px] border-2 border-taupe/60 bg-ink p-6 transition-all duration-500 hover:-translate-y-1 hover:border-taupe hover:shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:p-7",
        className
      )}
    >
      <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-taupe/60 bg-ink-2 text-brand transition-transform duration-500 group-hover:scale-110">
        {icon}
      </div>
      <h3 className="text-xl font-extrabold tracking-tight">{title}</h3>
      <div className="text-sm leading-relaxed text-muted-foreground">{children}</div>
      {link ? <div className="mt-auto pt-2">{link}</div> : null}
    </div>
  );
}
