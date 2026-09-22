import { MarketingHeader } from "./_components/header";
import { Hero } from "./_components/hero";
import { SocialProof } from "./_components/social-proof";
import { Problem } from "./_components/problem";
import { Comparison } from "./_components/comparison";
import { Features } from "./_components/features";
import { AppShowcase } from "./_components/app-showcase";
import { FinancePanel } from "./_components/finance-panel";
import { Testimonials } from "./_components/testimonials";
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
        <Comparison />
        <Features />
        <AppShowcase />
        <FinancePanel />
        <Testimonials />
        <Pricing />
        <FAQ />
      </main>
      <MarketingFooter />
    </>
  );
}
