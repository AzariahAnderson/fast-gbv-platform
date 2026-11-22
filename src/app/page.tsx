import { Preloader } from "@/components/site/preloader";
import { Cursor } from "@/components/site/cursor";
import { Navbar } from "@/components/site/navbar";
import { Hero } from "@/components/site/hero";
import { Marquee } from "@/components/site/marquee";
import { Emergency } from "@/components/site/emergency";
import { BentoSurvivors } from "@/components/site/bento-survivors";
import { Stats } from "@/components/site/stats";
import { BentoChange } from "@/components/site/bento-change";
import { Steps } from "@/components/site/steps";
import { Resources } from "@/components/site/resources";
import { Faq } from "@/components/site/faq";
import { Cta } from "@/components/site/cta";
import { Footer } from "@/components/site/footer";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <Preloader />
      <Cursor />
      <div className="noise-overlay" aria-hidden="true" />
      <Navbar />

      <main className="flex-1">
        <Hero />
        <Marquee />
        <Emergency />
        <BentoSurvivors />
        <Stats />
        <BentoChange />
        <Steps />
        <Resources />
        <Faq />
        <Cta />
      </main>

      <Footer />
    </div>
  );
}
