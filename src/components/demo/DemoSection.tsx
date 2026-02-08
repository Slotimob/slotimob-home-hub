import { cn } from '@/lib/utils';
import { Check, LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { forwardRef } from 'react';

interface DemoSectionProps {
  id: string;
  title: string;
  description: string;
  bullets: string[];
  icon: LucideIcon;
  imagePosition?: 'left' | 'right';
  accentColor?: string;
}

export const DemoSection = forwardRef<HTMLElement, DemoSectionProps>(
  ({ id, title, description, bullets, icon: Icon, imagePosition = 'right', accentColor }, ref) => {
    const isImageLeft = imagePosition === 'left';
    
    return (
      <section 
        ref={ref}
        id={id} 
        className="py-16 md:py-24 scroll-mt-20"
      >
        <div className={cn(
          "grid md:grid-cols-2 gap-8 md:gap-12 items-center",
          isImageLeft && "md:grid-flow-dense"
        )}>
          {/* Content */}
          <motion.div 
            className={cn(isImageLeft && "md:col-start-2")}
            initial={{ opacity: 0, x: isImageLeft ? 30 : -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div 
                className={cn(
                  "p-3 rounded-xl",
                  accentColor || "bg-primary/10"
                )}
              >
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                {title}
              </h2>
            </div>
            
            <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
              {description}
            </p>
            
            <ul className="space-y-3">
              {bullets.map((bullet, index) => (
                <motion.li 
                  key={index}
                  className="flex items-start gap-3"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                >
                  <div className="mt-1 p-1 rounded-full bg-secondary/20">
                    <Check className="h-3.5 w-3.5 text-secondary" />
                  </div>
                  <span className="text-foreground/80">{bullet}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
          
          {/* Visual placeholder */}
          <motion.div 
            className={cn(isImageLeft && "md:col-start-1 md:row-start-1")}
            initial={{ opacity: 0, x: isImageLeft ? -30 : 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-muted to-muted/50 border shadow-lg">
              {/* Simulated UI elements */}
              <div className="absolute inset-4 flex flex-col gap-3">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                
                <div className="flex-1 rounded-lg bg-background/80 backdrop-blur-sm p-4 flex flex-col gap-3">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-muted-foreground/20 rounded w-1/2" />
                      <div className="h-2 bg-muted-foreground/10 rounded w-3/4" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 flex-1">
                    {[...Array(6)].map((_, i) => (
                      <div 
                        key={i} 
                        className="rounded-md bg-muted/50 border border-border/50"
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Decorative gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />
            </div>
          </motion.div>
        </div>
      </section>
    );
  }
);

DemoSection.displayName = 'DemoSection';
