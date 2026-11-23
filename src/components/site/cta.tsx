"use client";

import { Phone, Plus, Share2 } from "lucide-react";
import { Reveal } from "./reveal";
import { useToast } from "@/hooks/use-toast";
import { CRISIS_LINE } from "@/lib/numbers";

export function Cta() {
  const { toast } = useToast();

  /**
   * Share Fast with one person. Uses the native share sheet where the
   * platform offers it, otherwise copies a ready-to-paste message. No
   * analytics, no link parameters, nothing stored: the visitor chooses
   * the recipient and Fast never learns that the share happened. The
   * description line carries the verified Command Centre number from the
   * directory — never typed here by hand.
   */
  const shareFast = async () => {
    const url = `${window.location.origin}/`;
    const text = `Fast — free, confidential GBV support for South Africa, answered 24/7: ${CRISIS_LINE.display}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Fast", text, url });
        toast({
          title: "Thank you for sharing",
          description: "Someone closer to safety may be one message away.",
        });
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        toast({
          title: "Link copied",
          description: "Paste it into a chat when someone needs it.",
        });
      }
    } catch (err) {
      // Closing the share sheet is not a failure; stay quiet for it.
      if ((err as DOMException | undefined)?.name === "AbortError") return;
      toast({
        title: "Could not share automatically",
        description: "Copy the address bar link to pass Fast on.",
      });
    }
  };

  return (
    <section className="relative py-20 sm:py-28" aria-labelledby="cta-heading">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <div className="card-surface card-featured relative overflow-hidden px-6 py-16 text-center sm:px-12 sm:py-24">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
            >
              <div className="absolute inset-0 bg-grid opacity-25 bg-fade-y" />
            </div>

            <div className="relative flex flex-col items-center">
              <span className="mb-6 inline-flex items-center gap-2 rounded-lg border-2 border-taupe bg-taupe/20 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-dim">
                <span className="h-px w-3.5 bg-brand" aria-hidden="true" />
                Save the number today
              </span>
              <h2
                id="cta-heading"
                className="text-balance font-display text-4xl font-black leading-[1.02] tracking-tight text-foreground sm:text-6xl lg:text-7xl"
              >
                One call can change
                <span className="text-brand"> everything</span>
              </h2>
              <p className="mt-6 max-w-xl text-balance text-base font-medium leading-relaxed text-body sm:text-lg">
                Yours, or someone else&apos;s. Save the Command Centre in your
                contacts today, not because you expect trouble, but because
                trouble never sends an invitation.
              </p>
              <div className="mt-10 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
                <a
                  href="#emergency"
                  className="lift group inline-flex min-h-16 w-full items-center gap-3 rounded-2xl bg-brand px-9 text-2xl font-black tracking-tight text-ink shadow-[0_20px_44px_-18px_rgba(216,211,101,0.5)] hover:bg-brand-2 sm:w-auto"
                >
                  <Phone
                    className="h-6 w-6 transition-transform group-hover:rotate-12"
                    aria-hidden="true"
                  />
                  Get help now
                </a>
                <button
                  onClick={shareFast}
                  className="lift inline-flex min-h-16 items-center gap-2.5 rounded-2xl border-[3px] border-taupe bg-taupe/15 px-7 text-base font-bold tracking-tight text-foreground transition-colors hover:border-brand hover:text-brand"
                >
                  <Share2 className="h-5 w-5" aria-hidden="true" />
                  Share Fast
                </button>
              </div>
              <p className="mt-6 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-dim">
                <Plus className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                Free, confidential, all 11 languages, never closed
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
