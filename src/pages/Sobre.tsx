import { Link } from 'react-router-dom';
import { Target, Compass, Zap, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SEOHead } from '@/components/SEOHead';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { FooterSection } from '@/components/landing/FooterSection';

const valores = [
  {
    icon: Compass,
    title: 'Autonomia',
    desc: 'Você é o dono. Nós somos a ferramenta.',
  },
  {
    icon: Zap,
    title: 'Automação',
    desc: 'O que é repetitivo deve ser automático.',
  },
  {
    icon: Eye,
    title: 'Transparência',
    desc: 'Sem letras miúdas. Preço claro, cancele quando quiser.',
  },
];

export default function Sobre() {
  return (
    <>
      <SEOHead
        title="Sobre o Slotimob"
        description="Quem está por trás do Slotimob — a plataforma de gestão de imóveis para quem gere sem imobiliária."
        path="/sobre"
      />
      <div className="min-h-screen bg-background">
        <LandingHeader />

        <main className="pt-24 pb-16">
          {/* Hero */}
          <section className="container mx-auto px-4 text-center max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Quem está por trás do Slotimob
            </h1>
            <p className="text-lg text-muted-foreground">
              Construímos uma ferramenta que gostaríamos de ter quando gerimos nossos próprios imóveis.
            </p>
          </section>

          {/* Missão */}
          <section className="mt-16 bg-muted/30 py-16">
            <div className="container mx-auto px-4 max-w-3xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-accent/10 text-accent">
                  <Target className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Nossa missão</h2>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Democratizar a gestão profissional de imóveis para quem gere de forma independente.
                Sem burocracia, sem comissão de imobiliária, sem planilha.
              </p>
            </div>
          </section>

          {/* Valores */}
          <section className="container mx-auto px-4 py-16 max-w-5xl">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
              No que acreditamos
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {valores.map((v) => (
                <div
                  key={v.title}
                  className="rounded-xl border border-border bg-card p-6 hover:border-accent/30 transition-colors"
                >
                  <div className="p-2 rounded-lg bg-accent/10 text-accent w-fit mb-4">
                    <v.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{v.title}</h3>
                  <p className="text-sm text-muted-foreground">{v.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Origem */}
          <section className="bg-muted/30 py-16">
            <div className="container mx-auto px-4 max-w-3xl">
              <h2 className="text-2xl font-bold text-foreground mb-6">Como nasceu o Slotimob</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                O Slotimob nasceu da frustração de um proprietário que gerenciava 4 imóveis em planilha,
                cobrava aluguel pelo WhatsApp pessoal e perdia meses de reajuste por esquecimento.
                Decidimos construir a solução que queríamos usar.
              </p>
            </div>
          </section>

          {/* CTA */}
          <section className="container mx-auto px-4 py-16 text-center max-w-2xl">
            <h2 className="text-3xl font-bold text-foreground mb-4">Pronto para automatizar?</h2>
            <Button
              asChild
              size="lg"
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
            >
              <Link to="/checkout?plan=pro">Testar 7 dias grátis</Link>
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              Sem cartão · 7 dias de PRO grátis
            </p>
          </section>
        </main>

        <FooterSection />
      </div>
    </>
  );
}
