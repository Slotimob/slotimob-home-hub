import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { WhatsAppUsageStatus } from '@/components/whatsapp/WhatsAppUsageStatus';
import { BuyCreditsDialog } from '@/components/whatsapp/BuyCreditsDialog';
import { useWhatsAppSettingsConnection } from '@/hooks/useWhatsApp';
import { 
  ArrowLeft, Wifi, WifiOff, RefreshCw, Trash2, Phone, QrCode,
  Loader2, CheckCircle, XCircle, AlertCircle, Clock
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function WhatsAppSettings() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { connection, loading: connectionLoading, waitingForQr, setWaitingForQr, refetch } = useWhatsAppSettingsConnection();
  
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Create instance mutation
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
    onSuccess: (data) => {
      setIsCreating(false);
      if (data?.connection?.qr_code_base64) {
        setWaitingForQr(false);
        toast({
          title: 'QR Code gerado',
          description: 'Escaneie o QR Code com seu WhatsApp.',
        });
      } else {
        // Keep waitingForQr=true — Realtime will detect the update
        toast({
          title: 'Instância criada',
          description: 'Aguardando QR Code via servidor. Isso pode levar até 30 segundos.',
        });
      }
      refetch();
      queryClient.invalidateQueries({ queryKey: ['whatsapp-connections'] });
    },
    onError: (error) => {
      setIsCreating(false);
      setWaitingForQr(false);
      toast({
        title: 'Erro ao criar instância',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Refresh QR mutation
  const refreshQr = useMutation({
    mutationFn: async () => {
      const response = await supabase.functions.invoke('whatsapp-instance', {
        body: { action: 'refresh_qr' },
      });
      if (response.error) throw response.error;
      if (response.data.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar QR', description: error.message, variant: 'destructive' });
    },
  });

  // Check status mutation
  const checkStatus = useMutation({
    mutationFn: async () => {
      const response = await supabase.functions.invoke('whatsapp-instance', {
        body: { action: 'status' },
      });
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      toast({ title: 'Erro ao verificar status', description: error.message, variant: 'destructive' });
    },
  });

  // Disconnect mutation
  const disconnectInstance = useMutation({
    mutationFn: async () => {
      const response = await supabase.functions.invoke('whatsapp-instance', {
        body: { action: 'disconnect' },
      });
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
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Pendente</Badge>;
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

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const hasQrCode = connection?.qr_code_base64 && connection.qr_code_base64.length > 100;
  const isConnecting = connection?.connection_status === 'connecting' || waitingForQr;
  const isConnected = connection?.status === 'connected' || connection?.connection_status === 'open';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 p-6">
          <div className="flex items-center gap-4 mb-6">
            <SidebarTrigger />
            <Button variant="ghost" size="icon" asChild>
              <Link to="/whatsapp">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">Configurações do WhatsApp</h1>
          </div>

          <div className="max-w-3xl space-y-6">
            {/* Usage Status */}
            <WhatsAppUsageStatus onBuyCredits={() => setShowBuyCredits(true)} />

            {/* Existing Connection */}
            {connection && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {isConnected ? (
                          <Wifi className="h-5 w-5 text-green-500" />
                        ) : (
                          <WifiOff className="h-5 w-5 text-muted-foreground" />
                        )}
                        {connection.instance_name}
                      </CardTitle>
                      <CardDescription>
                        {connection.phone_number ? (
                          <span className="flex items-center gap-1 mt-1">
                            <Phone className="h-3 w-3" />
                            +{connection.phone_number}
                          </span>
                        ) : (
                          'Nenhum número conectado'
                        )}
                      </CardDescription>
                    </div>
                    {getStatusBadge(connection.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Waiting for QR — server is preparing */}
                  {isConnecting && !hasQrCode && (
                    <div className="flex flex-col items-center p-6 bg-muted/50 rounded-lg border border-dashed">
                      <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
                      <p className="text-sm font-medium text-foreground">
                        O servidor está preparando sua conexão...
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Isso pode levar até 30 segundos. O QR Code aparecerá automaticamente.
                      </p>
                      <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Aguardando resposta do servidor...
                      </div>
                    </div>
                  )}

                  {/* QR Code Display */}
                  {hasQrCode && !isConnected && (
                    <div className="flex flex-col items-center p-4 bg-white rounded-lg">
                      <p className="text-sm text-muted-foreground mb-3">
                        Escaneie o QR Code com seu WhatsApp
                      </p>
                      <img 
                        src={connection.qr_code_base64!.startsWith('data:') ? connection.qr_code_base64! : `data:image/png;base64,${connection.qr_code_base64}`}
                        alt="QR Code" 
                        className="w-64 h-64"
                      />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => checkStatus.mutate()}
                      disabled={checkStatus.isPending}
                    >
                      {checkStatus.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Verificar Status
                    </Button>

                    {!isConnected && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refreshQr.mutate()}
                        disabled={refreshQr.isPending}
                      >
                        {refreshQr.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <QrCode className="h-4 w-4 mr-2" />
                        )}
                        Novo QR Code
                      </Button>
                    )}

                    {isConnected && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => disconnectInstance.mutate()}
                        disabled={disconnectInstance.isPending}
                      >
                        {disconnectInstance.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <WifiOff className="h-4 w-4 mr-2" />
                        )}
                        Desconectar
                      </Button>
                    )}

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remover
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover configuração?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação irá remover a conexão do WhatsApp e todas as conversas serão perdidas.
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => disconnectInstance.mutate()}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Create New Connection */}
            {!connection && (
              <Card>
                <CardHeader>
                  <CardTitle>Conectar WhatsApp</CardTitle>
                  <CardDescription>
                    Conecte seu WhatsApp Business para gerenciar conversas com clientes diretamente na plataforma.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => createInstance.mutate()}
                    disabled={isCreating || createInstance.isPending}
                    className="w-full"
                  >
                    {isCreating || createInstance.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Wifi className="h-4 w-4 mr-2" />
                    )}
                    {isCreating ? 'Criando conexão...' : 'Criar Conexão WhatsApp'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Help Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Precisa de ajuda?</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  A integração com WhatsApp permite que você gerencie conversas com clientes diretamente na plataforma.
                </p>
                <p>
                  <strong>Como funciona:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Clique em "Criar Conexão WhatsApp"</li>
                  <li>Aguarde o QR Code aparecer (pode levar até 30 segundos)</li>
                  <li>Escaneie o QR Code com seu WhatsApp</li>
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
