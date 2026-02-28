import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Megaphone, UserPlus, Users, MessageSquare, Handshake,
  ArrowRight, Tag, BarChart3, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const steps = [
  {
    id: 'ad',
    icon: Megaphone,
    title: 'Anúncio',
    subtitle: 'Instagram • Google • Portais',
    description: 'Campanhas ativas em múltiplos canais geram tráfego qualificado para seus imóveis.',
    detail: 'utm_source=instagram\nutm_campaign=lancamento_2025',
    color: 'from-blue-500 to-blue-600',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-200',
  },
  {
    id: 'capture',
    icon: UserPlus,
    title: 'Captura de Lead',
    subtitle: 'UTM rastreado automaticamente',
    description: 'O sistema captura nome, telefone e todos os parâmetros UTM sem scripts externos.',
    detail: 'Nome: Maria Santos\nOrigem: Google Ads\nCampanha: Apto 2Q Centro',
    color: 'from-emerald-500 to-emerald-600',
    bgLight: 'bg-emerald-50',
    textColor: 'text-emerald-600',
    borderColor: 'border-emerald-200',
  },
  {
    id: 'roulette',
    icon: Users,
    title: 'Roleta de Vendas',
    subtitle: 'Distribuição "Fair Share"',
    description: 'Lead é atribuído automaticamente ao próximo corretor da fila, garantindo distribuição justa.',
    detail: 'Corretor: João Silva\nModo: Round-Robin\nTempo: <2 segundos',
    color: 'from-violet-500 to-violet-600',
    bgLight: 'bg-violet-50',
    textColor: 'text-violet-600',
    borderColor: 'border-violet-200',
  },
  {
    id: 'whatsapp',
    icon: MessageSquare,
    title: 'WhatsApp Automático',
    subtitle: 'Primeira resposta em segundos',
    description: 'Mensagem de boas-vindas enviada instantaneamente com detalhes do imóvel de interesse.',
    detail: '"Olá Maria! Vi seu interesse\nno Apto 2Q Centro. Posso\nagendar uma visita?"',
    color: 'from-green-500 to-green-600',
    bgLight: 'bg-green-50',
    textColor: 'text-green-600',
    borderColor: 'border-green-200',
  },
  {
    id: 'closing',
    icon: Handshake,
    title: 'Fechamento',
    subtitle: 'Proposta → Contrato → Comissão',
    description: 'Do agendamento à assinatura do contrato, tudo rastreado com comissão calculada automaticamente.',
    detail: 'Valor: R$ 385.000\nComissão: R$ 19.250\nDias no funil: 12',
    color: 'from-amber-500 to-amber-600',
    bgLight: 'bg-amber-50',
    textColor: 'text-amber-600',
    borderColor: 'border-amber-200',
  },
];

export function LeadJourneyInfographic() {
  const [activeStep, setActiveStep] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isAutoPlaying) return;
    intervalRef.current = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 3500);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAutoPlaying]);

  const handleStepClick = (index: number) => {
    setActiveStep(index);
    setIsAutoPlaying(false);
    // Resume auto-play after 10s of inactivity
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const current = steps[activeStep];

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
            <Zap className="h-3.5 w-3.5" />
            Jornada Completa
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Do anúncio à comissão,{' '}
            <span className="text-primary">100% rastreado</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Cada etapa é conectada e automatizada. Você sabe exatamente de onde veio cada real de comissão.
          </p>
        </div>

        {/* Desktop: Horizontal Timeline */}
        <div className="hidden lg:block max-w-5xl mx-auto mb-12">
          <div className="relative">
            {/* Connection line */}
            <div className="absolute top-8 left-[10%] right-[10%] h-0.5 bg-border" />
            {/* Progress line */}
            <motion.div
              className="absolute top-8 left-[10%] h-0.5 bg-primary"
              initial={{ width: '0%' }}
              animate={{ width: `${(activeStep / (steps.length - 1)) * 80}%` }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            />

            <div className="relative flex justify-between">
              {steps.map((step, i) => {
                const Icon = step.icon;
                const isActive = i === activeStep;
                const isPast = i < activeStep;

                return (
                  <button
                    key={step.id}
                    onClick={() => handleStepClick(i)}
                    className="flex flex-col items-center w-[20%] group cursor-pointer"
                  >
                    <motion.div
                      className={cn(
                        'relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 border-2',
                        isActive
                          ? `bg-gradient-to-br ${step.color} border-transparent shadow-lg shadow-primary/20`
                          : isPast
                            ? 'bg-primary/10 border-primary/30'
                            : 'bg-background border-border group-hover:border-primary/30'
                      )}
                      animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                      <Icon className={cn('h-6 w-6', isActive ? 'text-white' : isPast ? 'text-primary' : 'text-muted-foreground')} />
                      {isActive && (
                        <motion.div
                          className="absolute inset-0 rounded-2xl border-2 border-primary/30"
                          initial={{ scale: 1 }}
                          animate={{ scale: 1.3, opacity: 0 }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      )}
                    </motion.div>
                    <p className={cn(
                      'mt-3 text-sm font-medium transition-colors',
                      isActive ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                      {step.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[120px] text-center leading-tight">
                      {step.subtitle}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile: Vertical steps */}
        <div className="lg:hidden flex overflow-x-auto gap-2 pb-4 mb-6 scrollbar-none">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const isActive = i === activeStep;
            return (
              <button
                key={step.id}
                onClick={() => handleStepClick(i)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all shrink-0',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {step.title}
              </button>
            );
          })}
        </div>

        {/* Detail Card */}
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
              className={cn('rounded-2xl border-2 overflow-hidden', current.borderColor, current.bgLight)}
            >
              <div className="grid md:grid-cols-[1fr_280px] gap-0">
                <div className="p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br', current.color)}>
                      <current.icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground">{current.title}</h3>
                      <p className={cn('text-sm font-medium', current.textColor)}>{current.subtitle}</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground leading-relaxed mb-4">{current.description}</p>

                  {/* Step progress */}
                  <div className="flex items-center gap-1.5">
                    {steps.map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          'h-1.5 rounded-full transition-all duration-300',
                          i === activeStep ? 'w-8 bg-primary' : i < activeStep ? 'w-4 bg-primary/40' : 'w-4 bg-border'
                        )}
                      />
                    ))}
                  </div>
                </div>

                {/* Code/data preview */}
                <div className="bg-foreground/5 border-t md:border-t-0 md:border-l border-inherit p-5 flex items-center">
                  <pre className={cn('text-sm font-mono leading-relaxed whitespace-pre-wrap', current.textColor)}>
                    {current.detail}
                  </pre>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom stats */}
        <div className="max-w-3xl mx-auto mt-12 grid grid-cols-3 gap-4">
          {[
            { icon: Tag, label: 'Rastreio UTM', value: '100% automático' },
            { icon: ArrowRight, label: 'Tempo de resposta', value: '< 30 segundos' },
            { icon: BarChart3, label: 'ROI por canal', value: 'Visibilidade total' },
          ].map((stat) => (
            <div key={stat.label} className="text-center p-4 rounded-xl bg-background border border-border">
              <stat.icon className="h-5 w-5 text-primary mx-auto mb-2" />
              <p className="text-sm font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}