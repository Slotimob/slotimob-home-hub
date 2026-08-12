import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, FileText, ArrowLeft, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import { AsaasFinancialSeal, AsaasTransparencyNote } from "@/components/asaas/AsaasFinancialSeal";

type TabValue = "privacy" | "terms" | "refund";

const Legal = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const currentTab: TabValue =
    rawTab === "terms" || rawTab === "refund" ? rawTab : "privacy";
  const companyName = "SLOTI";
  const cnpj = "42.323.823/0001-06";
  const appName = "SLOTIMOB";
  const contactEmail = "contato@slotimob.com.br";
  const lastUpdate = "12 de agosto de 2026";

  const handleTabChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", value);
    setSearchParams(next, { replace: true });
  };

  return (
    <>
      <SEOHead
        title="Documentos Legais | Privacidade, Termos e Reembolso"
        description="Política de privacidade, termos de uso e política de reembolso do SLOTIMOB - Sistema de gestão imobiliária"
        path="/legal"
      />
      <div className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto py-8 px-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Documentos Legais
            </h1>
            <p className="text-muted-foreground">
              {companyName} - CNPJ: {cnpj}
            </p>
          </div>

          <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 h-auto">
              <TabsTrigger value="privacy" className="gap-1 sm:gap-2 text-xs sm:text-sm whitespace-normal py-2">
                <Shield className="h-4 w-4 shrink-0" />
                <span>Privacidade</span>
              </TabsTrigger>
              <TabsTrigger value="terms" className="gap-1 sm:gap-2 text-xs sm:text-sm whitespace-normal py-2">
                <FileText className="h-4 w-4 shrink-0" />
                <span>Termos de Uso</span>
              </TabsTrigger>
              <TabsTrigger value="refund" className="gap-1 sm:gap-2 text-xs sm:text-sm whitespace-normal py-2">
                <Receipt className="h-4 w-4 shrink-0" />
                <span>Reembolso</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="privacy">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Política de Privacidade
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Última atualização: {lastUpdate}
                  </p>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-6 text-sm leading-relaxed">
                      <section>
                        <h2 className="text-lg font-semibold mb-3">1. Introdução</h2>
                        <p className="text-muted-foreground">
                          A {companyName}, inscrita no CNPJ sob o nº {cnpj}, é a responsável pelo tratamento dos dados pessoais coletados através do aplicativo {appName}. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
                        </p>
                      </section>

                      <section>
                        <h2 className="text-lg font-semibold mb-3">2. Dados Coletados</h2>
                        <p className="text-muted-foreground mb-2">
                          Coletamos os seguintes tipos de dados pessoais:
                        </p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                          <li>Dados de identificação: nome completo, e-mail, telefone</li>
                          <li>Dados profissionais: CRECI, informações de corretagem</li>
                          <li>Dados de leads e clientes: informações fornecidas por você sobre seus clientes</li>
                          <li>Dados de uso: interações com o aplicativo, logs de acesso</li>
                          <li>Dados de imóveis: informações sobre propriedades e unidades cadastradas</li>
                          <li>Dados de comunicação: mensagens trocadas via WhatsApp integrado</li>
                        </ul>
                        <h3 className="text-base font-semibold mt-4 mb-2">2.1. Dados de Navegação e Publicidade (Visitantes do Site)</h3>
                        <p className="text-muted-foreground">
                          Além dos dados fornecidos por clientes cadastrados, ao visitar nosso site — mesmo sem se cadastrar — podemos coletar, mediante consentimento quando exigido pela LGPD: endereço IP, identificadores de cookies e dispositivo, tipo de navegador, páginas visitadas, tempo de permanência, origem do acesso (ex: rede social, busca orgânica, anúncio) e interações com campanhas publicitárias, por meio das ferramentas de terceiros descritas na seção sobre Compartilhamento de Dados.
                        </p>
                      </section>

                      <section>
                        <h2 className="text-lg font-semibold mb-3">3. Finalidade do Tratamento</h2>
                        <p className="text-muted-foreground mb-2">
                          Seus dados são tratados para as seguintes finalidades:
                        </p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                          <li>Prestação dos serviços de CRM imobiliário</li>
                          <li>Gerenciamento de leads e pipeline de vendas</li>
                          <li>Agendamento e controle de visitas</li>
                          <li>Comunicação via WhatsApp com clientes</li>
                          <li>Geração de relatórios e simulações</li>
                          <li>Melhoria contínua dos serviços oferecidos</li>
                          <li>Cumprimento de obrigações legais e regulatórias</li>
                        </ul>
                      </section>

                      <section>
                        <h2 className="text-lg font-semibold mb-3">4. Base Legal</h2>
                        <p className="text-muted-foreground">
                          O tratamento de dados pessoais é realizado com base no consentimento do titular, na execução de contrato, no cumprimento de obrigação legal e no legítimo interesse da {companyName}, conforme aplicável a cada situação específica.
                        </p>
                      </section>

                      <section>
                        <h2 className="text-lg font-semibold mb-3">5. Compartilhamento de Dados</h2>
                        <p className="text-muted-foreground mb-2">
                          Seus dados podem ser compartilhados com:
                        </p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                          <li>Prestadores de serviços de infraestrutura e hospedagem (Supabase/Google Cloud Platform)</li>
                          <li>Serviços de integração de WhatsApp (Evolution API) para envio de notificações e mensagens automatizadas</li>
                          <li>Asaas Gestão Financeira Instituição de Pagamentos S.A. (processamento de pagamentos, emissão de cobranças e serviços financeiros regulados)</li>
                          <li>Serviços de envio de e-mail transacional (Resend)</li>
                          <li>Google Analytics (Google LLC) — mensuração de audiência e comportamento de navegação no site, mediante consentimento coletado no banner de cookies. Política de privacidade:{" "}
                            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://policies.google.com/privacy</a>
                          </li>
                          <li>Google Ads (Google LLC) — mensuração de conversões e campanhas de remarketing, mediante consentimento.</li>
                          <li>Meta Ads / Meta Pixel (Meta Platforms, Inc.) — mensuração de conversões e campanhas de remarketing em Facebook e Instagram, mediante consentimento. Política de privacidade:{" "}
                            <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://www.facebook.com/privacy/policy/</a>
                          </li>
                          <li>Autoridades competentes, quando exigido por lei</li>
                        </ul>
                        <p className="text-muted-foreground mt-2">
                          Não vendemos ou comercializamos seus dados pessoais a terceiros.
                        </p>
                        <div className="mt-4 rounded-lg border border-border bg-muted/40 p-4">
                          <h3 className="text-base font-semibold mb-2">Cookies de Analytics e Publicidade (Google e Meta)</h3>
                          <p className="text-muted-foreground">
                            Utilizamos Google Analytics, Google Ads e Meta Ads (Meta Pixel) para entender como os visitantes utilizam nosso site e mensurar o desempenho de campanhas publicitárias. Essas ferramentas podem coletar dados como endereço IP, identificadores de cookie, tipo de dispositivo/navegador, páginas visitadas e ações realizadas no site.
                          </p>
                          <p className="text-muted-foreground mt-3">
                            O tratamento desses dados tem como base legal o seu consentimento, coletado através do banner de cookies exibido no primeiro acesso ao site (ver seção Cookies). Você pode revogar esse consentimento a qualquer momento pelo link "Preferências de Cookies" no rodapé do site.
                          </p>
                          <p className="text-muted-foreground mt-3">
                            Google e Meta atuam como operadores de dados nos termos da LGPD. Para gerenciar suas preferências de anúncios diretamente com eles:{" "}
                            <a href="https://myadcenter.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google</a>{" "}e{" "}
                            <a href="https://www.facebook.com/adpreferences/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Meta</a>.
                          </p>
                        </div>
                      </section>

                      <section>
                        <h2 className="text-lg font-semibold mb-3">5.1. Armazenamento e Infraestrutura</h2>
                        <p className="text-muted-foreground">
                          Seus dados são armazenados em servidores gerenciados pelo Supabase, hospedados na infraestrutura do Google Cloud Platform (GCP), em conformidade com as normas internacionais de segurança da informação (ISO 27001, SOC 2 Type II). Os dados podem ser processados em data centers localizados nos Estados Unidos, conforme permitido pela LGPD mediante a adoção de cláusulas contratuais padrão e garantias adequadas de proteção.
                        </p>
                      </section>

                      <section>
                        <h2 className="text-lg font-semibold mb-3">5.2. Automação de Mensagens via WhatsApp</h2>
                        <p className="text-muted-foreground">
                          Ao utilizar a funcionalidade de integração com WhatsApp, o usuário autoriza expressamente o envio de notificações, lembretes de visitas, cobranças e mensagens automatizadas aos seus leads e clientes através da API do WhatsApp. O usuário é o responsável por garantir que possui o consentimento adequado dos destinatários para o recebimento dessas comunicações, conforme exigido pela LGPD e pelos termos de uso do WhatsApp.
                        </p>
                      </section>

                      <section>
                        <h2 className="text-lg font-semibold mb-3">5.3. Dados Fiscais (CPF/CNPJ)</h2>
                        <p className="text-muted-foreground">
                          O usuário declara e garante a veracidade dos dados fiscais fornecidos (CPF ou CNPJ) no momento do cadastro. Esses dados são utilizados exclusivamente para fins de identificação, faturamento, emissão de notas fiscais e cumprimento de obrigações legais e tributárias. A falsidade nas informações prestadas pode acarretar a suspensão ou cancelamento da conta, sem prejuízo das medidas legais cabíveis.
                        </p>
                      </section>

                      <section>
                        <h2 className="text-lg font-semibold mb-3">5.4. Dados Compartilhados com o Asaas</h2>
                        <p className="text-muted-foreground">
                          Para viabilizar o checkout da assinatura da plataforma e a emissão de cobranças de aluguel, são compartilhados com o ASAAS GESTÃO FINANCEIRA INSTITUIÇÃO DE PAGAMENTOS S.A. os dados cadastrais e fiscais do usuário (nome/razão social, CPF/CNPJ, e-mail, telefone e endereço) e, quando o usuário emite cobranças por meio da plataforma, os dados dos seus inquilinos (nome, CPF/CNPJ, e-mail e telefone). O Asaas atua na qualidade de instituição de pagamento responsável pelos serviços financeiros, nos termos da Resolução Conjunta nº 16/2025 do Banco Central do Brasil. O usuário é responsável por garantir base legal adequada, nos termos da LGPD, para o compartilhamento dos dados pessoais de seus inquilinos com o Asaas.
                        </p>
                      </section>

                      <section>
                        <h2 className="text-lg font-semibold mb-3">6. Segurança dos Dados</h2>
                        <p className="text-muted-foreground">
                          Implementamos medidas técnicas e organizacionais adequadas para proteger seus dados pessoais contra acesso não autorizado, alteração, divulgação ou destruição. Isso inclui criptografia, controle de acesso, backups regulares e monitoramento contínuo de segurança.
                        </p>
                      </section>

                      <section>
                        <h2 className="text-lg font-semibold mb-3">7. Retenção de Dados</h2>
                        <p className="text-muted-foreground">
                          Seus dados pessoais serão mantidos enquanto sua conta estiver ativa ou conforme necessário para fornecer os serviços. Após o encerramento da conta, os dados serão retidos pelo período exigido por lei ou para fins de auditoria.
                        </p>
                      </section>

                      <section>
                        <h2 className="text-lg font-semibold mb-3">8. Seus Direitos</h2>
                        <p className="text-muted-foreground mb-2">
                          Você tem os seguintes direitos em relação aos seus dados pessoais:
                        </p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                          <li>Confirmação da existência de tratamento</li>
                          <li>Acesso aos dados</li>
                          <li>Correção de dados incompletos ou desatualizados</li>
                          <li>Anonimização, bloqueio ou eliminação de dados desnecessários</li>
                          <li>Portabilidade dos dados</li>
                          <li>Eliminação dos dados tratados com consentimento</li>
                          <li>Revogação do consentimento</li>
                        </ul>
                        <p className="text-muted-foreground mt-3">
                          Caso entenda que seus direitos não foram atendidos adequadamente por nós, você também pode apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD):{" "}
                          <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://www.gov.br/anpd</a>.
                        </p>
                      </section>

                      <section>
                        <h2 className="text-lg font-semibold mb-3">9. Cookies</h2>
                        <p className="text-muted-foreground">
                          Utilizamos cookies e tecnologias similares (como pixels e armazenamento local do navegador) para viabilizar o funcionamento do site, entender como você o utiliza e, quando você consentir, personalizar anúncios. Classificamos os cookies utilizados nas seguintes categorias:
                        </p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mt-3">
                          <li><strong>Cookies Necessários:</strong> essenciais para o funcionamento do site (ex.: manter sua sessão ativa, lembrar sua escolha de cookies). Não podem ser desativados, pois são indispensáveis à prestação do serviço solicitado por você (LGPD, art. 7º, inciso IV).</li>
                          <li><strong>Cookies de Analytics:</strong> utilizados pelo Google Analytics para entender como os visitantes navegam pelo site (páginas mais acessadas, tempo de permanência, origem do tráfego). Dependem do seu consentimento prévio.</li>
                          <li><strong>Cookies de Publicidade/Marketing:</strong> utilizados pelo Google Ads e Meta Ads (Meta Pixel) para mensurar o desempenho de campanhas e, quando autorizado, exibir anúncios mais relevantes em outros sites e redes sociais (remarketing). Dependem do seu consentimento prévio.</li>
                        </ul>
                        <p className="text-muted-foreground mt-3">
                          Ao acessar o site pela primeira vez, um banner de cookies permite aceitar todos os cookies, rejeitar os não essenciais, ou personalizar sua escolha por categoria. Enquanto você não fornecer consentimento explícito, cookies de analytics e publicidade permanecem desativados (modelo opt-in). Você pode alterar sua escolha a qualquer momento pelo link "Preferências de Cookies", disponível no rodapé do site, ou pelas configurações do seu navegador.
                        </p>
                      </section>

                      <section>
                        <h2 className="text-lg font-semibold mb-3">10. Contato</h2>
                        <p className="text-muted-foreground">
                          Para exercer os direitos descritos nesta política ou tirar dúvidas sobre o tratamento dos seus dados, entre em contato com nosso Encarregado de Proteção de Dados (DPO) pelo e-mail:{" "}
                          <a href={`mailto:${contactEmail}`} className="text-primary hover:underline font-medium">
                            {contactEmail}
                          </a>
                        </p>
                      </section>

                      <section>
                        <h2 className="text-lg font-semibold mb-3">11. Alterações</h2>
                        <p className="text-muted-foreground">
                          Esta Política de Privacidade pode ser atualizada periodicamente. Recomendamos que você a revise regularmente. Alterações significativas serão comunicadas através do aplicativo.
                        </p>
                      </section>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="terms">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Termos de Uso
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Última atualização: {lastUpdate}
                  </p>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-6 text-sm leading-relaxed">
                      <section>
                        <h2 className="text-lg font-semibold mb-3">1. Aceitação dos Termos</h2>
                        <p className="text-muted-foreground">
                          Ao acessar e utilizar o {appName}, você concorda em cumprir e estar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não deverá utilizar o aplicativo.
                        </p>
                      </section>

                      <section>
                        <h2 className="text-lg font-semibold mb-3">2. Descrição do Serviço</h2>
                        <p className="text-muted-foreground">
                          O {appName} é uma plataforma de gestão de locação de imóveis e CRM imobiliário, que reúne funcionalidades de gestão de contratos de locação, cobranças de aluguel, controle financeiro (fluxo de caixa, DRE e conciliação), agenda, integração com WhatsApp, inteligência artificial aplicada ao atendimento e gestão de documentos, voltada para imobiliárias, corretores autônomos e proprietários.
                        </p>
                      </section>

                      <section>
                        <h2 className="text-lg font-semibold mb-3">3. Cadastro e Conta</h2>
                        <p className="text-muted-foreground mb-2">
                          Para utilizar o {appName}, você deve:
                        </p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                          <li>Ter pelo menos 18 anos de idade</li>
                          <li>Fornecer informações verdadeiras, precisas e completas</li>
                          <li>Manter suas credenciais de acesso em sigilo</li>
                          <li>Ser responsável por todas as atividades realizadas em sua conta</li>
                          <li>Notificar imediatamente sobre qualquer uso não autorizado</li>
                        </ul>
                      </section>

                      <section>
                        <h2 className="text-lg font-semibold mb-3">4. Uso Permitido</h2>
                        <p className="text-muted-foreground mb-2">
                          Você concorda em utilizar o {appName} apenas para fins legítimos e de acordo com estes Termos. É proibido:
                        </p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                          <li>Violar qualquer lei ou regulamento aplicável</li>
                          <li>Transmitir conteúdo ilegal, difamatório ou prejudicial</li>
                          <li>Interferir no funcionamento do aplicativo</li>
                          <li>Tentar acessar dados de outros usuários</li>
                          <li>Utilizar automações não autorizadas</li>
                          <li>Revender ou redistribuir o serviço</li>
                        </ul>
                      </section>

                      <section>
                        <h2 className="text-lg font-semibold mb-3">5. Propriedade Intelectual</h2>
                        <p className="text-muted-foreground">
                          Todo o conteúdo do {appName}, incluindo mas não limitado a textos, gráficos, logos, ícones, imagens, software e código-fonte, é de propriedade da {companyName} ou de seus licenciadores e está protegido pelas leis de propriedade intelectual. Você não pode copiar, modificar, distribuir ou criar obras derivadas sem autorização prévia.
                        </p>
                      </section>

                      <section>
                        <h2 className="text-lg font-semibold mb-3">6. Seus Dados</h2>
                        <p className="text-muted-foreground">
                          Você mantém a propriedade de todos os dados que inserir no {appName}. Ao utilizar nossos serviços, você nos concede uma licença limitada para processar esses dados conforme necessário para a prestação do serviço. A {companyName} trata seus dados de acordo com nossa Política de Privacidade.
                        </p>
                      </section>

                      <section>
                        <h2 className="text-lg font-semibold mb-3">6.1. Cookies e Ferramentas de Publicidade</h2>
                        <p className="text-muted-foreground">
                          O site utiliza cookies, Google Analytics, Google Ads e Meta Ads (Meta Pixel) para fins estatísticos e publicitários, conforme detalhado em nossa Política de Privacidade. O uso de cookies de analytics e publicidade está sujeito ao seu consentimento, coletado através do banner exibido no primeiro acesso ao site — a simples navegação no site não implica consentimento para essas categorias.
                        </p>
                      </section>

                      <section>
                        <h2 className="text-lg font-semibold mb-3">7. Integração WhatsApp e Automação de Mensagens</h2>
                        <p className="text-muted-foreground mb-2">
                          A integração com WhatsApp é fornecida através de APIs de terceiros (Evolution API). Ao ativar esta funcionalidade, o usuário:
                        </p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                          <li>Autoriza o envio de notificações, lembretes e mensagens automatizadas em seu nome</li>
                          <li>Assume a responsabilidade por garantir o consentimento dos destinatários</li>
                          <li>Compromete-se a cumprir os termos de uso do WhatsApp e a legislação antispam</li>
                          <li>Reconhece que o uso indevido pode resultar no bloqueio do número pelo WhatsApp</li>
                        </ul>
                      </section>

                      <section>
                        <h2 className="text-lg font-semibold mb-3">7.1. Dados Fiscais e Faturamento</h2>
                        <p className="text-muted-foreground">
                          O usuário garante a veracidade dos dados fiscais (CPF/CNPJ) fornecidos durante o cadastro. Esses dados são utilizados para fins de faturamento, emissão de notas fiscais e cumprimento de obrigações tributárias. A prestação de informações falsas constitui violação destes Termos e pode resultar na rescisão imediata do contrato.
                        </p>
                      </section>

                      <section>
                        <h2 className="text-lg font-semibold mb-3">7.2. Serviços Financeiros e de Pagamento (Asaas)</h2>
                        <p className="text-muted-foreground">
                          Os serviços financeiros e de pagamentos disponibilizados por meio da presente plataforma, incluindo abertura e manutenção de conta de pagamento, processamento de transações, emissão de boletos, transferências, pagamentos e demais movimentações de valores, são prestados pelo ASAAS GESTÃO FINANCEIRA INSTITUIÇÃO DE PAGAMENTOS S.A., instituição de pagamento autorizada a funcionar pelo Banco Central do Brasil.
                        </p>
                        <p className="text-muted-foreground mt-3">
                          A Slotimob atua exclusivamente como integradora tecnológica e distribuidora da experiência do produto, não sendo instituição financeira ou de pagamento, nem realizando intermediação financeira em nome próprio.
                        </p>
                        <p className="text-muted-foreground mt-3">
                          O cliente declara ciência de que o relacionamento financeiro/de pagamentos e a responsabilidade regulatória pelos serviços acima descritos são do ASAAS GESTÃO FINANCEIRA S.A., nos termos da regulamentação vigente.
                        </p>
                        <p className="text-muted-foreground mt-3">
                          Ao ativar a funcionalidade de cobranças na plataforma, é criada, junto ao Asaas, uma conta de pagamento (subconta) de titularidade do próprio usuário, utilizada para emissão de boletos, cobranças via PIX e gestão dos recebimentos de aluguel dos seus contratos de locação.
                        </p>
                        <p className="text-muted-foreground mt-3">
                          Para suporte relacionado às operações financeiras de pagamento (dúvidas sobre uma cobrança específica, estorno, movimentação da conta de pagamento e demais assuntos regulados), o usuário pode acionar diretamente o Asaas pelos canais oficiais: <strong>0800 009 0037</strong> ou{" "}
                          <a href="mailto:contato@asaas.com.br" className="text-primary hover:underline font-medium">contato@asaas.com.br</a>.
                        </p>
                        <div className="mt-4">
                          <AsaasFinancialSeal size="sm" />
                        </div>
                      </section>

                      <section>
                        <h2 className="text-lg font-semibold mb-3">8. Disponibilidade do Serviço</h2>
                        <p className="text-muted-foreground">
                          Nos esforçamos para manter o {appName} disponível 24 horas por dia, 7 dias por semana. No entanto, não garantimos disponibilidade ininterrupta e não seremos responsáveis por interrupções temporárias para manutenção, atualizações ou problemas técnicos fora de nosso controle.
                        </p>
                      </section>

                      <section>
                        <h2 className="text-lg font-semibold mb-3">9. Limitação de Responsabilidade</h2>
                        <p className="text-muted-foreground">
                          O {appName} é fornecido "como está" e "conforme disponível". A {companyName} não garante que o serviço atenderá a todos os seus requisitos ou que operará de forma ininterrupta e livre de erros. Em nenhum caso a {companyName} será responsável por danos indiretos, incidentais, especiais ou consequenciais.
                        </p>
                      </section>

                      <section>
                        <h2 className="text-lg font-semibold mb-3">10. Indenização</h2>
                        <p className="text-muted-foreground">
                          Você concorda em indenizar e isentar a {companyName}, seus diretores, funcionários e parceiros de quaisquer reclamações, perdas, danos ou despesas decorrentes do seu uso do {appName} ou violação destes Termos.
                        </p>
                      </section>

                      <section>
                        <h2 className="text-lg font-semibold mb-3">11. Rescisão</h2>
                        <p className="text-muted-foreground">
                          Podemos suspender ou encerrar seu acesso ao {appName} a qualquer momento, com ou sem motivo, mediante aviso. Você pode encerrar sua conta a qualquer momento através das configurações do aplicativo. Após o encerramento, seu direito de usar o serviço cessará imediatamente.
                        </p>
                      </section>

                      <section>
                        <h2 className="text-lg font-semibold mb-3">12. Alterações nos Termos</h2>
                        <p className="text-muted-foreground">
                          Reservamo-nos o direito de modificar estes Termos a qualquer momento. Alterações significativas serão notificadas através do aplicativo. O uso continuado do {appName} após tais alterações constitui sua aceitação dos novos Termos.
                        </p>
                      </section>

                      <section>
                        <h2 className="text-lg font-semibold mb-3">13. Lei Aplicável</h2>
                        <p className="text-muted-foreground">
                          Estes Termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa será submetida à jurisdição exclusiva dos tribunais brasileiros competentes.
                        </p>
                      </section>

                      <section>
                        <h2 className="text-lg font-semibold mb-3">14. Contato</h2>
                        <p className="text-muted-foreground">
                          Para dúvidas sobre estes Termos de Uso, entre em contato conosco pelo e-mail:{" "}
                          <a href={`mailto:${contactEmail}`} className="text-primary hover:underline font-medium">
                            {contactEmail}
                          </a>
                        </p>
                        <p className="text-muted-foreground mt-4">
                          <strong>{companyName}</strong><br />
                          CNPJ: {cnpj}
                        </p>
                      </section>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="refund">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-primary" />
                    Política de Cancelamento e Reembolso
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Última atualização: {lastUpdate}
                  </p>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-6 text-sm leading-relaxed">
                      <section>
                        <p className="text-muted-foreground">
                          A SlotiMob tem o compromisso de garantir a satisfação e a transparência com todos os nossos usuários. Esta política foi elaborada em conformidade com o <strong>Código de Defesa do Consumidor (Lei nº 8.078/90)</strong> e aplica-se a todas as assinaturas e compras avulsas realizadas em nossa plataforma.
                        </p>
                      </section>

                      <section>
                        <h2 className="text-lg font-semibold mb-3">1. Direito de Arrependimento (Garantia de 7 Dias)</h2>
                        <p className="text-muted-foreground mb-2">
                          De acordo com o <strong>Artigo 49 do Código de Defesa do Consumidor</strong>, você tem o direito de se arrepender da contratação dos nossos serviços no prazo de até <strong>7 (sete) dias corridos</strong>, contados a partir da data de aprovação do seu primeiro pagamento.
                        </p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                          <li>Caso você solicite o cancelamento dentro deste período, realizaremos o <strong>reembolso integral (100%)</strong> do valor pago.</li>
                          <li>O direito de arrependimento é válido apenas para a <strong>primeira contratação</strong> do serviço (planos pagos - Pro ou Business).</li>
                        </ul>
                      </section>

                      <section>
                        <h2 className="text-lg font-semibold mb-3">2. Cancelamento de Assinaturas (Após 7 Dias)</h2>
                        <p className="text-muted-foreground mb-2">
                          A SlotiMob funciona no modelo de <strong>assinatura pré-paga</strong> (mensal ou anual) <strong>sem fidelidade obrigatória</strong> (exceto em planos anuais específicos que prevejam multa).
                        </p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                          <li>Você pode cancelar a renovação da sua assinatura a qualquer momento, diretamente no painel de configurações da sua conta (em <strong>"Plano e Assinatura" &gt; "Gerenciar Assinatura"</strong>).</li>
                          <li>O cancelamento interrompe cobranças futuras, mas <strong>não gera reembolso proporcional</strong> por dias não utilizados no ciclo já pago. Você continuará tendo acesso aos recursos do seu plano até o último dia do seu ciclo de faturamento atual.</li>
                        </ul>
                      </section>

                      <section>
                        <h2 className="text-lg font-semibold mb-3">3. Compras Avulsas (Créditos de IA e Add-ons)</h2>
                        <p className="text-muted-foreground mb-2">
                          Para pacotes de Créditos de Inteligência Artificial ou expansão de limites (Add-ons):
                        </p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                          <li>O reembolso integral em até 7 dias só será aplicável se os créditos ou limites <strong>não tiverem sido consumidos</strong>.</li>
                          <li>Se você comprar um pacote de créditos de IA e utilizar parte deles dentro dos primeiros 7 dias, o valor da compra <strong>não será passível de reembolso</strong>, configurando a prestação imediata do serviço.</li>
                        </ul>
                      </section>

                      <section>
                        <h2 className="text-lg font-semibold mb-3">4. Como Solicitar o Reembolso</h2>
                        <p className="text-muted-foreground">
                          Para exercer seu direito de arrependimento dentro do prazo de 7 dias, envie um e-mail para{" "}
                          <a href="mailto:contato@slotimob.com.br" className="text-primary hover:underline font-medium">
                            contato@slotimob.com.br
                          </a>{" "}
                          informando o e-mail de cadastro da sua conta e o motivo da solicitação (o motivo é opcional, mas nos ajuda a melhorar).
                        </p>
                        <p className="text-muted-foreground mt-3">
                          <strong>Não efetuamos reembolsos automáticos</strong> pelo cancelamento via painel. O estorno dentro da garantia deve ser expressamente solicitado ao nosso time de suporte.
                        </p>
                      </section>

                      <section>
                        <h2 className="text-lg font-semibold mb-3">5. Prazos de Processamento</h2>
                        <p className="text-muted-foreground mb-2">
                          Uma vez que o reembolso seja aprovado pela nossa equipe, o estorno é processado por meio do <strong>Asaas</strong>, pelo mesmo meio de pagamento originalmente utilizado na contratação:
                        </p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                          <li><strong>Cartão de crédito:</strong> estorno na fatura em <strong>5 a 10 dias úteis</strong>, conforme prazos da operadora do cartão.</li>
                          <li><strong>PIX:</strong> devolução em até <strong>5 dias úteis</strong> para a chave de origem.</li>
                          <li><strong>Boleto:</strong> reembolso via transferência para conta bancária de titularidade do assinante, em até <strong>10 dias úteis</strong> após a confirmação dos dados bancários.</li>
                        </ul>
                        <p className="text-muted-foreground mt-3">
                          Os prazos acima podem sofrer variação conforme a instituição financeira do beneficiário.
                        </p>
                      </section>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="mt-8 flex flex-col items-center gap-2">
            <AsaasFinancialSeal size="sm" />
            <AsaasTransparencyNote className="text-center max-w-2xl mx-auto" />
          </div>
        </div>
      </div>
    </>
  );
};

export default Legal;
