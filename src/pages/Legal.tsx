import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, FileText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";

const Legal = () => {
  const navigate = useNavigate();
  const companyName = "SLOTI";
  const cnpj = "42.323.823/0001-06";
  const appName = "SLOTIMOB";
  const contactEmail = "ops@sloti.com.br";
  const lastUpdate = "28 de dezembro de 2025";

  return (
    <>
      <SEOHead 
        title="Política de Privacidade e Termos de Uso"
        description="Conheça nossa política de privacidade e termos de uso do SLOTIMOB - Sistema de gestão imobiliária"
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

        <Tabs defaultValue="privacy" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="privacy" className="gap-2">
              <Shield className="h-4 w-4" />
              Política de Privacidade
            </TabsTrigger>
            <TabsTrigger value="terms" className="gap-2">
              <FileText className="h-4 w-4" />
              Termos de Uso
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
                        <li>Prestadores de serviços de infraestrutura e hospedagem</li>
                        <li>Serviços de integração de WhatsApp (Evolution API)</li>
                        <li>Autoridades competentes, quando exigido por lei</li>
                      </ul>
                      <p className="text-muted-foreground mt-2">
                        Não vendemos ou comercializamos seus dados pessoais a terceiros.
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
                    </section>

                    <section>
                      <h2 className="text-lg font-semibold mb-3">9. Cookies</h2>
                      <p className="text-muted-foreground">
                        Utilizamos cookies e tecnologias similares para melhorar sua experiência no aplicativo, analisar o uso e personalizar conteúdos. Você pode gerenciar suas preferências de cookies através das configurações do navegador.
                      </p>
                    </section>

                    <section>
                      <h2 className="text-lg font-semibold mb-3">10. Contato</h2>
                      <p className="text-muted-foreground">
                        Para exercer seus direitos ou esclarecer dúvidas sobre esta Política de Privacidade, entre em contato conosco pelo e-mail:{" "}
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
                        O {appName} é uma plataforma de CRM (Customer Relationship Management) desenvolvida especificamente para corretores de imóveis, oferecendo funcionalidades como gestão de leads, pipeline de vendas, agendamento de visitas, integração com WhatsApp, simuladores financeiros e gestão documental.
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
                      <h2 className="text-lg font-semibold mb-3">7. Integração WhatsApp</h2>
                      <p className="text-muted-foreground">
                        A integração com WhatsApp é fornecida através de APIs de terceiros. Você é responsável por cumprir os termos de uso do WhatsApp e garantir que possui consentimento adequado para contatar seus leads e clientes através desta plataforma.
                      </p>
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
        </Tabs>
      </div>
    </div>
    </>
  );
};

export default Legal;
