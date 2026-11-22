"use client";

import { ArrowUpRight, RefreshCw, Radio, ShieldCheck, Lightbulb } from "lucide-react";
import { Reveal } from "./reveal";
import { useLive } from "@/hooks/use-live";
import { useToast } from "@/hooks/use-toast";
import type { LiveData } from "@/lib/live-types";

/**
 * The single numbers section of the site. Every figure and every news item
 * is regenerated hourly by Gemini with Google Search grounding and carries
 * its publishing source, so a visitor can click straight through to where
 * the data came from. Contact numbers never appear here, they live in the
 * emergency section and are always the verified official ones.
 */

function updatedLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Johannesburg",
  })} SAST`;
}

function StatCard({ stat, i }: { stat: LiveData["stats"][number]; i: number }) {
  return (
    <div className="card-hover card-surface group flex h-full flex-col gap-4 p-6 sm:p-7">
      <p
        className={`font-display text-5xl font-black tracking-tight sm:text-[3.1rem] ${
          i === 0 ? "text-brand" : "text-foreground"
        }`}
      >
        {stat.value}
      </p>
      <p className="text-sm font-medium leading-relaxed text-body">{stat.label}</p>
      <p className="mt-auto text-[10px] font-bold uppercase tracking-[0.14em] text-faint">
        {stat.sourceUrl ? (
          <a
            href={stat.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 transition-colors duration-300 hover:text-brand"
          >
            {stat.source}
            <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
          </a>
        ) : (
          stat.source
        )}
      </p>
    </div>
  );
}

function NewsCard({ item }: { item: LiveData["news"][number] }) {
  return (
    <article className="card-hover card-surface group flex h-full flex-col gap-3 p-6 sm:p-7">
      <div className="flex items-center justify-between gap-3">
        {item.date ? (
          <span className="rounded-lg border-2 border-taupe bg-taupe/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-dim">
            {item.date}
          </span>
        ) : (
          <span />
        )}
      </div>
      <h3 className="font-head text-lg font-black leading-snug tracking-tight text-foreground">
        {item.title}
      </h3>
      <p className="text-sm font-medium leading-relaxed text-body">{item.summary}</p>
      <p className="mt-auto text-[10px] font-bold uppercase tracking-[0.14em] text-faint">
        {item.sourceUrl ? (
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 transition-colors duration-300 hover:text-brand"
          >
            {item.source}
            <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
          </a>
        ) : (
          item.source
        )}
      </p>
    </article>
  );
}

export function Live() {
  const { data, refreshing, refresh, isLive } = useLive();
  const { toast } = useToast();
  const updated = updatedLabel(data.updatedAt);

  // The refresh button used to answer silently: a rate limited server sent
  // back cached data and nothing on screen changed, which reads as "broken".
  // Every outcome now gets one quiet, honest toast.
  const onRefresh = async () => {
    const outcome = await refresh();
    if (outcome === "fresh") {
      toast({
        title: "Live data updated",
        description: "Newest figures and headlines are on the cards now.",
      });
    } else if (outcome === "cached") {
      toast({
        title: "Already fresh",
        description:
          "Figures regenerate once an hour; nothing new in the last few minutes.",
      });
    } else {
      toast({
        title: "Could not refresh",
        description:
          "The refresh service did not answer. The last verified data stays on screen.",
      });
    }
  };

  return (
    <section
      id="live"
      className="relative scroll-mt-28 border-y-[3px] border-taupe bg-taupe/15 py-20 sm:py-28"
      aria-labelledby="live-heading"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-grid opacity-30 bg-fade-y"
      />
      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <Reveal className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-dim">
              Live South Africa, refreshed every hour
            </p>
            <h2
              id="live-heading"
              className="mt-5 text-balance font-head text-4xl font-black leading-[1.02] tracking-tight text-foreground sm:text-5xl lg:text-[3.4rem]"
            >
              The crisis in numbers you can
              <span className="text-brand"> check yourself</span>
            </h2>
            <p className="mt-6 max-w-2xl text-balance text-base font-medium leading-relaxed text-body sm:text-lg">
              Figures and headlines are regenerated once an hour with live web
              search grounding. Every card carries its publishing source, so
              nothing here has to be taken on trust.
            </p>
          </Reveal>

          <Reveal delay={0.1} className="shrink-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-lg border-2 border-taupe bg-taupe/20 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-dim">
                <Radio
                  className={`h-3.5 w-3.5 ${isLive ? "text-brand" : "text-dim"}`}
                  aria-hidden="true"
                />
                {isLive ? `Updated ${updated}` : "Verified baseline"}
              </span>
              <button
                onClick={onRefresh}
                disabled={refreshing}
                className="lift inline-flex min-h-10 items-center gap-2 rounded-xl border-2 border-taupe bg-taupe/20 px-4 text-xs font-bold uppercase tracking-[0.14em] text-dim transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                {refreshing ? "Checking" : "Refresh"}
              </button>
            </div>
          </Reveal>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {data.stats.slice(0, 4).map((stat, i) => (
            <Reveal key={`${stat.source}-${stat.value}`} delay={0.06 * i}>
              <StatCard stat={stat} i={i} />
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.15}>
          <p className="mt-12 mb-6 text-[11px] font-bold uppercase tracking-[0.2em] text-dim">
            In the news right now
          </p>
        </Reveal>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {data.news.slice(0, 3).map((item) => (
            <Reveal key={`${item.source}-${item.title}`} delay={0.08}>
              <NewsCard item={item} />
            </Reveal>
          ))}
        </div>

        {data.tip ? (
          <Reveal delay={0.2}>
            <div className="card-featured card-surface mt-12 flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:gap-5 sm:p-7">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-taupe bg-taupe/20 text-brand">
                <Lightbulb className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="text-sm font-medium leading-relaxed text-body sm:text-base">
                <span className="font-black text-foreground">Today&apos;s tip. </span>
                {data.tip}
              </p>
            </div>
          </Reveal>
        ) : null}

        <Reveal delay={0.25}>
          <p className="mt-8 flex flex-wrap items-center justify-center gap-2 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-faint">
            <ShieldCheck className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
            News and figures refresh hourly. Emergency contact numbers on this
            page are verified official numbers and are never AI generated.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
