import { useEffect, useRef, useState } from 'react';

interface Metric {
  value: number;
  suffix: string;
  label: string;
}

const metrics: Metric[] = [
  { value: 500, suffix: '+', label: 'proprietários ativos' },
  { value: 2000, suffix: '+', label: 'imóveis gerenciados' },
  { value: 30, suffix: '%', label: 'menos inadimplência' },
  { value: 4, suffix: 'h', label: 'economizadas por mês' },
];

function useCountUp(target: number, start: boolean, duration = 1500) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!start) return;
    let rafId: number;
    const startTime = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      setValue(Math.floor(progress * target));
      if (progress < 1) rafId = requestAnimationFrame(tick);
      else setValue(target);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, start, duration]);

  return value;
}

function MetricCell({ metric, visible }: { metric: Metric; visible: boolean }) {
  const value = useCountUp(metric.value, visible);
  return (
    <div className="text-center">
      <div className="text-4xl font-bold text-foreground">
        {value.toLocaleString('pt-BR')}
        <span className="text-accent">{metric.suffix}</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{metric.label}</p>
    </div>
  );
}

export default function SocialProofNumbers() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            obs.disconnect();
          }
        });
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="grid grid-cols-2 md:grid-cols-4 gap-8">
      {metrics.map((m) => (
        <MetricCell key={m.label} metric={m} visible={visible} />
      ))}
    </div>
  );
}
