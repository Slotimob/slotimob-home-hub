import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { TourModule } from './TourModuleData';

interface Props {
  module: TourModule;
  index: number;
}

export function TourModuleCard({ module, index }: Props) {
  const isEven = index % 2 === 0;

  return (
    <motion.section
      id={module.id}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="scroll-mt-24"
    >
      <div className={cn(
        'rounded-2xl border border-border/40 overflow-hidden bg-card shadow-lg',
      )}>
        {/* Colored header strip */}
        <div className={cn('bg-gradient-to-r p-6 md:p-8', module.color)}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
              <module.icon className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white">{module.headline}</h2>
          </div>
          <p className="text-white/85 text-base md:text-lg max-w-3xl leading-relaxed">
            {module.description}
          </p>
          {/* Submenus as badges */}
          <div className="flex flex-wrap gap-2 mt-4">
            {module.submenus.map((sub) => (
              <Badge
                key={sub.path}
                variant="secondary"
                className="bg-white/20 text-white border-white/30 hover:bg-white/30 text-xs font-medium px-3 py-1"
              >
                {sub.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Features grid */}
        <div className="p-6 md:p-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {module.features.map((feat, i) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className={cn(
                  'rounded-xl border border-border/30 p-4 space-y-2 hover:shadow-md transition-shadow',
                  'bg-gradient-to-br from-background to-muted/30'
                )}
              >
                <div className={cn('p-2 rounded-lg w-fit', module.accentBg)}>
                  <feat.icon className={cn('h-4 w-4', module.accentText)} />
                </div>
                <h4 className="text-sm font-bold text-foreground">{feat.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
