import { SEOHead } from '@/components/SEOHead';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { DemoSection } from '@/components/landing/DemoSection';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { CTASection } from '@/components/landing/CTASection';
import { FooterSection } from '@/components/landing/FooterSection';

export default function LandingPage() {
  return (
    <>
      <SEOHead 
        title="SLOTIMOB - A inteligência que sua imobiliária precisava"
        description="CRM, ERP e WhatsApp com IA integrados. Organize leads, imóveis e documentos. Comece grátis com 2 unidades e 14 dias de Pro."
        path="/"
      />
      <LandingHeader />
      <main className="min-h-screen scroll-smooth">
        <HeroSection />
        <FeaturesSection />
        <DemoSection />
        <TestimonialsSection />
        <PricingSection />
        <CTASection />
        <FooterSection />
      </main>
    </>
  );
}
