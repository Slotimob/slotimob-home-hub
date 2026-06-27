import { Link } from 'react-router-dom';
import { Target, Shield, Users, Mail, MapPin, Calendar, Home, Landmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SEOHead } from '@/components/SEOHead';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { FooterSection } from '@/components/landing/FooterSection';

export default function Sobre() {
  return (
    <>
      <SEOHead
        title="Sobre a Slotimob — gestão de aluguel para proprietários"
        description="Conheça a Slotimob: empresa curitibana fundada em 2024 para automatizar a gestão de aluguel de proprietários de imóveis. Missão, time e valores."
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
      <div className="min-h-screen bg-background">
        <LandingHeader />

        <main className="pt-24 pb-16">
          {/* Sobre a Slotimob */}
          <section className="container mx-auto px-4 max-w-3xl">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Construímos o Slotimob porque somos proprietários também
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              A Slotimob nasceu em 2024 em Curitiba, Paraná, de uma frustração real: gerenciar aluguéis sem uma ferramenta decente. Planilhas quebravam, boletos saíam errados, reajustes eram esquecidos. Decidimos resolver isso para nós — e para todo proprietário que passa pelo mesmo.
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
                Dar ao proprietário de imóvel o mesmo controle financeiro que uma imobiliária oferece ao inquilino — mas sem pagar comissão e sem abrir mão da autonomia. Boleto no dia certo, reajuste aplicado sozinho, relatório de IR pronto quando a Receita Federal chamar.
              </p>
            </div>
          </section>

          {/* Para quem construímos */}
          <section className="container mx-auto px-4 py-16 max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-accent/10 text-accent">
                <Users className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Para quem construímos o Slotimob</h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Para o dono de 1, 3 ou 10 imóveis que aluga diretamente. Para quem está cansado de ligar para o banco, de perder o reajuste por esquecer a data e de passar horas em março juntando comprovantes para o IR. O Slotimob não é para imobiliárias — é para você.
            </p>
          </section>

          {/* Números */}
          <section className="bg-muted/30 py-16">
            <div className="container mx-auto px-4 max-w-5xl">
              <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
                Slotimob em números
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="rounded-xl border border-border bg-card p-6 text-center">
                  <div className="p-2 rounded-lg bg-accent/10 text-accent w-fit mx-auto mb-4">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <p className="text-2xl font-bold text-foreground mb-1">2024</p>
                  <p className="text-sm text-muted-foreground">Fundada em Curitiba, PR</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-6 text-center">
                  <div className="p-2 rounded-lg bg-accent/10 text-accent w-fit mx-auto mb-4">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <p className="text-2xl font-bold text-foreground mb-1">Curitiba</p>
                  <p className="text-sm text-muted-foreground">Sede no Paraná, Brasil</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-6 text-center">
                  <div className="p-2 rounded-lg bg-accent/10 text-accent w-fit mx-auto mb-4">
                    <Home className="h-5 w-5" />
                  </div>
                  <p className="text-2xl font-bold text-foreground mb-1">Plano Start</p>
                  <p className="text-sm text-muted-foreground">100% gratuito para até 5 imóveis</p>
                </div>
              </div>
            </div>
          </section>

          {/* Tecnologia e segurança */}
          <section className="container mx-auto px-4 py-16 max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-accent/10 text-accent">
                <Shield className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Tecnologia e segurança</h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Seus dados ficam em servidores AWS em São Paulo, com criptografia em trânsito e em repouso. A Slotimob segue a LGPD — nenhum dado é compartilhado com terceiros sem sua autorização. Pagamentos processados via Asaas, fintech regulamentada pelo Banco Central.
            </p>
          </section>

          {/* Contato */}
          <section className="bg-muted/30 py-16">
            <div className="container mx-auto px-4 max-w-3xl text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-accent/10 text-accent">
                  <Mail className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Fale com a gente</h2>
              </div>
              <p className="text-lg text-muted-foreground mb-6">
                Tem dúvidas ou quer saber mais? Envie um e-mail para{' '}
                <a
                  href="mailto:contato@slotimob.com.br"
                  className="text-accent hover:underline font-medium"
                >
                  contato@slotimob.com.br
                </a>
                .
              </p>
              <Button
                asChild
                variant="outline"
                className="border-accent text-accent hover:bg-accent/10"
              >
                <Link to="/contato">Ir para a página de contato</Link>
              </Button>
            </div>
          </section>
        </main>

        <FooterSection />
      </div>
    </>
  );
}
