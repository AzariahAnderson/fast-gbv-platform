import { Preloader } from "@/components/site/preloader";
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

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <Preloader />
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
    </div>
  );
}
