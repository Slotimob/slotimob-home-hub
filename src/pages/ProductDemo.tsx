import { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { DemoHero } from '@/components/demo/DemoHero';
import { DemoNavigation, DemoNavigationMobile } from '@/components/demo/DemoNavigation';
import { DemoSection } from '@/components/demo/DemoSection';
import { demoSections } from '@/components/demo/demoContent';

export default function ProductDemo() {
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState('imoveis');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  
  // Track scroll position for active section and scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
      
      // Find which section is currently in view
      const scrollPosition = window.scrollY + 200;
      
      for (const section of demoSections) {
        const element = sectionRefs.current[section.id];
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const handleNavigate = useCallback((sectionId: string) => {
    const element = sectionRefs.current[sectionId];
    if (element) {
      const offset = isMobile ? 80 : 100;
      const top = element.offsetTop - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }, [isMobile]);
  
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <DemoHero />
      
      {/* Main Content */}
      <div className="container mx-auto px-4">
        {/* Mobile Navigation */}
        {isMobile && (
          <div className="sticky top-0 z-40 py-4 bg-background/95 backdrop-blur-sm border-b">
            <DemoNavigationMobile 
              activeSection={activeSection}
              onNavigate={handleNavigate}
            />
          </div>
        )}
        
        <div className="flex gap-8 lg:gap-12">
          {/* Desktop Sidebar Navigation */}
          {!isMobile && (
            <aside className="hidden md:block w-64 shrink-0">
              <div className="sticky top-24">
                <DemoNavigation 
                  activeSection={activeSection}
                  onNavigate={handleNavigate}
                />
                
                {/* CTA in sidebar */}
                <div className="mt-8 p-4 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 border">
                  <p className="text-sm text-muted-foreground mb-3">
                    Pronto para começar?
                  </p>
                  <Button asChild size="sm" className="w-full">
                    <Link to="/auth">
                      Criar Conta Grátis
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </aside>
          )}
          
          {/* Sections */}
          <main className="flex-1 min-w-0 pb-20">
            {demoSections.map((section, index) => (
              <DemoSection
                key={section.id}
                ref={(el) => {
                  sectionRefs.current[section.id] = el;
                }}
                id={section.id}
                title={section.title}
                description={section.description}
                bullets={section.bullets}
                icon={section.icon}
                imagePosition={index % 2 === 0 ? 'right' : 'left'}
              />
            ))}
            
            {/* Final CTA */}
            <section className="py-16 text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="max-w-2xl mx-auto"
              >
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  Pronto para transformar sua gestão imobiliária?
                </h2>
                <p className="text-muted-foreground mb-8">
                  Comece agora mesmo, sem custos. Experimente todas as funcionalidades por 14 dias.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild size="lg" className="px-8">
                    <Link to="/auth">
                      Começar Grátis
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link to="/">Voltar ao Início</Link>
                  </Button>
                </div>
              </motion.div>
            </section>
          </main>
        </div>
      </div>
      
      {/* Scroll to top button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-shadow z-50"
            aria-label="Voltar ao topo"
          >
            <ChevronUp className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
