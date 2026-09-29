import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type PlatformPaymentResultData =
  | { type: 'pix'; pix: { encodedImage: string; payload: string; expirationDate?: string }; url?: string }
  | { type: 'redirect'; url: string };

interface PlatformPaymentResultProps {
  result: PlatformPaymentResultData;
  title?: string;
}

export function PlatformPaymentResult({ result, title }: PlatformPaymentResultProps) {
  if (result.type === 'pix') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">✅</span>
          <h3 className="font-semibold text-foreground">{title ?? 'PIX gerado!'}</h3>
        </div>
        <p className="text-sm text-muted-foreground">Escaneie o QR code ou copie o código para pagar.</p>
        <div className="flex justify-center">
          <img
            src={`data:image/png;base64,${result.pix.encodedImage}`}
            alt="QR Code PIX"
            className="w-48 h-48 rounded-lg border border-border"
          />
        </div>
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => {
            navigator.clipboard.writeText(result.pix.payload);
            toast.success('Código PIX copiado!');
          }}
        >
          📋 Copiar código PIX (Copia e Cola)
        </Button>
        {result.pix.expirationDate && (
          <p className="text-xs text-muted-foreground text-center">
            Válido até{' '}
            {new Date(result.pix.expirationDate).toLocaleString('pt-BR', {
              timeZone: 'America/Sao_Paulo',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
        {result.url && (
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-sm text-accent underline"
          >
            Abrir fatura no Asaas
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">🔒</span>
        <h3 className="font-semibold text-foreground">{title ?? 'Link de pagamento gerado'}</h3>
      </div>
      <a
        href={result.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          buttonVariants({ size: 'lg' }),
          'w-full h-auto min-h-12 whitespace-normal text-center bg-accent hover:bg-accent/90 text-accent-foreground',
        )}
      >
        Pagar com cartão no ambiente seguro do Asaas
      </a>
      <p className="text-sm text-muted-foreground">
        Abra a fatura, informe o cartão e volte para esta aba. Liberamos o acesso assim que o Asaas confirmar.
      </p>
    </div>
  );
}

export default PlatformPaymentResult;
