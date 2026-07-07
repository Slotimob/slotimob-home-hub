import { SEOHead } from '@/components/SEOHead';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { FooterSection } from '@/components/landing/FooterSection';
import { AsaasFinancialSeal } from '@/components/asaas/AsaasFinancialSeal';

export default function TermosDeUso() {
  return (
    <>
      <SEOHead
        title="Termos de Uso - Slotimob"
        description="Termos e condições de uso da plataforma Slotimob."
        path="/termos-de-uso"
      />
      <div className="min-h-screen bg-background">
        <LandingHeader />

        <main className="pt-24 pb-16">
          <article className="container mx-auto px-4 max-w-3xl prose prose-neutral dark:prose-invert">
            <header className="not-prose mb-10">
              <h1 className="text-4xl font-bold text-foreground mb-2">Termos de Uso</h1>
              <p className="text-sm text-muted-foreground">
                Última atualização: 21 de junho de 2025
              </p>
            </header>

            <h2>1. Definições</h2>
            <p>
              <strong>Plataforma:</strong> serviço Slotimob de gestão imobiliária acessível em
              slotimob.com.br. <strong>Usuário:</strong> pessoa física ou jurídica que cria conta na
              Plataforma. <strong>Dados:</strong> informações inseridas, geradas ou processadas pelo
              Usuário ao utilizar a Plataforma.
            </p>

            <h2>2. Aceitação dos Termos</h2>
            <p>
              Ao criar conta ou utilizar qualquer funcionalidade da Plataforma, o Usuário concorda
              integralmente com estes Termos. Caso não concorde, deve abster-se de usar o serviço.
            </p>

            <h2>3. Cadastro e Conta</h2>
            <p>
              O Usuário é responsável por fornecer informações verdadeiras, manter a confidencialidade
              de suas credenciais e por toda atividade realizada em sua conta. Contas inativas por
              período prolongado podem ser arquivadas mediante aviso prévio.
            </p>

            <h2>4. Planos e Pagamento</h2>
            <p>
              A Plataforma oferece planos pagos (Start, Pro e Business) com período de avaliação
              gratuita (trial) de 7 dias. Após o trial, é necessário um plano ativo para continuar
              usando as funcionalidades pagas. As cobranças são processadas pela <strong>Asaas</strong>,
              parceira de pagamento, e renovadas automaticamente conforme o ciclo escolhido (mensal
              ou anual). O cancelamento pode ser feito a qualquer momento; o acesso permanece até o
              fim do ciclo já pago.
            </p>

            <h2>5. Obrigações do Usuário</h2>
            <ul>
              <li>Utilizar a Plataforma de forma lícita e respeitando direitos de terceiros.</li>
              <li>Não compartilhar credenciais nem permitir uso por pessoas não autorizadas.</li>
              <li>
                Não realizar engenharia reversa, copiar funcionalidades ou tentar burlar limites de
                plano.
              </li>
              <li>Manter dados de pagamento e contato atualizados.</li>
            </ul>

            <h2>6. Propriedade Intelectual</h2>
            <p>
              Todo o software, marca, layout, textos e materiais da Plataforma são de titularidade
              exclusiva do Slotimob. Os Dados inseridos pelo Usuário permanecem de sua titularidade;
              concede-se ao Slotimob licença limitada para processá-los exclusivamente para
              prestação do serviço.
            </p>

            <h2>7. Limitação de Responsabilidade</h2>
            <p>
              A Plataforma é fornecida “como está”. O Slotimob não responde por lucros cessantes,
              indisponibilidades de terceiros (Asaas, WhatsApp, provedores de e-mail) ou por
              decisões tomadas pelo Usuário com base nas informações exibidas. A responsabilidade
              máxima do Slotimob limita-se ao valor pago pelo Usuário nos últimos 12 meses.
            </p>

            <h2>8. Proteção de Dados (LGPD)</h2>
            <p>
              O tratamento de dados pessoais segue a Lei nº 13.709/2018 (LGPD) e está detalhado na
              nossa <a href="/politica-de-privacidade">Política de Privacidade</a>. O Usuário pode
              solicitar acesso, correção ou exclusão de seus dados a qualquer momento.
            </p>

            <h2>9. Alterações dos Termos</h2>
            <p>
              O Slotimob pode atualizar estes Termos a qualquer tempo, comunicando alterações
              relevantes por e-mail ou dentro da Plataforma com no mínimo 15 dias de antecedência.
              O uso continuado após a vigência implica aceitação das novas condições.
            </p>

            <h2>10. Lei Aplicável e Foro</h2>
            <p>
              Estes Termos regem-se pelas leis da República Federativa do Brasil. Fica eleito o foro
              da Comarca de São Paulo/SP para dirimir quaisquer litígios decorrentes deste
              instrumento, com renúncia a qualquer outro, por mais privilegiado que seja.
            </p>

            <h2>11. Prestação de Serviços Financeiros</h2>
            <p>
              Os serviços financeiros e de pagamentos disponibilizados por meio da presente plataforma, incluindo abertura e manutenção de conta de pagamento, processamento de transações, emissão de boletos, transferências, pagamentos e demais movimentações de valores, são prestados pelo ASAAS GESTÃO FINANCEIRA INSTITUIÇÃO DE PAGAMENTOS S.A., instituição de pagamento autorizada a funcionar pelo Banco Central do Brasil.
            </p>
            <p>
              A Slotimob atua exclusivamente como integradora tecnológica e distribuidora da experiência do produto, não sendo instituição financeira ou de pagamento, nem realizando intermediação financeira em nome próprio.
            </p>
            <p>
              O cliente declara ciência de que o relacionamento financeiro/de pagamentos e a responsabilidade regulatória pelos serviços acima descritos são do ASAAS GESTÃO FINANCEIRA S.A., nos termos da regulamentação vigente.
            </p>
            <div className="mt-4">
              <AsaasFinancialSeal size="sm" />
            </div>
          </article>
        </main>

        <FooterSection />
      </div>
    </>
  );
}
