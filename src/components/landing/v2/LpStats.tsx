import { useCountUp } from './useReveal';
import { Reveal } from './Reveal';

const STATS = [
  { num: 10, suffix: '', label: 'módulos integrados' },
  { num: 1, suffix: ' clique', label: 'para gerar DIMOB' },
  { num: 100, suffix: '%', label: 'WhatsApp dentro do CRM' },
  { num: 24, suffix: '/7', label: 'auditoria e backups' },
];

export function LpStats() {
  return (
    <section className="py-16 md:py-24" style={{ borderTop: '1px solid var(--lp-line)', borderBottom: '1px solid var(--lp-line)' }}>
      <div className="max-w-[1280px] mx-auto px-5 md:px-10">
        <Reveal>
          <p className="lp-eyebrow mb-10">02 — em números</p>
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

function StatItem({ num, suffix, label, last }: { num: number; suffix: string; label: string; last: boolean }) {
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
    </div>
  );
}
