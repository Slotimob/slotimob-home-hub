import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import SectionWrapper from '@/components/marketing/SectionWrapper';

const faqs = [
  {
    q: 'Preciso de cartão de crédito para testar?',
    a: 'Não. O trial de 7 dias é completamente gratuito e não exige cartão. Você só informa dados de pagamento quando decidir assinar um plano pago.',
  },
  {
    q: 'Como funciona o trial de 7 dias?',
    a: 'Ao criar sua conta, você tem acesso completo ao plano PRO por 7 dias sem pagar nada. No 8º dia, sua conta é convertida automaticamente para o plano gratuito (Start) se você não assinar. Você não perde seus dados.',
  },
  {
    q: 'Posso cancelar quando quiser?',
    a: 'Sim. Não há fidelidade. Você cancela em 1 clique nas configurações da conta, sem burocracia e sem multa.',
  },
  {
    q: 'O Slotimob funciona para quem tem só 1 ou 2 imóveis?',
    a: 'Sim, foi feito para isso. O plano Start (gratuito) suporta até 5 imóveis. O PRO suporta até 50. Se você tem 1 imóvel e quer parar de cobrar pelo WhatsApp, o Slotimob resolve em 30 minutos.',
  },
  {
    q: 'O boleto é emitido pelo Slotimob ou pelo meu banco?',
    a: 'Os boletos são emitidos via Asaas, parceiro financeiro homologado pelo Banco Central. O valor do aluguel cai direto na sua conta — o Slotimob não fica com o dinheiro em nenhum momento.',
  },
  {
    q: 'Meus dados ficam seguros?',
    a: 'Sim. Todos os dados são armazenados com criptografia em servidores no Brasil (AWS São Paulo). Seguimos a LGPD e não compartilhamos suas informações com terceiros.',
  },
];

export function LpFaq() {
  return (
    <SectionWrapper background="white" id="faq">
      <div className="text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
          Perguntas frequentes
        </h2>
      </div>

      <Accordion
        type="single"
        collapsible
        defaultValue="item-1"
        className="max-w-3xl mx-auto mt-10"
      >
        {faqs.map((item, i) => (
          <AccordionItem key={item.q} value={`item-${i + 1}`}>
            <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground leading-relaxed">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </SectionWrapper>
  );
}
