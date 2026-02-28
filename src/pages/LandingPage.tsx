import { useParams } from 'react-router-dom';
import { SEOHead } from '@/components/SEOHead';
import { LandingThemeProvider } from '@/components/LandingThemeProvider';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { HeroSection } from '@/components/landing/HeroSection';
import { CrmProductTour } from '@/components/landing/CrmProductTour';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { DemoSection } from '@/components/landing/DemoSection';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { CTASection } from '@/components/landing/CTASection';
import { FooterSection } from '@/components/landing/FooterSection';
import { getSegment } from '@/config/landingSegments';

export default function LandingPage() {
  const { segment: segmentSlug } = useParams<{ segment?: string }>();
  const segment = getSegment(segmentSlug);

  return (
    <LandingThemeProvider>
      <SEOHead
        title={segment.seo.title}
        description={segment.seo.description}
        path={segment.slug ? `/lp/${segment.slug}` : '/'}
      />
      <LandingHeader />
      <main className="min-h-screen scroll-smooth bg-background">
        <HeroSection segment={segment} />
        <CrmProductTour />
        <FeaturesSection />
        <DemoSection />
        <TestimonialsSection />
        <PricingSection />
        <CTASection utmSource={segment.utmSource} />
        <FooterSection />
      </main>
    </LandingThemeProvider>
  );
}
