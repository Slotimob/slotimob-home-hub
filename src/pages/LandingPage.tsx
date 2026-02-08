import { SEOHead } from '@/components/SEOHead';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { CTASection } from '@/components/landing/CTASection';
import { FooterSection } from '@/components/landing/FooterSection';

export default function LandingPage() {
  return (
    <>
      <SEOHead 
        title="SLOTIMOB - Gestão Imobiliária Inteligente"
        description="Sistema completo para corretores de imóveis. Organize leads, imóveis e documentos. Feche mais vendas com menos esforço. Experimente grátis por 14 dias."
        path="/"
      />
      <LandingHeader />
      <main className="min-h-screen">
        <HeroSection />
        <FeaturesSection />
        <TestimonialsSection />
        <PricingSection />
        <CTASection />
        <FooterSection />
      </main>
    </>
  );
}
