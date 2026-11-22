/**
 * The seven questions asked most quietly, shared by the FAQ accordion and
 * the FAQPage structured data so the two can never drift apart.
 */
export type Faq = { q: string; a: string };

export const FAQS: Faq[] = [
  {
    q: "Is it really free and confidential?",
    a: "Yes. The Command Centre line, the Please Call Me callback and the SMS line in the emergency section are all free from every South African network. Calls are confidential, and counsellors only involve the police or a social worker if you ask, or if someone's life is in immediate danger.",
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
    a: "Yes. Men are survivors too and these lines are for you. Lifeline counsels anyone at any hour, and Childline is there for boys and young men. Men abused by partners will be believed and helped.",
  },
  {
    q: "I am the one causing harm. Will I be judged?",
    a: "The Command Centre exists to end the cycle, and the cycle cannot end without you. Say the words I need help to change and you will be treated with respect and connected to counselling and behaviour change programmes such as Sonke Gender Justice's men's groups. Accountability is the goal, humiliation is not.",
  },
  {
    q: "What if I cannot speak safely on the phone?",
    a: "The emergency section has two silent options: a free Please Call Me callback and an SMS line. A counsellor calls you back, or texts if a call is unsafe. Delete sent messages if your phone is checked, and browse in private mode where possible.",
  },
  {
    q: "How do I hide my visit to this website?",
    a: "Use private or incognito browsing before you open the page. Clear your browser history afterwards if your device is monitored, and never leave help pages open on screen. If you are in immediate danger, close the browser and call the police from a safe place.",
  },
];
