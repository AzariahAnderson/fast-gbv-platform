"use client";

import { Reveal, SectionHeading } from "./reveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "Is it really free and confidential?",
    a: "Yes. 0800 428 428, the Please Call Me callback on *120*7867# and SMS to 31531 are all free from every South African network. Calls are confidential, and counsellors only involve the police or a social worker if you ask, or if someone's life is in immediate danger.",
  },
  {
    q: "What happens when I call the GBV Command Centre?",
    a: "A trained counsellor answers, usually within seconds. They listen, help you assess the danger you are in, and can send a mobile social worker, connect you to a shelter, link you with SAPS and medical care, or simply stay on the line. You decide how much you share and what happens next.",
  },
  {
    q: "Can I call for someone else?",
    a: "Absolutely. Friends, family, neighbours and colleagues can call for guidance on supporting a survivor safely, what to say, what never to say, and how to report abuse without putting the survivor at greater risk.",
  },
  {
    q: "I am a man. Can I get help?",
    a: "Yes. Men are survivors too and these lines are for you. Lifeline on 0861 322 322 counsels anyone at any hour, and Childline on 116 is there for boys and young men. Men abused by partners will be believed and helped.",
  },
  {
    q: "I am the one causing harm. Will I be judged?",
    a: "The Command Centre exists to end the cycle, and the cycle cannot end without you. Say the words I need help to change and you will be treated with respect and connected to counselling and behaviour change programmes such as Sonke Gender Justice's men's groups. Accountability is the goal, humiliation is not.",
  },
  {
    q: "What if I cannot speak safely on the phone?",
    a: "Dial *120*7867# to send a free Please Call Me, or SMS the word Help to 31531. A counsellor calls you back, or texts if a call is unsafe. Delete sent messages if your phone is checked, and browse in private mode where possible.",
  },
  {
    q: "How do I hide my visit to this website?",
    a: "Use private or incognito browsing before you open the page. Clear your browser history afterwards if your device is monitored, and never leave help pages open on screen. If you are in immediate danger, close the browser and call 10111 from a safe place.",
  },
];

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
              <span className="text-brand"> afraid to ask.</span>
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
                className="border-taupe/50"
              >
                <AccordionTrigger className="py-5 text-left text-base font-bold tracking-tight hover:text-brand hover:no-underline sm:text-lg [&[data-state=open]>svg]:text-brand">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-[15px] leading-relaxed text-muted-foreground">
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
