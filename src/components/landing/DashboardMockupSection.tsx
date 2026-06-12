import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Wallet, Users, Home, BarChart3, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import dashboardImg from '@/assets/dashboard-mockup.png';

const metrics = [
  { label: 'Comissões', value: 'R$ 47.200', change: '+18%', icon: Wallet },
  { label: 'Clientes Novos', value: '142', change: '+32%', icon: Users },
  { label: 'Imóveis Ativos', value: '87', change: '+5', icon: Home },
  { label: 'Taxa de Fechamento', value: '23%', change: '+4.2pp', icon: BarChart3 },
];

const commissionBars = [
  { month: 'Set', value: 35 },
  { month: 'Out', value: 52 },
  { month: 'Nov', value: 44 },
  { month: 'Dez', value: 61 },
  { month: 'Jan', value: 73 },
  { month: 'Fev', value: 89 },
];

export function DashboardMockupSection() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <section className="py-20 bg-background overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
            <TrendingUp className="h-3.5 w-3.5" />
            Painel em Tempo Real
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Seus resultados em{' '}
            <span className="text-primary">um só lugar</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Acompanhe comissões, clientes e performance de cada canal — atualizado a cada transação.
          </p>
        </div>

        {/* Browser Frame */}
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="rounded-2xl border border-border/50 bg-card shadow-2xl shadow-primary/5 overflow-hidden"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            whileHover={{ scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 200, damping: 30 }}
          >
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/30">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-warning/60" />
                <div className="w-3 h-3 rounded-full bg-success/60" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-background rounded-md px-4 py-1 text-xs text-muted-foreground border border-border/50 max-w-xs w-full text-center">
                  app.slotimob.com.br/dashboard
                </div>
              </div>
            </div>

            {/* Content area */}
            <div className="relative">
              <img
                src={dashboardImg}
                alt="Painel de controle SlotiMob mostrando resultados em tempo real"
                className={cn(
                  'w-full transition-all duration-700',
                  isHovered ? 'opacity-20 blur-sm scale-105' : 'opacity-100'
                )}
                loading="lazy"
              />

              {/* Interactive overlay on hover */}
              <motion.div
                className="absolute inset-0 p-6 md:p-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovered ? 1 : 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {metrics.map((metric, i) => (
                    <motion.div
                      key={metric.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={isHovered ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                      transition={{ delay: i * 0.08, duration: 0.3 }}
                      className="bg-background/95 backdrop-blur-sm rounded-xl border border-border p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <metric.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-medium text-primary flex items-center gap-0.5">
                          {metric.change}
                          <ArrowUpRight className="h-3 w-3" />
                        </span>
                      </div>
                      <p className="text-lg md:text-xl font-bold text-foreground">{metric.value}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{metric.label}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Commission chart */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={isHovered ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  className="bg-background/95 backdrop-blur-sm rounded-xl border border-border p-5 shadow-sm max-w-lg"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Suas Comissões Crescendo</h4>
                      <p className="text-xs text-muted-foreground">Últimos 6 meses</p>
                    </div>
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">+154%</span>
                  </div>
                  <div className="flex items-end gap-2 h-28">
                    {commissionBars.map((bar, i) => (
                      <div key={bar.month} className="flex-1 flex flex-col items-center gap-1">
                        <motion.div
                          className="w-full bg-gradient-to-t from-primary to-primary/60 rounded-t-md"
                          initial={{ height: 0 }}
                          animate={isHovered ? { height: `${bar.value}%` } : { height: 0 }}
                          transition={{ delay: 0.4 + i * 0.08, duration: 0.5, ease: 'easeOut' }}
                        />
                        <span className="text-[10px] text-muted-foreground">{bar.month}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>

          {/* Hover hint */}
          <motion.p
            className="text-center text-sm text-muted-foreground mt-4"
            animate={{ opacity: isHovered ? 0 : 1 }}
          >
            <span className="hidden md:inline">👆 Passe o mouse para explorar os dados em tempo real</span>
            <span className="md:hidden">👆 Toque para explorar os dados</span>
          </motion.p>
        </div>
      </div>
    </section>
  );
}
