"use client";

const ITEMS = [
  { label: "GBV Command Centre", value: "0800 428 428", href: "tel:0800428428" },
  { label: "SAPS Police", value: "10111", href: "tel:10111" },
  { label: "Ambulance and Fire", value: "10177", href: "tel:10177" },
  { label: "Free callback", value: "*120*7867#", href: undefined },
  { label: "Childline", value: "116", href: "tel:116" },
  { label: "TEARS Foundation", value: "*134*7355#", href: undefined },
];

export function Marquee() {
  const row = (key: string, hidden: boolean) => (
    <div
      key={key}
      aria-hidden={hidden}
      className="flex shrink-0 items-center"
    >
      {ITEMS.map((item) => {
        const content = (
          <span className="mx-7 inline-flex items-baseline gap-3 whitespace-nowrap">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-deep/70">
              {item.label}
            </span>
            <span className="text-lg font-black tracking-tight text-ink-deep">
              {item.value}
            </span>
          </span>
        );
        return (
          <span key={item.label} className="flex items-center">
            {item.href ? (
              <a href={item.href} tabIndex={hidden ? -1 : 0} className="transition-opacity hover:opacity-70">
                {content}
              </a>
            ) : (
              content
            )}
            <span
              className="h-5 w-px bg-ink-deep/50"
              aria-hidden="true"
            />
          </span>
        );
      })}
    </div>
  );

  return (
    <section
      aria-label="Emergency numbers ticker"
      className="relative z-10 -rotate-[0.5deg] scale-[1.02] overflow-hidden border-y-2 border-ink-deep/50 bg-brand py-3.5"
    >
      <div className="animate-marquee flex w-max">
        {row("a", false)}
        {row("b", true)}
      </div>
    </section>
  );
}
