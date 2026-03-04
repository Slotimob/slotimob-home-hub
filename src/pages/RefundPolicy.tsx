import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import { LandingThemeProvider } from "@/components/LandingThemeProvider";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { FooterSection } from "@/components/landing/FooterSection";

export default function RefundPolicy() {
  const navigate = useNavigate();

  return (
    <LandingThemeProvider>
      <SEOHead
        title="Política de Cancelamento e Reembolso | SLOTIMOB"
        description="Conheça nossa política de cancelamento e reembolso em conformidade com o Código de Defesa do Consumidor."
        path="/refund-policy"
      />
      <LandingHeader />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="container max-w-4xl mx-auto px-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>

          <article className="prose prose-slate dark:prose-invert max-w-none">
            <h1>Política de Cancelamento e Reembolso</h1>

            <p>
              A SlotiMob tem o compromisso de garantir a satisfação e a transparência com todos os nossos usuários. Esta política foi elaborada em conformidade com o <strong>Código de Defesa do Consumidor (Lei nº 8.078/90)</strong> e aplica-se a todas as assinaturas e compras avulsas realizadas em nossa plataforma.
            </p>

            <h2>1. Direito de Arrependimento (Garantia de 7 Dias)</h2>
            <p>
              De acordo com o <strong>Artigo 49 do Código de Defesa do Consumidor</strong>, você tem o direito de se arrepender da contratação dos nossos serviços no prazo de até <strong>7 (sete) dias corridos</strong>, contados a partir da data de aprovação do seu primeiro pagamento.
            </p>
            <ul>
              <li>Caso você solicite o cancelamento dentro deste período, realizaremos o <strong>reembolso integral (100%)</strong> do valor pago.</li>
              <li>O direito de arrependimento é válido apenas para a <strong>primeira contratação</strong> do serviço (planos Essencial, PRO ou Business).</li>
            </ul>

            <h2>2. Cancelamento de Assinaturas (Após 7 Dias)</h2>
            <p>
              A SlotiMob funciona no modelo de <strong>assinatura pré-paga</strong> (mensal ou anual) <strong>sem fidelidade obrigatória</strong> (exceto em planos anuais específicos que prevejam multa).
            </p>
            <ul>
              <li>Você pode cancelar a renovação da sua assinatura a qualquer momento, diretamente no painel de configurações da sua conta (em <strong>"Plano e Assinatura" &gt; "Gerenciar Assinatura"</strong>).</li>
              <li>O cancelamento interrompe cobranças futuras, mas <strong>não gera reembolso proporcional</strong> por dias não utilizados no ciclo já pago. Você continuará tendo acesso aos recursos do seu plano até o último dia do seu ciclo de faturamento atual.</li>
            </ul>

            <h2>3. Compras Avulsas (Créditos de IA e Add-ons)</h2>
            <p>Para pacotes de Créditos de Inteligência Artificial ou expansão de limites (Add-ons):</p>
            <ul>
              <li>O reembolso integral em até 7 dias só será aplicável se os créditos ou limites <strong>não tiverem sido consumidos</strong>.</li>
              <li>Se você comprar um pacote de créditos de IA e utilizar parte deles dentro dos primeiros 7 dias, o valor da compra <strong>não será passível de reembolso</strong>, configurando a prestação imediata do serviço.</li>
            </ul>

            <h2>4. Como Solicitar o Reembolso</h2>
            <p>
              Para exercer seu direito de arrependimento dentro do prazo de 7 dias, envie um e-mail para{' '}
              <a href="mailto:contato@slotimob.com.br" className="text-primary hover:underline">
                contato@slotimob.com.br
              </a>{' '}
              informando o e-mail de cadastro da sua conta e o motivo da solicitação (o motivo é opcional, mas nos ajuda a melhorar).
            </p>
            <p>
              <strong>Não efetuamos reembolsos automáticos</strong> pelo cancelamento via painel. O estorno dentro da garantia deve ser expressamente solicitado ao nosso time de suporte.
            </p>

            <h2>5. Prazos de Processamento</h2>
            <p>
              Uma vez que o reembolso seja aprovado e processado pela nossa equipe, o estorno é repassado imediatamente para a operadora do seu cartão de crédito (via Stripe).
            </p>
            <p>
              O valor pode levar de <strong>5 a 10 dias úteis</strong> para aparecer na sua fatura, dependendo exclusivamente da operadora do seu cartão e da data de fechamento da fatura.
            </p>

            <hr />
            <p className="text-sm text-muted-foreground">Última atualização: Março/2026</p>
          </article>
        </div>
      </main>
      <FooterSection />
    </LandingThemeProvider>
  );
}
