"use client";

import { initials } from "@/lib/app/time";

/**
 * The one avatar style used everywhere: a taupe circle with warm initials
 * or the person's photo. Consistent on purpose — recognition, not
 * decoration.
 */
export function Avatar({
  name,
  url,
  size = "md",
  online = false,
}: {
  name: string | null | undefined;
  url?: string | null;
  size?: "sm" | "md" | "lg";
  online?: boolean;
}) {
  const dims =
    size === "sm" ? "h-8 w-8 text-[11px]" : size === "lg" ? "h-14 w-14 text-lg" : "h-10 w-10 text-sm";
  return (
    <span className="relative inline-block shrink-0">
      {url ? (
         
        <img
          src={url}
          alt=""
          className={`${dims} rounded-full border-2 border-taupe object-cover`}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span
          aria-hidden="true"
          className={`${dims} flex items-center justify-center rounded-full border-2 border-taupe bg-taupe/40 font-bold text-foreground`}
        >
          {initials(name)}
        </span>
      )}
      {online && (
        <span
          aria-hidden="true"
          className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-brand"
          title="Online now"
        />
      )}
      <span className="sr-only">{online ? "Online now" : "Offline"}</span>
    </span>
  );
}
