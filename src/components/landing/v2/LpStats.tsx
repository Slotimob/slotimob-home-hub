import { useCountUp } from './useReveal';
import { Reveal } from './Reveal';

const STATS = [
  { num: 10, suffix: '+', label: 'módulos integrados', detail: 'CRM, financeiro, contratos, WhatsApp, IA e mais em um único sistema' },
  { num: 15, suffix: 'min', label: 'para emitir todos os boletos', detail: 'Automatize cobranças que antes levavam horas toda virada de mês' },
  { num: 100, suffix: '%', label: 'WhatsApp dentro do CRM', detail: 'Atenda inquilinos e leads sem sair da plataforma' },
  { num: 24, suffix: '/7', label: 'backups e auditoria', detail: 'Seus dados protegidos e rastreáveis a qualquer momento' },
];

export function LpStats() {
  return (
    <section className="py-16 md:py-24" style={{ borderTop: '1px solid var(--lp-line)', borderBottom: '1px solid var(--lp-line)' }}>
      <div className="max-w-[1280px] mx-auto px-5 md:px-10">
        <Reveal>
          <p className="lp-eyebrow mb-10">plataforma completa</p>
        </Reveal>
        <div className="grid grid-cols-2 md:grid-cols-4">
          {STATS.map((s, i) => (
            <StatItem key={s.label} {...s} last={i === STATS.length - 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StatItem({ num, suffix, label, detail, last }: { num: number; suffix: string; label: string; detail: string; last: boolean }) {
  const { ref, value } = useCountUp(num);
  return (
    <div
      className="py-6 md:py-8 px-2 md:px-6"
      style={{
        borderRight: last ? 'none' : '1px solid var(--lp-line)',
      }}
    >
      <p className="lp-serif text-[56px] md:text-[80px] leading-none mb-3" style={{ color: 'var(--lp-ink)' }}>
        <span ref={ref} className="lp-num">{value}</span>
        <span style={{ color: 'var(--lp-accent)' }}>{suffix}</span>
      </p>
      <p className="text-[13px]" style={{ color: 'var(--lp-ink-soft)' }}>{label}</p>
      <p className="text-[11px] mt-1 leading-snug max-w-[160px]" style={{ color: 'var(--lp-mute)' }}>
        {detail}
      </p>
    </div>
  );
}
