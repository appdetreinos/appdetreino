import { MarketingHeader } from "./_components/header";
import { Hero } from "./_components/hero";
import { SocialProof } from "./_components/social-proof";
import { Problem } from "./_components/problem";
import { Features } from "./_components/features";
import { Pricing } from "./_components/pricing";
import { FAQ } from "./_components/faq";
import { MarketingFooter } from "./_components/footer";

export default function HomePage() {
  return (
    <>
      <MarketingHeader />
      <main>
        <Hero />
        <SocialProof />
        <Problem />
        <Features />
        <Pricing />
        <FAQ />
      </main>
      <MarketingFooter />
    </>
  );
}