import { lazy, Suspense, useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SEOHead } from '@/components/SEOHead';
import { getSegment } from '@/config/landingSegments';
import { LpHeader } from '@/components/landing/v2/LpHeader';
import { LpHero } from '@/components/landing/v2/LpHero';
import { LpStats } from '@/components/landing/v2/LpStats';
import { LpPainPoints } from '@/components/landing/v2/LpPainPoints';
import { LpModules } from '@/components/landing/v2/LpModules';
import SocialProofNumbers from '@/components/marketing/SocialProofNumbers';
import { LpComparison } from '@/components/landing/v2/LpComparison';
import { LpTestimonials } from '@/components/landing/v2/LpTestimonials';
import { LpPricing } from '@/components/landing/v2/LpPricing';
import { LpFaq } from '@/components/landing/v2/LpFaq';
import { LpFinalCta } from '@/components/landing/v2/LpFinalCta';
import { LpFooter } from '@/components/landing/v2/LpFooter';
import '@/components/landing/v2/lp.css';

const LpDemo = lazy(() => import('@/components/landing/v2/LpDemo'));
const LpFeatures = lazy(() =>
  import('@/components/landing/v2/LpFeatures').then(m => ({ default: m.LpFeatures }))
);
const LpBlogPreview = lazy(() =>
  import('@/components/landing/v2/LpBlogPreview').then(m => ({ default: m.LpBlogPreview }))
);

const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Sofia+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,500;1,700&family=Sofia+Sans+Condensed:wght@500;600;700&display=swap';

function injectFontsOnce() {
  if (document.getElementById('lp-v2-fonts')) return;
  const pc1 = document.createElement('link');
  pc1.rel = 'preconnect';
  pc1.href = 'https://fonts.googleapis.com';
  document.head.appendChild(pc1);

  const pc2 = document.createElement('link');
  pc2.rel = 'preconnect';
  pc2.href = 'https://fonts.gstatic.com';
  pc2.crossOrigin = 'anonymous';
  document.head.appendChild(pc2);

  const link = document.createElement('link');
  link.id = 'lp-v2-fonts';
  link.rel = 'stylesheet';
  link.href = FONTS_HREF;
  document.head.appendChild(link);
}

function injectJsonLdOnce() {
  if (document.getElementById('lp-v2-jsonld')) return;
  const script = document.createElement('script');
  script.id = 'lp-v2-jsonld';
  script.type = 'application/ld+json';
  script.text = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Slotimob',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description:
      'Plataforma de gestão imobiliária para corretores e imobiliárias: CRM, financeiro, contratos, WhatsApp e IA em um único sistema.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'BRL',
      url: 'https://slotimob.com.br/',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '200',
    },
  });
  document.head.appendChild(script);
}

export default function LandingPage() {
  const { segment: segmentSlug } = useParams<{ segment?: string }>();
  const segment = getSegment(segmentSlug);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    injectFontsOnce();
    injectJsonLdOnce();
    document.documentElement.setAttribute('data-theme', 'light');
    return () => {
      const el = document.getElementById('lp-v2-jsonld');
      if (el) el.remove();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (cancelled) return;

      if (session?.user) {
        const checkoutPlan = searchParams.get('checkout_plan');

        if (checkoutPlan && ['essencial', 'pro', 'business'].includes(checkoutPlan)) {
          try {
            const { data, error } = await supabase.functions.invoke('create-checkout-session', {
              body: { plan_id: checkoutPlan }
            });

            if (!error && data?.url) {
              window.location.href = data.url;
            } else if (error) {
              console.error('Post-OAuth checkout error:', error);
              toast.error('Erro ao iniciar checkout. Tente novamente na página de planos.');
            }
          } catch (err) {
            console.error('Post-OAuth checkout error:', err);
          }

          navigate('/dashboard', { replace: true });
          return;
        }

        navigate('/dashboard', { replace: true });
      }
    };

    check();
    return () => { cancelled = true; };
  }, [navigate, searchParams]);

  return (
    <div data-lp="v2" className="overflow-x-hidden">
      <SEOHead
        title="Gestão imobiliária para corretores e imobiliárias"
        description="CRM, financeiro, contratos, WhatsApp e IA em um único sistema. Trial PRO de 7 dias, sem cartão. Para corretores autônomos e imobiliárias."
        path={segment.slug ? `/lp/${segment.slug}` : '/'}
      />
      <LpHeader />
      <main className="scroll-smooth">
        <LpHero />
        <Suspense fallback={<div style={{ minHeight: 200 }} aria-hidden />}>
          <LpDemo />
        </Suspense>
        <section className="py-12 md:py-16 bg-muted/30 border-y border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SocialProofNumbers />
          </div>
        </section>
        <LpPainPoints />
        <div style={{ background: 'var(--lp-bg-alt, #F3F2EE)' }}>
          <Suspense fallback={<div className="h-32" />}>
            <LpFeatures />
          </Suspense>
        </div>

        {/* Mid CTA 1 — após features */}
        <section className="py-14" style={{ background: 'var(--lp-ink)' }}>
          <div className="max-w-[1280px] mx-auto px-5 md:px-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <p className="lp-display text-[22px] md:text-[28px] leading-tight" style={{ color: '#fff' }}>
                Pronto para organizar seus imóveis de verdade?
              </p>
              <p className="mt-1 text-sm md:text-base" style={{ color: 'rgba(255,255,255,0.65)' }}>
                7 dias grátis · sem cartão de crédito · cancele quando quiser
              </p>
            </div>
            <a
              href="/checkout?plan=pro&trial=true"
              className="lp-btn lp-btn-primary shrink-0"
              style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}
            >
              começar grátis
            </a>
          </div>
        </section>

        <LpComparison />
        <div style={{ background: 'var(--lp-bg-alt, #F3F2EE)' }}>
          <LpTestimonials />
        </div>

        {/* Mid CTA 2 — após depoimentos */}
        <section className="py-14" style={{ borderTop: '1px solid var(--lp-line)', borderBottom: '1px solid var(--lp-line)' }}>
          <div className="max-w-[1280px] mx-auto px-5 md:px-10 text-center">
            <p className="lp-eyebrow mb-3">junte-se a eles</p>
            <p className="lp-display text-[26px] md:text-[36px] leading-tight mb-2" style={{ color: 'var(--lp-ink)' }}>
              Gestão profissional ao alcance de qualquer proprietário
            </p>
            <p className="mb-8 text-base" style={{ color: 'var(--lp-mute)' }}>
              Sem planilhas. Sem esquecimentos. Sem dor de cabeça.
            </p>
            <a
              href="/checkout?plan=pro&trial=true"
              className="lp-btn lp-btn-primary"
              style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}
            >
              testar 7 dias grátis
            </a>
          </div>
        </section>

        <LpStats />
        <LpModules />
        <Suspense fallback={<div className="h-32" />}>
          <LpBlogPreview />
        </Suspense>
        <LpPricing />
        <LpFaq />
        <LpFinalCta />
      </main>
      <LpFooter />
    </div>
  );
}
