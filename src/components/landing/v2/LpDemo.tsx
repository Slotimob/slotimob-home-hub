import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Reveal } from './Reveal';

// Substitua YOUTUBE_VIDEO_ID pelo ID real do vídeo quando disponível
const YOUTUBE_VIDEO_ID = 'OEuA9evem7M';

export default function LpDemo() {
  return (
    <section id="demo" className="py-16 md:py-24 lp-dark">
      <div className="max-w-[1280px] mx-auto px-5 md:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — texto */}
          <div>
            <Reveal delay={60}>
              <h2 className="lp-display text-[38px] md:text-[64px] leading-none mb-6">
                conheça o sistema
                <br />
                <em className="lp-serif" style={{ fontStyle: 'italic', color: '#14D9B4' }}>antes</em> de assinar.
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <p
                className="text-[15px] md:text-[17px] leading-relaxed mb-8 max-w-[48ch]"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
                Em menos de 3 minutos você vê boletos saindo no automático, reajuste
                aplicado sem você pedir e quanto cada imóvel rendeu no mês.
              </p>
            </Reveal>
            <Reveal delay={140}>
              <ul className="space-y-3 mb-10">
                {[
                  'Boleto gerado e enviado no dia certo — sem você tocar em nada',
                  'Reajuste IGPM ou IPCA calculado e aplicado na data do contrato',
                  'DRE com resultado líquido por imóvel, pronto para o IR',
                  'Inquilino recebe cobrança e responde pelo WhatsApp do sistema',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[14px]" style={{ color: 'rgba(255,255,255,0.75)' }}>
                    <span className="mt-1 w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(20,217,180,0.2)' }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#14D9B4' }} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={180}>
              <Link
                to="/checkout?plan=pro&trial=true"
                className="lp-btn lp-btn-primary inline-flex items-center gap-2"
                style={{ background: '#FFFFFF', color: '#0B0073' }}
              >
                começar trial grátis <ArrowUpRight className="w-4 h-4" />
              </Link>
            </Reveal>
          </div>

          {/* Right — YouTube iframe 16:9 */}
          <Reveal delay={80} y={32}>
            <div className="w-full">
              <div
                className="relative w-full rounded-2xl overflow-hidden shadow-2xl"
                style={{ paddingBottom: '56.25%' /* 16:9 */ }}
              >
                <iframe
                  src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?rel=0&modestbranding=1&controls=1`}
                  title="Demonstração do Slotimob"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                  className="absolute inset-0 w-full h-full"
                  style={{ border: 'none' }}
                />
              </div>
              <p className="mt-3 text-center text-[12px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                demonstração real do sistema · dados fictícios
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
