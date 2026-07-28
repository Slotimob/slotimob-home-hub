import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Copy, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useMfa, type MfaEnrollResult } from '@/hooks/useMfa';

interface MfaEnrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 1 | 2 | 3;

const APPS = ['Google Authenticator', 'Authy', '1Password', 'Microsoft Authenticator'];

export function MfaEnrollDialog({ open, onOpenChange }: MfaEnrollDialogProps) {
  const { enroll, verifyEnrollment, unenroll } = useMfa();

  const [step, setStep] = useState<Step>(1);
  const [enrollment, setEnrollment] = useState<MfaEnrollResult | null>(null);
  const [code, setCode] = useState('');
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reset = () => {
    setStep(1);
    setEnrollment(null);
    setCode('');
    setIsEnrolling(false);
    setIsVerifying(false);
    setIsVerified(false);
    setErrorMessage(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      if (enrollment && !isVerified) {
        void unenroll(enrollment.factorId).catch(() => undefined);
      }
      reset();
    }
    onOpenChange(next);
  };

  const handleStart = async () => {
    setIsEnrolling(true);
    setErrorMessage(null);
    try {
      const result = await enroll('Slotimob');
      setEnrollment(result);
      setStep(2);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Não foi possível concluir a operação. Tente novamente.');
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleCopySecret = async () => {
    if (!enrollment) return;
    try {
      await navigator.clipboard.writeText(enrollment.secret);
      toast.success('Chave copiada!', { duration: 1000 });
    } catch {
      toast.error('Não foi possível copiar a chave.', { duration: 1000 });
    }
  };

  const handleCodeChange = async (value: string) => {
    setCode(value);
    setErrorMessage(null);
    if (value.length !== 6 || !enrollment || isVerifying) return;

    setIsVerifying(true);
    try {
      await verifyEnrollment(enrollment.factorId, value);
      setIsVerified(true);
      toast.success('Verificação em duas etapas ativada!', { duration: 1000 });
      setTimeout(() => {
        onOpenChange(false);
        reset();
      }, 2500);
    } catch (err) {
      setCode('');
      setErrorMessage(err instanceof Error ? err.message : 'Não foi possível concluir a operação. Tente novamente.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Verificação em duas etapas
          </DialogTitle>
          <DialogDescription>
            {step === 1 && 'Adicione uma camada extra de segurança à sua conta.'}
            {step === 2 && 'Escaneie o QR Code no seu aplicativo autenticador.'}
            {step === 3 && 'Digite o código de 6 dígitos gerado pelo aplicativo.'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              A verificação em duas etapas exige, além da sua senha, um código temporário gerado por um
              aplicativo autenticador no seu celular. Assim, mesmo que sua senha vaze, sua conta continua protegida.
            </p>
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-sm font-medium mb-2">Aplicativos compatíveis</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {APPS.map((app) => (
                  <li key={app}>• {app}</li>
                ))}
              </ul>
            </div>
            {errorMessage && (
              <Alert variant="destructive">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleStart} disabled={isEnrolling}>
                {isEnrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continuar'}
              </Button>
            </div>
          </div>
        )}

        {step === 2 && enrollment && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <img
                src={enrollment.qrCode}
                alt="QR Code para configurar o app autenticador"
                className="h-48 w-48 rounded-lg border bg-background p-2"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Não consegue escanear? Informe esta chave manualmente no aplicativo:
              </p>
              <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-2">
                <code className="flex-1 break-all font-mono text-xs">{enrollment.secret}</code>
                <Button type="button" variant="ghost" size="icon" onClick={handleCopySecret} aria-label="Copiar chave">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={() => setStep(3)}>Já escaneei</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={code} onChange={handleCodeChange} disabled={isVerifying || isVerified}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            {isVerifying && (
              <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verificando código...
              </p>
            )}

            {errorMessage && (
              <Alert variant="destructive">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            {isVerified && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Guarde o acesso ao seu aplicativo autenticador. Se você perder o dispositivo, será necessário
                  contato com o suporte para recuperar o acesso à conta.
                </AlertDescription>
              </Alert>
            )}

            {!isVerified && (
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(2)} disabled={isVerifying}>
                  Voltar
                </Button>
                <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isVerifying}>
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
