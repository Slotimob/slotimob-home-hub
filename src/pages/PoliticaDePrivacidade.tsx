import { SEOHead } from '@/components/SEOHead';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { FooterSection } from '@/components/landing/FooterSection';

export default function PoliticaDePrivacidade() {
  return (
    <>
      <SEOHead
        title="Política de Privacidade - Slotimob"
        description="Como o Slotimob coleta, usa e protege seus dados pessoais conforme a LGPD."
        path="/politica-de-privacidade"
      />
      <div className="min-h-screen bg-background">
        <LandingHeader />

        <main className="pt-24 pb-16">
          <article className="container mx-auto px-4 max-w-3xl prose prose-neutral dark:prose-invert">
            <header className="not-prose mb-10">
              <h1 className="text-4xl font-bold text-foreground mb-2">Política de Privacidade</h1>
              <p className="text-sm text-muted-foreground">
                Última atualização: 21 de junho de 2025
              </p>
            </header>

            <h2>1. Controlador dos Dados</h2>
            <p>
              <strong>Slotimob</strong> — CNPJ 00.000.000/0001-00, com sede em São Paulo/SP, é o
              controlador dos dados pessoais tratados na Plataforma, conforme art. 5º, VI da LGPD.
            </p>

            <h2>2. Dados que coletamos</h2>
            <ul>
              <li>
                <strong>Cadastro:</strong> nome completo, e-mail, telefone, CPF ou CNPJ.
              </li>
              <li>
                <strong>Dados de imóveis e contatos:</strong> informações que você insere sobre suas
                unidades, locatários, proprietários, contratos e financeiro.
              </li>
              <li>
                <strong>Dados de pagamento:</strong> processados diretamente pela Asaas. Não
                armazenamos dados completos de cartão.
              </li>
              <li>
                <strong>Dados de uso:</strong> logs de acesso, IP, navegador, páginas visitadas para
                fins de segurança e melhoria do produto.
              </li>
            </ul>

            <h2>3. Como usamos os dados</h2>
            <ul>
              <li>Prestar o serviço contratado (gestão, cobranças, contratos, WhatsApp).</li>
              <li>Processar pagamentos e emitir notas fiscais via parceiros.</li>
              <li>Enviar comunicações transacionais e, com consentimento, novidades do produto.</li>
              <li>Atender obrigações legais, fiscais e regulatórias.</li>
            </ul>

            <h2>4. Compartilhamento</h2>
            <p>
              Não vendemos dados. Compartilhamos apenas com operadores essenciais à prestação do
              serviço:
            </p>
            <ul>
              <li>
                <strong>Asaas</strong> — processamento de pagamentos e emissão de boletos/PIX.
              </li>
              <li>
                <strong>Supabase / AWS</strong> — hospedagem, banco de dados e armazenamento de
                arquivos.
              </li>
              <li>
                <strong>Provedores de e-mail e WhatsApp</strong> — entrega de mensagens iniciadas
                pelo Usuário.
              </li>
            </ul>

            <h2>5. Retenção e exclusão</h2>
            <p>
              Mantemos os dados enquanto a conta estiver ativa e por até 5 anos após o cancelamento
              para cumprimento de obrigações fiscais e defesa em eventual processo. O Usuário pode
              solicitar exclusão antecipada, salvo nas hipóteses legais de retenção obrigatória.
            </p>

            <h2>6. Direitos do Titular</h2>
            <p>Conforme art. 18 da LGPD, você pode a qualquer momento solicitar:</p>
            <ul>
              <li>Confirmação da existência de tratamento;</li>
              <li>Acesso aos dados;</li>
              <li>Correção de dados incompletos ou desatualizados;</li>
              <li>Anonimização, bloqueio ou eliminação;</li>
              <li>Portabilidade;</li>
              <li>Revogação do consentimento.</li>
            </ul>

            <h2>7. Segurança</h2>
            <p>
              Aplicamos criptografia em trânsito (HTTPS/TLS) e em repouso, controle de acesso por
              papéis, RLS no banco de dados e auditoria de operações sensíveis. Apesar dos esforços,
              nenhum sistema é 100% imune; incidentes serão comunicados conforme exigido pela LGPD.
            </p>

            <h2>8. Cookies e rastreamento</h2>
            <p>
              Utilizamos cookies essenciais (sessão, preferências) e analíticos (uso agregado).
              Pixels de marketing são acionados apenas com consentimento. Você pode gerenciar
              cookies nas configurações do navegador.
            </p>

            <h2>9. Encarregado (DPO)</h2>
            <p>
              Dúvidas, solicitações de direitos ou denúncias podem ser enviadas para:{' '}
              <a href="mailto:privacidade@slotimob.com.br">privacidade@slotimob.com.br</a>.
            </p>

            <h2>10. Alterações nesta Política</h2>
            <p>
              Esta Política pode ser atualizada periodicamente. Alterações materiais serão
              comunicadas por e-mail ou aviso na Plataforma com antecedência mínima de 15 dias.
            </p>
          </article>
        </main>

        <FooterSection />
      </div>
    </>
  );
}
