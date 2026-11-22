"use client";

import { Reveal, SectionHeading } from "./reveal";
import { FAQS } from "@/lib/faqs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function Faq() {
  return (
    <section
      id="faq"
      className="relative scroll-mt-28 py-20 sm:py-28"
      aria-labelledby="faq-heading"
    >
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Questions people ask quietly"
          title={
            <>
              The things you are
              <span className="text-brand"> afraid to ask</span>
            </>
          }
          align="center"
        />

        <Reveal delay={0.1} className="mt-12">
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((faq, i) => (
              <AccordionItem
                key={faq.q}
                value={`item-${i}`}
                className="border-taupe/70"
              >
                <AccordionTrigger className="py-5 text-left font-head text-base font-bold tracking-tight hover:text-brand hover:no-underline sm:text-lg [&[data-state=open]>svg]:text-brand">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-[15px] font-medium leading-relaxed text-body">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
