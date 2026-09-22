import { MarketingHeader } from "./_components/header";
import { Hero } from "./_components/hero";
import { SocialProof } from "./_components/social-proof";
import { Comparison } from "./_components/comparison";
import { Features } from "./_components/features";
import { AppShowcase } from "./_components/app-showcase";
import { FinancePanel } from "./_components/finance-panel";
import { Testimonials } from "./_components/testimonials";
import { PrecoJusto } from "./_components/preco-justo";
import { Pricing } from "./_components/pricing";
import { FAQ } from "./_components/faq";
import { Garantia } from "./_components/garantia";
import { MarketingFooter } from "./_components/footer";

export default function HomePage() {
  return (
    <>
      <MarketingHeader />
      <main>
        <Hero />
        <SocialProof />
        <Comparison />
        <Features />
        <AppShowcase />
        <FinancePanel />
        <Testimonials />
        <Pricing />
        <PrecoJusto />
        <FAQ />
        <Garantia />
      </main>
      <MarketingFooter />
    </>
  );
}
