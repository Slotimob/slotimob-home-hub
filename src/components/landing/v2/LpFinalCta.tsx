import SectionWrapper from '@/components/marketing/SectionWrapper';
import CTAButton from '@/components/marketing/CTAButton';
import { buildWhatsAppLink } from '@/lib/constants';
import { Reveal } from './Reveal';

const CONSULTOR_LINK = buildWhatsAppLink('Olá, quero saber mais sobre o Slotimob');

export function LpFinalCta() {
  return (
    <SectionWrapper background="primary" id="comecar">
      <div className="max-w-2xl mx-auto text-center">
        <Reveal>
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground leading-tight">
            Pronto para automatizar sua gestão?
          </h2>
          <p className="text-lg text-primary-foreground/70 mt-4">
            Junte-se a centenas de proprietários que economizam horas todo mês.
          </p>
        </Reveal>

        <Reveal delay={150}>
          <div className="flex justify-center gap-4 flex-wrap mt-8">
            <CTAButton href="/checkout?plan=pro&trial=true" size="lg">
              Começar 7 dias grátis
            </CTAButton>
            <CTAButton
              href="https://wa.me/5511999999999?text=Olá,%20quero%20saber%20mais%20sobre%20o%20Slotimob"
              variant="secondary"
              size="lg"
              external
              className="border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10"
            >
              Falar com consultor
            </CTAButton>
          </div>

          <p className="text-sm text-primary-foreground/50 mt-6">
            Sem cartão · Cancele quando quiser · 7 dias de PRO grátis
          </p>
        </Reveal>
      </div>
    </SectionWrapper>
  );
}
