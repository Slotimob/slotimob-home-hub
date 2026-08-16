import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Lock, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const MEMBER_PERMISSION_MESSAGE =
  'Você não tem permissão para acessar este módulo. Fale com o administrador da sua conta.';

interface MemberFeatureDeniedProps {
  children?: ReactNode;
  overlay?: boolean;
  className?: string;
}

export function MemberFeatureDenied({
  children,
  overlay = true,
  className,
}: MemberFeatureDeniedProps) {
  const navigate = useNavigate();

  const content = (
    <div className={cn('text-center p-6 max-w-md', className)}>
      <div className="mx-auto mb-4 text-muted-foreground">
        <ShieldAlert className="h-8 w-8 mx-auto" />
      </div>
      <div className="flex items-center justify-center gap-2 mb-2">
        <Lock className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Acesso restrito</span>
      </div>
      <p className="text-foreground font-medium">{MEMBER_PERMISSION_MESSAGE}</p>
    </div>
  );

  if (!overlay || !children) {
    return (
      <AppLayout title="Acesso restrito">
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          {content}
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <Home className="h-4 w-4 mr-2" />
            Voltar ao início
          </Button>
        </div>
      </AppLayout>
    );
  }


  return (
    <div className="relative">
      <div className="blur-sm pointer-events-none select-none opacity-50">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
        {content}
      </div>
    </div>
  );
}