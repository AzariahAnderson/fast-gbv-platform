import { Preloader } from "@/components/site/preloader";
import { Welcome } from "@/components/site/welcome";
import { PwaRegister } from "@/components/site/pwa-register";
import { Navbar } from "@/components/site/navbar";
import { Hero } from "@/components/site/hero";
import { Encouragement } from "@/components/site/encouragement";
import { Emergency } from "@/components/site/emergency";
import { BentoSurvivors } from "@/components/site/bento-survivors";
import { Live } from "@/components/site/live";
import { BentoChange } from "@/components/site/bento-change";
import { Steps } from "@/components/site/steps";
import { Faq } from "@/components/site/faq";
import { Cta } from "@/components/site/cta";
import { Footer } from "@/components/site/footer";
import { FAQS } from "@/lib/faqs";
import { LANGUAGES } from "@/lib/languages";
import { SITE_URL } from "@/lib/site";

/**
 * Structured data, kept strictly truthful:
 * - Fast itself is described as a WebSite, never as a government body.
 * - The GBV Command Centre is a real government-run service (Department of
 *   Social Development) and is described as one, with its verified number.
 * - The FAQPage mirrors the questions visible on the page, nothing more.
 * No ratings, reviews or statistics are claimed here.
 */
function structuredData() {
  // The languages the GBV Command Centre answers in: derived from the
  // single source of truth in src/lib/languages.ts so structured data can
  // never drift from the list the welcome flow actually offers.
  const languages = LANGUAGES.map((l) => l.english);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: "Fast",
        description:
          "A public awareness page that connects South Africans to official, free gender based violence services.",
        inLanguage: "en-ZA",
      },
      {
        "@type": "GovernmentOrganization",
        "@id": `${SITE_URL}/#gbv-command-centre`,
        name: "GBV Command Centre",
        parentOrganization: {
          "@type": "GovernmentOrganization",
          name: "Department of Social Development",
        },
        areaServed: { "@type": "Country", name: "South Africa" },
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "crisis hotline",
          telephone: "+27-800-428-428",
          availableLanguage: languages,
          hoursAvailable: {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ],
            opens: "00:00",
            closes: "23:59",
          },
        },
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_URL}/#faq`,
        mainEntity: FAQS.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };
}

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      {/* Without JavaScript the splash would never lift, so it is removed
          before it can trap a visitor on a broken browser. */}
      <noscript>
        <style>{`.fast-preloader{display:none!important}`}</style>
      </noscript>
      <a href="#emergency" className="skip-link">
        Skip to the emergency numbers
      </a>
      <Preloader />
      {/* The welcome flow opens once the splash lifts (first visit only):
          language, then a compulsory appropriate name, then what the
          visitor is going through — all kept on the device only. */}
      <Welcome />
      <PwaRegister />
      <div className="noise-overlay" aria-hidden="true" />
      <Navbar />

      <main className="flex-1">
        <Hero />
        <Encouragement />
        <Emergency />
        <BentoSurvivors />
        <Live />
        <BentoChange />
        <Steps />
        <Faq />
        <Cta />
      </main>

      <Footer />

      <script
        type="application/ld+json"
        // The payload is fully static and contains no user input; escaping
        // < keeps it that way even if a future field ever carries one, so
        // the script tag can never be closed early from inside the data.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData()).replace(/</g, "\\u003c"),
        }}
      />
    </div>
  );
}
