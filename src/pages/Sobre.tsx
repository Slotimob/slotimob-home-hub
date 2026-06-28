import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Target, Shield, Users, MessageCircle, MapPin, Calendar, Home } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { LpHeader } from '@/components/landing/v2/LpHeader';
import { LpFooter } from '@/components/landing/v2/LpFooter';
import { LpPricing } from '@/components/landing/v2/LpPricing';
import '@/components/landing/v2/lp.css';

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

export default function Sobre() {
  useEffect(() => {
    injectFontsOnce();
    document.documentElement.setAttribute('data-theme', 'light');
  }, []);

  return (
    <>
      <SEOHead
        title="Sobre a Slotimob — gestão de aluguel para proprietários"
        description="Conheça a Slotimob: empresa curitibana fundada em 2026 para automatizar a gestão de aluguel de proprietários de imóveis. Missão, valores e planos."
        path="/sobre"
        structuredData={[
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Início', item: 'https://slotimob.com.br' },
              { '@type': 'ListItem', position: 2, name: 'Sobre', item: 'https://slotimob.com.br/sobre' },
            ],
          },
        ]}
      />

      <div data-lp="v2" className="min-h-screen overflow-x-hidden">
        <LpHeader />

        {/* ── HERO ────────────────────────────────────────────── */}
        <section className="lp-dark pt-32 pb-16">
          <div className="max-w-[1280px] mx-auto px-5 md:px-10 text-center">
            <p className="lp-eyebrow mb-5">sobre a slotimob</p>
            <h1
              className="lp-display text-4xl md:text-5xl lg:text-6xl mb-6 max-w-3xl mx-auto leading-tight"
              style={{ color: 'var(--lp-bg)' }}
            >
              Construímos o Slotimob porque somos proprietários também
            </h1>
            <p className="text-lg max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.72)' }}>
              Nascido em Curitiba em 2026. Fundado por quem viveu na pele o caos de gerenciar aluguel sem ferramenta adequada.
            </p>
          </div>
        </section>

        {/* ── HISTÓRIA ────────────────────────────────────────── */}
        <section className="py-16 bg-background">
          <div className="max-w-3xl mx-auto px-5 md:px-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
                <Calendar className="h-6 w-6" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Nossa história</h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed">
              A Slotimob nasceu em 2026 em Curitiba, Paraná, de uma frustração real: gerenciar aluguéis sem uma ferramenta decente. Planilhas quebravam, boletos saíam errados, reajustes eram esquecidos. Decidimos resolver isso para nós — e para todo proprietário que passa pelo mesmo.
            </p>
          </div>
        </section>

        {/* ── MISSÃO + PARA QUEM ─────────────────────────────── */}
        <section className="py-16 bg-muted/30">
          <div className="max-w-[1280px] mx-auto px-5 md:px-10">
            <div className="grid md:grid-cols-2 gap-12 lg:gap-20">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
                    <Target className="h-6 w-6" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">Nossa missão</h2>
                </div>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  Dar ao proprietário de imóvel o mesmo controle financeiro que uma imobiliária oferece — mas sem pagar comissão e sem abrir mão da autonomia. Boleto no dia certo, reajuste aplicado sozinho, relatório de IR pronto quando a Receita Federal chamar.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
                    <Users className="h-6 w-6" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">Para quem construímos</h2>
                </div>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  Para o dono de 1, 3 ou 10 imóveis que aluga diretamente. Para quem está cansado de perder o reajuste por esquecer a data e de passar horas em março juntando comprovantes para o IR. O Slotimob não é para imobiliárias — é para você.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── NÚMEROS ─────────────────────────────────────────── */}
        <section className="py-16 bg-background">
          <div className="max-w-[1280px] mx-auto px-5 md:px-10">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-12 text-center">
              Slotimob em números
            </h2>
            <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="rounded-2xl border border-border bg-card p-8 text-center">
                <div className="p-3 rounded-xl bg-accent/10 text-accent w-fit mx-auto mb-5">
                  <Calendar className="h-6 w-6" />
                </div>
                <p className="text-3xl font-bold text-foreground mb-2">2026</p>
                <p className="text-sm text-muted-foreground">Fundada em Curitiba, PR</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-8 text-center">
                <div className="p-3 rounded-xl bg-accent/10 text-accent w-fit mx-auto mb-5">
                  <MapPin className="h-6 w-6" />
                </div>
                <p className="text-3xl font-bold text-foreground mb-2">Curitiba</p>
                <p className="text-sm text-muted-foreground">Sede no Paraná, Brasil</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-8 text-center">
                <div className="p-3 rounded-xl bg-accent/10 text-accent w-fit mx-auto mb-5">
                  <Home className="h-6 w-6" />
                </div>
                <p className="text-3xl font-bold text-foreground mb-2">Plano Start</p>
                <p className="text-sm text-muted-foreground">100% gratuito para até 5 imóveis</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── TECNOLOGIA E SEGURANÇA ──────────────────────────── */}
        <section className="py-16 bg-muted/30">
          <div className="max-w-3xl mx-auto px-5 md:px-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
                <Shield className="h-6 w-6" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Tecnologia e segurança</h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Seus dados ficam em servidores AWS em São Paulo, com criptografia em trânsito e em repouso. A Slotimob segue a LGPD — nenhum dado é compartilhado com terceiros sem sua autorização. Pagamentos processados via Asaas, fintech regulamentada pelo Banco Central.
            </p>
          </div>
        </section>

        {/* ── PLANOS (idêntico ao da homepage) ───────────────── */}
        <LpPricing />

        {/* ── FALE COM A GENTE (WhatsApp) ─────────────────────── */}
        <section className="lp-dark py-16">
          <div className="max-w-[1280px] mx-auto px-5 md:px-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <MessageCircle className="h-8 w-8 text-green-400" />
            </div>
            <h2
              className="lp-display text-3xl md:text-4xl mb-4"
              style={{ color: 'var(--lp-bg)' }}
            >
              Fale com a gente
            </h2>
            <p className="text-lg mb-10 max-w-lg mx-auto" style={{ color: 'rgba(255,255,255,0.72)' }}>
              Tem dúvidas? Prefere conversar antes de criar sua conta? Estamos no WhatsApp — resposta em minutos.
            </p>
            <a
              href="https://wa.me/5511999999999"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 bg-green-500 hover:bg-green-600 text-white font-semibold px-8 py-4 rounded-xl text-base transition-colors"
            >
              <MessageCircle className="h-5 w-5" />
              Fale com a gente no WhatsApp
            </a>
            <p className="mt-8 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Ou por e-mail:{' '}
              <a
                href="mailto:contato@slotimob.com.br"
                className="hover:underline"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
                contato@slotimob.com.br
              </a>
            </p>
          </div>
        </section>

        <LpFooter />
      </div>
    </>
  );
}
