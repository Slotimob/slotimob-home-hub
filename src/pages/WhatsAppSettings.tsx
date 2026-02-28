import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { WhatsAppUsageStatus } from '@/components/whatsapp/WhatsAppUsageStatus';
import { BuyCreditsDialog } from '@/components/whatsapp/BuyCreditsDialog';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { useQuery } from '@tanstack/react-query';
import { useWhatsAppSettingsConnection } from '@/hooks/useWhatsApp';
import { 
  ArrowLeft, Wifi, WifiOff, RefreshCw, Trash2, Phone, QrCode,
  Loader2, CheckCircle, XCircle, AlertCircle, Clock, Timer, AlertTriangle
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const QR_EXPIRY_SECONDS = 14;

function QrExpiryTimer({ onExpire }: { onExpire: () => void }) {
  const [secondsLeft, setSecondsLeft] = useState(QR_EXPIRY_SECONDS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setSecondsLeft(QR_EXPIRY_SECONDS);
    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [onExpire]);

  const progress = (secondsLeft / QR_EXPIRY_SECONDS) * 100;
  const isUrgent = secondsLeft <= 5;

  return (
    <div className="w-full space-y-2 mt-3">
      <div className="flex items-center justify-between text-xs">
        <span className={`flex items-center gap-1 font-medium ${isUrgent ? 'text-destructive animate-pulse' : 'text-amber-600 dark:text-amber-400'}`}>
          <Timer className="h-3 w-3" />
          {secondsLeft > 0 ? `Expira em ${secondsLeft}s — escaneie agora!` : 'QR expirado! Gere um novo.'}
        </span>
      </div>
      <Progress value={progress} className={`h-1.5 ${isUrgent ? '[&>div]:bg-destructive' : '[&>div]:bg-amber-500'}`} />
    </div>
  );
}

function PreparingCard({ countdown, onCancel }: { countdown: number | null; onCancel: () => void }) {
  const [progress, setProgress] = useState(10);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => Math.min(prev + Math.random() * 8, 90));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center p-6 bg-muted/50 rounded-lg border border-dashed space-y-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-foreground">
          Nosso servidor está configurando sua instância em segundo plano.
        </p>
        <p className="text-xs text-muted-foreground max-w-md">
          Você pode continuar navegando na plataforma — avisaremos você quando o código estiver pronto.
        </p>
      </div>
      <Progress value={progress} className="w-full max-w-xs h-2 [&>div]:bg-primary" />
      {countdown !== null && countdown > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Timer className="h-3 w-3" />
          Tempo restante: <strong className={countdown <= 10 ? 'text-destructive' : ''}>{countdown}s</strong>
        </div>
      )}
      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={onCancel}>
        <XCircle className="h-4 w-4 mr-1" />
        Cancelar Solicitação
      </Button>
    </div>
  );
}

export default function WhatsAppSettings() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { connection, loading: connectionLoading, waitingForQr, setWaitingForQr, countdown, timedOut, setTimedOut, cancelRequest, refetch } = useWhatsAppSettingsConnection();
  
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const { features } = useSubscriptionLimits();
  const instancesLimit = features?.whatsapp_instances_limit ?? 0;

  const { data: activeConnectionsCount = 0 } = useQuery({
    queryKey: ['whatsapp-active-connections-settings', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count, error } = await supabase
        .from('whatsapp_connections')
        .select('id', { count: 'exact', head: true })
        .eq('broker_id', user.id)
        .eq('status', 'connected');
      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [qrExpired, setQrExpired] = useState(false);

  // Reset expired state when QR changes
  useEffect(() => {
    if (connection?.qr_code_base64) {
      setQrExpired(false);
    }
  }, [connection?.qr_code_base64]);

  const createInstance = useMutation({
    mutationFn: async () => {
      setIsCreating(true);
      setWaitingForQr(true);
      const response = await supabase.functions.invoke('whatsapp-instance', {
        body: { action: 'create' },
      });
      if (response.error) throw response.error;
      if (response.data.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      setIsCreating(false);
      toast({
        title: 'Instância sendo criada',
        description: 'O QR Code aparecerá automaticamente. Você pode navegar pela plataforma.',
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['whatsapp-connections'] });
    },
    onError: (error) => {
      setIsCreating(false);
      setWaitingForQr(false);
      toast({ title: 'Erro ao criar instância', description: error.message, variant: 'destructive' });
    },
  });

  const refreshQr = useMutation({
    mutationFn: async () => {
      const response = await supabase.functions.invoke('whatsapp-instance', {
        body: { action: 'refresh_qr' },
      });
      if (response.error) throw response.error;
      if (response.data.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => { setQrExpired(false); refetch(); },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar QR', description: error.message, variant: 'destructive' });
    },
  });

  const checkStatus = useMutation({
    mutationFn: async () => {
      const response = await supabase.functions.invoke('whatsapp-instance', { body: { action: 'status' } });
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => { refetch(); },
    onError: (error) => {
      toast({ title: 'Erro ao verificar status', description: error.message, variant: 'destructive' });
    },
  });

  const disconnectInstance = useMutation({
    mutationFn: async () => {
      const response = await supabase.functions.invoke('whatsapp-instance', { body: { action: 'disconnect' } });
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      toast({ title: 'Desconectado', description: 'WhatsApp desconectado com sucesso.' });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['whatsapp-connections'] });
    },
    onError: (error) => {
      toast({ title: 'Erro ao desconectar', description: error.message, variant: 'destructive' });
    },
  });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Conectado</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Preparando</Badge>;
      case 'disconnected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Desconectado</Badge>;
      default:
        return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Pendente</Badge>;
    }
  };

  if (authLoading || connectionLoading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <main className="flex-1 p-6">
            <Skeleton className="h-[600px] w-full" />
          </main>
        </div>
      </SidebarProvider>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const hasQrCode = connection?.qr_code_base64 && connection.qr_code_base64.length > 100;
  const isPreparing = connection?.connection_status === 'preparing' || waitingForQr;
  const isConnecting = connection?.connection_status === 'connecting';
  const isConnected = connection?.status === 'connected' || connection?.connection_status === 'open';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 p-6">
          <div className="flex items-center gap-4 mb-6">
            <SidebarTrigger />
            <Button variant="ghost" size="icon" asChild>
              <Link to="/whatsapp"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <h1 className="text-2xl font-bold">Configurações do WhatsApp</h1>
          </div>

          <div className="max-w-3xl space-y-6">
            <WhatsAppUsageStatus activeConnections={activeConnectionsCount} instancesLimit={instancesLimit} onBuyExtra={() => setShowBuyCredits(true)} />

            {connection && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {isConnected ? <Wifi className="h-5 w-5 text-green-500" /> : <WifiOff className="h-5 w-5 text-muted-foreground" />}
                        {connection.instance_name}
                      </CardTitle>
                      <CardDescription>
                        {connection.phone_number ? (
                          <span className="flex items-center gap-1 mt-1"><Phone className="h-3 w-3" />+{connection.phone_number}</span>
                        ) : 'Nenhum número conectado'}
                      </CardDescription>
                    </div>
                    {getStatusBadge(connection.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Preparing state — background progress */}
                  {(isPreparing || isConnecting) && !hasQrCode && !timedOut && (
                    <PreparingCard countdown={countdown} onCancel={cancelRequest} />
                  )}

                  {/* Timeout Error */}
                  {timedOut && !isConnected && !hasQrCode && (
                    <div className="flex flex-col items-center p-6 bg-destructive/5 rounded-lg border border-destructive/20 space-y-3">
                      <AlertTriangle className="h-8 w-8 text-destructive" />
                      <p className="text-sm font-medium text-destructive">O servidor demorou muito para responder.</p>
                      <p className="text-xs text-muted-foreground">Tente novamente.</p>
                      <Button variant="outline" size="sm" onClick={() => { setTimedOut(false); createInstance.mutate(); }}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Tentar Novamente
                      </Button>
                    </div>
                  )}

                  {/* QR Code Display with expiry timer */}
                  {hasQrCode && !isConnected && !qrExpired && (
                    <div className="flex flex-col items-center p-4 bg-white rounded-lg">
                      <p className="text-sm text-muted-foreground mb-3">
                        Escaneie o QR Code com seu WhatsApp
                      </p>
                      <img 
                        src={connection.qr_code_base64!.startsWith('data:') ? connection.qr_code_base64! : `data:image/png;base64,${connection.qr_code_base64}`}
                        alt="QR Code" 
                        className="w-64 h-64"
                      />
                      <QrExpiryTimer onExpire={() => setQrExpired(true)} />
                    </div>
                  )}

                  {/* QR Expired */}
                  {hasQrCode && qrExpired && !isConnected && (
                    <div className="flex flex-col items-center p-6 bg-destructive/5 rounded-lg border border-destructive/20">
                      <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                      <p className="text-sm font-medium text-destructive">QR Code expirado</p>
                      <p className="text-xs text-muted-foreground mt-1">Clique abaixo para gerar um novo código.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => refreshQr.mutate()}
                        disabled={refreshQr.isPending}
                      >
                        {refreshQr.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <QrCode className="h-4 w-4 mr-2" />}
                        Gerar Novo QR Code
                      </Button>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => checkStatus.mutate()} disabled={checkStatus.isPending}>
                      {checkStatus.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                      Verificar Status
                    </Button>

                    {!isConnected && !qrExpired && (
                      <Button variant="outline" size="sm" onClick={() => refreshQr.mutate()} disabled={refreshQr.isPending}>
                        {refreshQr.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <QrCode className="h-4 w-4 mr-2" />}
                        Novo QR Code
                      </Button>
                    )}

                    {isConnected && (
                      <Button variant="outline" size="sm" onClick={() => disconnectInstance.mutate()} disabled={disconnectInstance.isPending}>
                        {disconnectInstance.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <WifiOff className="h-4 w-4 mr-2" />}
                        Desconectar
                      </Button>
                    )}

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-2" />Remover</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover configuração?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação irá remover a conexão do WhatsApp e todas as conversas serão perdidas. Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => disconnectInstance.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            )}

            {!connection && (
              <Card>
                <CardHeader>
                  <CardTitle>Conectar WhatsApp</CardTitle>
                  <CardDescription>
                    Conecte seu WhatsApp Business para gerenciar conversas com clientes diretamente na plataforma.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => createInstance.mutate()} disabled={isCreating || createInstance.isPending} className="w-full">
                    {isCreating || createInstance.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wifi className="h-4 w-4 mr-2" />}
                    {isCreating ? 'Criando conexão...' : 'Criar Conexão WhatsApp'}
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle className="text-base">Precisa de ajuda?</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>A integração com WhatsApp permite que você gerencie conversas com clientes diretamente na plataforma.</p>
                <p><strong>Como funciona:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Clique em "Criar Conexão WhatsApp"</li>
                  <li>Continue navegando — avisaremos quando o QR Code estiver pronto</li>
                  <li>Escaneie o QR Code rapidamente (expira em ~14 segundos)</li>
                  <li>Pronto! Suas mensagens aparecerão na aba WhatsApp</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
      <BuyCreditsDialog open={showBuyCredits} onOpenChange={setShowBuyCredits} />
    </SidebarProvider>
  );
}
