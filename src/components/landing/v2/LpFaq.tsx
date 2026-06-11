import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { Reveal } from './Reveal';

const FAQ = [
  {
    q: 'preciso de cartão para o trial?',
    a: 'Não. O plano Start é gratuito para sempre e já inclui 14 dias do Pro por padrão. Cartão só é exigido se você optar por continuar em um plano pago.',
  },
  {
    q: 'o que acontece quando o trial acaba?',
    a: 'Você volta automaticamente para o plano Start (gratuito) com os limites reduzidos. Seus dados continuam intactos — basta assinar para reativar os recursos do Pro.',
  },
  {
    q: 'consigo migrar de planilhas para o slotimob?',
    a: 'Sim. Suportamos importação de contatos e imóveis via CSV. Se você usa um ERP atual, nosso time ajuda na migração na fase de onboarding.',
  },
  {
    q: 'posso cancelar quando quiser?',
    a: 'Sim, sem multa. O cancelamento mantém o acesso até o fim do ciclo já pago e você pode exportar seus dados a qualquer momento.',
  },
  {
    q: 'a equipe pode usar junto?',
    a: 'O plano Business inclui até 4 usuários (1 Master + 3 membros) com papéis, permissões granulares e roleta de leads automática. Add-on de usuário extra disponível.',
  },
  {
    q: 'meus dados estão seguros?',
    a: 'Sim. Infraestrutura com criptografia em repouso e em trânsito, backups diários, isolamento por workspace via RLS no banco e auditoria completa de ações.',
  },
];

export function LpFaq() {
  return (
    <section className="py-24 md:py-36" style={{ borderTop: '1px solid var(--lp-line)' }}>
      <div className="max-w-[1280px] mx-auto px-5 md:px-10">
        <div className="grid grid-cols-12 gap-6 mb-12 md:mb-16">
          <div className="col-span-12 md:col-span-4">
            <Reveal>
              <p className="lp-eyebrow">07 — perguntas</p>
            </Reveal>
          </div>
          <div className="col-span-12 md:col-span-8">
            <Reveal delay={80}>
              <h2 className="lp-display text-[40px] md:text-[72px]">
                dúvidas
                <br />
                <em className="lp-serif" style={{ fontStyle: 'italic', color: 'var(--lp-accent)' }}>frequentes</em>.
              </h2>
            </Reveal>
          </div>
        </div>

        <div className="max-w-[820px] mx-auto">
          {FAQ.map((f, i) => (
            <FaqItem key={i} q={f.q} a={f.a} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: '1px solid var(--lp-line)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full py-6 md:py-7 flex items-center justify-between text-left gap-6"
        aria-expanded={open}
      >
        <span className="lp-serif text-xl md:text-2xl" style={{ color: 'var(--lp-ink)' }}>{q}</span>
        <span className="shrink-0">
          {open ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
        </span>
      </button>
      <div
        style={{
          maxHeight: open ? '300px' : '0',
          opacity: open ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height .45s ease, opacity .3s ease',
        }}
      >
        <p className="pb-7 pr-12 text-[15px] leading-relaxed" style={{ color: 'var(--lp-ink-soft)' }}>{a}</p>
      </div>
    </div>
  );
}
