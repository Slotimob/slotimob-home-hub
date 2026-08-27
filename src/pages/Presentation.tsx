import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SEOHead } from '@/components/SEOHead';
import { SiteThemeProvider } from '@/components/SiteThemeProvider';
import { LpHeader } from '@/components/landing/v2/LpHeader';
import { LpFooter } from '@/components/landing/v2/LpFooter';
import '@/components/landing/v2/lp.css';
import { modules } from '@/components/presentation/TourModuleData';
import { TourModuleCard } from '@/components/presentation/TourModuleCard';

export default function Presentation() {
  const [activeId, setActiveId] = useState(modules[0].id);
  const activeModule = modules.find((m) => m.id === activeId) ?? modules[0];

  return (
    <SiteThemeProvider>
      <div data-lp="v2">
        <SEOHead
          title="Como funciona o Slotimob — veja cada módulo em 2 minutos"
          description="Boleto automático, reajuste IGPM/IPCA, DRE, DIMOB e WhatsApp de cobrança. Explore como o Slotimob organiza a gestão do seu aluguel sem imobiliária."
          path="/apresentacao"
          structuredData={[
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://slotimob.com.br/' },
                { '@type': 'ListItem', position: 2, name: 'Como Funciona', item: 'https://slotimob.com.br/apresentacao' },
              ],
            },
          ]}
        />
        <LpHeader />

        {/* Hero — fundo claro */}
        <section className="pt-28 pb-14 md:pt-36 md:pb-16" style={{ borderBottom: '1px solid var(--lp-line)' }}>
          <div className="max-w-[1280px] mx-auto px-5 md:px-10">
            <p className="lp-eyebrow mb-4">product tour</p>
            <h1 className="lp-display text-[40px] md:text-[72px] leading-none mb-5" style={{ color: 'var(--lp-ink)' }}>
              conheça cada<br />
              <em className="lp-serif" style={{ fontStyle: 'italic', color: 'var(--lp-accent)' }}>módulo</em> do Slotimob.
            </h1>
            <p className="text-[16px] md:text-[18px] max-w-[52ch] leading-relaxed" style={{ color: 'var(--lp-ink-soft)' }}>
              Explore todas as funcionalidades — do primeiro lead ao relatório final. Clique em um módulo no menu lateral para navegar.
            </p>
          </div>
        </section>

        {/* Layout sidebar + conteúdo */}
        <div className="max-w-[1280px] mx-auto px-5 md:px-10 py-12 md:py-16">
          <div className="flex flex-col md:flex-row gap-8 md:gap-12">

            {/* Sidebar esquerda — lista de módulos */}
            <aside className="md:w-56 shrink-0">
              <nav className="md:sticky md:top-24 flex flex-col gap-1">
                {modules.map((mod) => {
                  const Icon = mod.icon;
                  const isActive = mod.id === activeId;
                  return (
                    <button
                      key={mod.id}
                      onClick={() => setActiveId(mod.id)}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all duration-200 w-full"
                      style={{
                        background: isActive ? 'var(--lp-ink)' : 'transparent',
                        color: isActive ? '#fff' : 'var(--lp-ink-soft)',
                        fontWeight: isActive ? 500 : 400,
                        fontSize: 14,
                      }}
                    >
                      <Icon
                        className="h-4 w-4 shrink-0"
                        style={{ color: isActive ? 'var(--lp-accent)' : 'var(--lp-mute)' }}
                      />
                      {mod.label}
                    </button>
                  );
                })}
              </nav>
            </aside>

            {/* Conteúdo direito — módulo selecionado */}
            <main className="flex-1 min-w-0">
              <div
                key={activeModule.id}
                className="rounded-2xl border p-6 md:p-10"
                style={{ borderColor: 'var(--lp-line)', background: 'var(--lp-card, #fff)' }}
              >
                <TourModuleCard module={activeModule} index={0} />
              </div>
            </main>
          </div>
        </div>

        {/* CTA final */}
        <section className="py-16 md:py-20" style={{ background: 'var(--lp-ink)', borderTop: '1px solid var(--lp-line)' }}>
          <div className="max-w-[1280px] mx-auto px-5 md:px-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <p className="lp-display text-[22px] md:text-[32px] leading-tight" style={{ color: '#fff' }}>
                Pronto para começar com o Slotimob?
              </p>
              <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                7 dias grátis no plano Pro · sem cartão de crédito
              </p>
            </div>
            <Button
              asChild
              size="lg"
              className="shrink-0 rounded-full px-8 font-semibold"
              style={{ background: 'var(--lp-accent)', color: 'var(--lp-ink)' }}
            >
              <Link to="/checkout?plan=pro&trial=true">
                Começar Agora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>

        <LpFooter />
      </div>
    </SiteThemeProvider>
  );
}
