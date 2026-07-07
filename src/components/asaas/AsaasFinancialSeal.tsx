import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const URL_POSITIVO =
  'https://baas.asaas.com/selos/Servicos_financeiros_Asaas-Reduzida-Positivo.svg?id=9f9c8c86-8071-4cd9-a6dd-1b5afe14b23f';
const URL_NEGATIVO_BRANCO =
  'https://baas.asaas.com/selos/Servicos_financeiros_Asaas-Reduzida-Negativo-Branco.svg?id=9f9c8c86-8071-4cd9-a6dd-1b5afe14b23f';
const URL_NEGATIVO_PRETO =
  'https://baas.asaas.com/selos/Servicos_financeiros_Asaas-Reduzida-Negativo-Preto.svg?id=9f9c8c86-8071-4cd9-a6dd-1b5afe14b23f';

function isDarkTheme(): boolean {
  const theme = document.documentElement.getAttribute('data-theme') || '';
  return theme.startsWith('dark');
}

export interface AsaasFinancialSealProps {
  variant?: 'auto' | 'positivo' | 'negativo-branco' | 'negativo-preto';
  size?: 'sm' | 'md';
  className?: string;
}

export function AsaasFinancialSeal({
  variant = 'auto',
  size = 'md',
  className,
}: AsaasFinancialSealProps) {
  const [dark, setDark] = useState(() => isDarkTheme());

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setDark(isDarkTheme());
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  let url: string;
  if (variant === 'positivo') {
    url = URL_POSITIVO;
  } else if (variant === 'negativo-preto') {
    url = URL_NEGATIVO_PRETO;
  } else if (variant === 'negativo-branco') {
    url = URL_NEGATIVO_BRANCO;
  } else {
    url = dark ? URL_NEGATIVO_BRANCO : URL_POSITIVO;
  }

  const width = size === 'sm' ? 120 : 160;
  const height = size === 'sm' ? 36 : 48;

  return (
    <a
      href="https://asaas.com"
      target="_blank"
      rel="noopener noreferrer"
      className={cn('inline-block', className)}
    >
      <img
        src={url}
        alt="Serviços financeiros Asaas"
        width={width}
        height={height}
        loading="lazy"
        style={{ display: 'inline-block' }}
      />
    </a>
  );
}

export function AsaasTransparencyNote({ className }: { className?: string }) {
  return (
    <p className={cn('text-xs text-muted-foreground', className)}>
      Os serviços financeiros e de pagamento (conta, boletos, PIX e transferências) são prestados pelo
      Asaas Gestão Financeira Instituição de Pagamentos S.A., instituição autorizada pelo Banco
      Central do Brasil. Suporte Asaas: 0800 009 0037 · contato@asaas.com.br
    </p>
  );
}
