import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  ChevronLeft, 
  Smartphone, 
  Zap, 
  LayoutGrid, 
  Bot, 
  Target, 
  BrainCircuit,
  Database,
  Lock,
  MessageSquare
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEOHead } from "@/components/SEOHead";

// Cores da Marca (Extraídas do Manual)
const colors = {
  blue: '#080073',
  purple: '#6024b4',
  turquoise: '#2fc9af',
  darkBg: '#0f172a',
};

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 1000 : -1000,
    opacity: 0,
    scale: 0.9,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 1000 : -1000,
    opacity: 0,
    scale: 0.9,
  }),
};

const PresentationDeck = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);

  const slides = [
    // SLIDE 1: CAPA
    {
      id: 'cover',
      render: () => (
        <div className="flex flex-col items-center justify-center h-full text-center space-y-8 animate-in fade-in duration-700">
          <div className="relative">
            <div className="absolute -inset-1 rounded-full blur opacity-30" style={{ backgroundColor: colors.turquoise }}></div>
            <div className="relative p-6 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20">
              <LayoutGrid size={64} style={{ color: colors.turquoise }} />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-6xl font-black tracking-tighter text-white">
              SLOTI<span style={{ color: colors.turquoise }}>MOB</span>
            </h1>
            <p className="text-xl font-light text-slate-300 tracking-widest uppercase">
              Sistema de Soluções Otimizadas
            </p>
          </div>
          <div className="max-w-2xl">
            <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
              "O Comando Central do Corretor de Elite"
            </p>
          </div>
          <div className="pt-12 flex gap-4">
            <Badge variant="outline" className="px-4 py-1 text-sm border-slate-700 text-slate-400">Versão 1.0</Badge>
            <Badge variant="outline" className="px-4 py-1 text-sm border-slate-700 text-slate-400">SaaS B2C</Badge>
          </div>
        </div>
      )
    },

    // SLIDE 2: O PROBLEMA
    {
      id: 'problem',
      render: () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center h-full">
          <div className="space-y-6">
            <h2 className="text-4xl font-bold text-white leading-tight">
              O corretor moderno está <span className="text-red-500">sobrecarregado</span>.
            </h2>
            <p className="text-slate-400 text-lg">
              A falta de ferramentas móveis adequadas cria um gargalo operacional que mata vendas todos os dias.
            </p>
            <ul className="space-y-4">
              {[
                { icon: MessageSquare, text: "WhatsApp: Mistura de conversas pessoais e profissionais." },
                { icon: Zap, text: "Perda de Leads: Demora no 'timing' da resposta." },
                { icon: Lock, text: "Dados Inacessíveis: Informações presas em planilhas no escritório." },
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="p-2 rounded-full bg-red-500/20 text-red-400">
                    <item.icon size={20} />
                  </div>
                  <span className="text-slate-200">{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative h-full min-h-[400px] bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700 p-8 flex items-center justify-center opacity-50">
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-slate-600 font-mono text-sm">Preview: Caos Operacional vs Organização</span>
            </div>
          </div>
        </div>
      )
    },

    // SLIDE 3: A SOLUÇÃO (PRODUTO)
    {
      id: 'solution',
      render: () => (
        <div className="flex flex-col h-full space-y-8">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-4xl font-bold text-white">Não é um CRM. É um <span style={{ color: colors.turquoise }}>Acelerador</span>.</h2>
            <p className="text-slate-400">Transformamos o celular numa imobiliária completa de um homem só.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {[
              { 
                title: "Smart Inventory", 
                desc: "Feed visual estilo Airbnb para consulta rápida na rua.",
                icon: LayoutGrid,
                color: colors.purple
              },
              { 
                title: "Fluxo Zero-Touch", 
                desc: "Captura automática de leads e transcrição de áudio com IA.",
                icon: Bot,
                color: colors.turquoise
              },
              { 
                title: "Pipeline Visual", 
                desc: "Gestão de vendas estilo Kanban focado em avançar etapas.",
                icon: Target,
                color: colors.blue
              }
            ].map((card, i) => (
              <Card key={i} className="bg-slate-800/50 border-slate-700 hover:border-slate-500 transition-all duration-300">
                <CardContent className="p-6 space-y-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${card.color}20`, color: card.color }}>
                    <card.icon size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-white">{card.title}</h3>
                  <p className="text-sm text-slate-400">{card.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )
    },

    // SLIDE 4: A MARCA (SLOTI)
    {
      id: 'brand',
      render: () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 h-full items-center">
          <div className="space-y-8">
            <div>
              <h2 className="text-5xl font-black text-white mb-2">sloti</h2>
              <p className="text-2xl text-slate-400 font-light">Soluções Otimizadas</p>
            </div>
            <p className="text-slate-300 leading-relaxed">
              O conceito de <strong>"Encaixe" (Slot)</strong> representa a integração perfeita de diversas ferramentas tecnológicas em um único sistema.
              <br/><br/>
              Arquétipo: <strong>O Governante</strong> (Controle) + <strong>O Mago</strong> (Tecnologia).
            </p>
          </div>
          <div className="space-y-6">
            <h3 className="text-sm uppercase tracking-widest text-slate-500">Paleta Oficial</h3>
            <div className="space-y-4">
              <div className="h-24 rounded-xl flex items-center px-6 justify-between shadow-lg" style={{ backgroundColor: colors.blue }}>
                <span className="text-white font-mono">#080073</span>
                <span className="text-white font-bold">Deep Blue</span>
              </div>
              <div className="h-24 rounded-xl flex items-center px-6 justify-between shadow-lg" style={{ backgroundColor: colors.purple }}>
                <span className="text-white font-mono">#6024b4</span>
                <span className="text-white font-bold">Tech Purple</span>
              </div>
              <div className="h-24 rounded-xl flex items-center px-6 justify-between shadow-lg" style={{ backgroundColor: colors.turquoise }}>
                <span className="text-slate-900 font-mono">#2fc9af</span>
                <span className="text-slate-900 font-bold">Action Turquoise</span>
              </div>
            </div>
          </div>
        </div>
      )
    },

    // SLIDE 5: TECNOLOGIA & STACK
    {
      id: 'tech',
      render: () => (
        <div className="flex flex-col items-center justify-center h-full space-y-12">
           <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-white">Low-Code / High-Performance</h2>
            <p className="text-slate-400">Arquitetura focada em velocidade de desenvolvimento e segurança.</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full max-w-4xl">
            {[
              { label: "Frontend", val: "React + Vite", icon: Smartphone },
              { label: "Database", val: "Supabase", icon: Database },
              { label: "Intelligence", val: "OpenAI + Whisper", icon: BrainCircuit },
              { label: "Connect", val: "Evolution API", icon: MessageSquare },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center space-y-4 p-6 rounded-2xl bg-slate-800/30 border border-slate-700">
                <div className="p-4 rounded-full bg-slate-700/50 text-white">
                  <item.icon size={32} />
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-500 uppercase font-bold">{item.label}</div>
                  <div className="text-lg font-bold text-white mt-1">{item.val}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="w-full max-w-2xl p-4 bg-slate-900/50 rounded-lg border border-slate-800 font-mono text-sm text-slate-400">
            <p className="mb-2 text-green-400">// MVP - Fase de Execução</p>
            <p>import <span className="text-yellow-300">Pipeline</span> from './pages/Pipeline';</p>
            <p>import <span className="text-yellow-300">Leads</span> from './pages/Leads';</p>
            <p>import <span className="text-yellow-300">Properties</span> from './pages/Properties';</p>
          </div>
        </div>
      )
    },

    // SLIDE 6: MODELO DE NEGÓCIO
    {
      id: 'business',
      render: () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center h-full">
          <Card className="bg-gradient-to-br from-[#080073] to-[#05004a] border-none text-white shadow-2xl transform hover:scale-105 transition-transform duration-500">
            <CardContent className="p-10 flex flex-col items-center text-center space-y-6">
              <span className="text-sm font-medium opacity-80 uppercase tracking-widest">Plano Anual</span>
              <div className="flex items-start">
                <span className="text-2xl mt-2">R$</span>
                <span className="text-7xl font-bold tracking-tighter">997</span>
              </div>
              <div className="space-y-2 w-full pt-6 border-t border-white/10">
                <div className="flex justify-between text-sm opacity-90">
                  <span>Custo Mensal (Tech)</span>
                  <span>~R$ 18,00</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-green-400">
                  <span>Margem Líquida</span>
                  <span>~78%</span>
                </div>
              </div>
              <Button className="w-full bg-[#2fc9af] hover:bg-[#25a08c] text-[#080073] font-bold mt-4">
                Assinar Agora
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-8">
            <h2 className="text-3xl font-bold text-white">Escalabilidade SaaS</h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-white font-medium">
                  <span>Break-Even Point</span>
                  <span className="text-green-400">1-2 Vendas</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-green-400 w-[10%]"></div>
                </div>
                <p className="text-xs text-slate-500">O projeto cobre custos iniciais quase imediatamente.</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl text-white font-semibold">Estratégia de Lock-in</h3>
                <p className="text-slate-400">
                  O módulo <strong>Smart Inventory</strong> atua como barreira de saída. Uma vez que o corretor cadastra seus imóveis, o custo de mudança torna-se alto, garantindo renovação.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  const nextSlide = () => {
    setDirection(1);
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };
  const prevSlide = () => {
    setDirection(-1);
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToSlide = (index: number) => {
    setDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <SEOHead 
        title="Apresentação SLOTIMOB"
        description="Conheça o SLOTIMOB - O comando central do corretor de elite. Sistema de soluções otimizadas para gestão imobiliária."
        path="/apresentacao"
      />
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden">
      {/* Header / Progress */}
      <div className="h-2 bg-slate-900 w-full">
        <motion.div 
          className="h-full"
          initial={false}
          animate={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ backgroundColor: colors.turquoise }}
        />
      </div>

      <header className="px-8 py-6 flex justify-between items-center bg-slate-950/50 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
           <LayoutGrid size={24} style={{ color: colors.turquoise }} />
           <span className="font-bold tracking-tight text-lg">SLOTI<span className="text-slate-500">MOB</span></span>
        </div>
        <div className="text-slate-500 text-sm font-medium">
          {currentSlide + 1} / {slides.length}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative flex items-center justify-center p-8 md:p-16 overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div 
            key={currentSlide}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.3 },
              scale: { duration: 0.3 },
            }}
            className="w-full max-w-6xl h-full flex flex-col justify-center"
          >
            {slides[currentSlide].render()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Navigation Footer */}
      <footer className="px-8 py-8 flex justify-between items-center">
        <Button 
          variant="ghost" 
          onClick={prevSlide}
          className="text-slate-400 hover:text-white hover:bg-white/5"
          disabled={currentSlide === 0}
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
        </Button>

        <div className="flex gap-2">
          {slides.map((_, idx) => (
            <motion.button
              key={idx}
              onClick={() => goToSlide(idx)}
              className={`h-2 rounded-full ${
                idx === currentSlide ? 'bg-[#2fc9af]' : 'bg-slate-800 hover:bg-slate-700'
              }`}
              animate={{ width: idx === currentSlide ? 32 : 8 }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>

        <Button 
          onClick={nextSlide}
          className="bg-white text-slate-950 hover:bg-slate-200"
        >
          {currentSlide === slides.length - 1 ? 'Finalizar' : 'Próximo'} <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </footer>
    </div>
    </>
  );
};

export default PresentationDeck;