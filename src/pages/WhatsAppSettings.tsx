import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { WhatsAppUsageStatus } from '@/components/whatsapp/WhatsAppUsageStatus';
import { BuyCreditsDialog } from '@/components/whatsapp/BuyCreditsDialog';
import { 
  ArrowLeft, Wifi, WifiOff, RefreshCw, Trash2, Phone, QrCode,
  Loader2, CheckCircle, XCircle, AlertCircle, ShieldCheck
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type Connection = {
  id: string;
  broker_id: string;
  instance_name: string;
  evolution_api_url: string;
  phone_number: string | null;
  status: 'pending' | 'connecting' | 'connected' | 'disconnected';
  webhook_url: string | null;
  webhook_secret: string | null;
  qr_code: string | null;
  connected_at: string | null;
  created_at: string;
};

export default function WhatsAppSettings() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [instanceName, setInstanceName] = useState('');
  const [evolutionApiUrl, setEvolutionApiUrl] = useState('');
  const [evolutionApiKey, setEvolutionApiKey] = useState('');
  const [showBuyCredits, setShowBuyCredits] = useState(false);

  // DISABLED: WhatsApp connections query - causing 406 errors that block network
  // TODO: Re-enable once whatsapp_connections table RLS is fixed
  const connections: Connection[] = [];
  const connectionsLoading = false;
  const refetch = () => Promise.resolve();

  // Create instance mutation
  const createInstance = useMutation({
    mutationFn: async () => {
      const response = await supabase.functions.invoke('whatsapp-instance', {
        body: {
          action: 'create',
          instanceName,
          evolutionApiUrl: evolutionApiUrl.replace(/\/$/, ''),
          evolutionApiKey,
        },
      });

      if (response.error) throw response.error;
      if (response.data.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: 'Instância criada',
        description: 'Escaneie o QR Code para conectar seu WhatsApp.',
      });
      setInstanceName('');
      setEvolutionApiUrl('');
      setEvolutionApiKey('');
      queryClient.invalidateQueries({ queryKey: ['whatsapp-connections'] });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar instância',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Connect mutation (refresh QR)
  const connectInstance = useMutation({
    mutationFn: async (connectionId: string) => {
      const response = await supabase.functions.invoke('whatsapp-instance', {
        body: {
          action: 'connect',
          connectionId,
        },
      });

      if (response.error) throw response.error;
      if (response.data.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-connections'] });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao conectar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Check status mutation
  const checkStatus = useMutation({
    mutationFn: async (connectionId: string) => {
      const response = await supabase.functions.invoke('whatsapp-instance', {
        body: {
          action: 'status',
          connectionId,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-connections'] });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao verificar status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Disconnect mutation
  const disconnectInstance = useMutation({
    mutationFn: async (connectionId: string) => {
      const response = await supabase.functions.invoke('whatsapp-instance', {
        body: {
          action: 'disconnect',
          connectionId,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: 'Desconectado',
        description: 'WhatsApp desconectado com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-connections'] });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao desconectar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete mutation
  const deleteInstance = useMutation({
    mutationFn: async (connectionId: string) => {
      const response = await supabase.functions.invoke('whatsapp-instance', {
        body: {
          action: 'delete',
          connectionId,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: 'Instância removida',
        description: 'Configuração do WhatsApp removida com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-connections'] });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao remover',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Conectado</Badge>;
      case 'connecting':
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Conectando</Badge>;
      case 'disconnected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Desconectado</Badge>;
      default:
        return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Pendente</Badge>;
    }
  };

  if (authLoading || connectionsLoading) {
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

  const hasExistingConnection = connections && connections.length > 0;

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

            {/* Existing Connections */}
            {connections?.map((conn) => (
              <Card key={conn.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {conn.status === 'connected' ? (
                          <Wifi className="h-5 w-5 text-green-500" />
                        ) : (
                          <WifiOff className="h-5 w-5 text-muted-foreground" />
                        )}
                        {conn.instance_name}
                      </CardTitle>
                      <CardDescription>
                        {conn.phone_number ? (
                          <span className="flex items-center gap-1 mt-1">
                            <Phone className="h-3 w-3" />
                            +{conn.phone_number}
                          </span>
                        ) : (
                          'Nenhum número conectado'
                        )}
                      </CardDescription>
                    </div>
                    {getStatusBadge(conn.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* QR Code Display */}
                  {(conn.status === 'pending' || conn.status === 'connecting') && conn.qr_code && (
                    <div className="flex flex-col items-center p-4 bg-white rounded-lg">
                      <p className="text-sm text-muted-foreground mb-3">
                        Escaneie o QR Code com seu WhatsApp
                      </p>
                      <img 
                        src={conn.qr_code} 
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
                      onClick={() => checkStatus.mutate(conn.id)}
                      disabled={checkStatus.isPending}
                    >
                      {checkStatus.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Verificar Status
                    </Button>

                    {conn.status !== 'connected' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => connectInstance.mutate(conn.id)}
                        disabled={connectInstance.isPending}
                      >
                        {connectInstance.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <QrCode className="h-4 w-4 mr-2" />
                        )}
                        Novo QR Code
                      </Button>
                    )}

                    {conn.status === 'connected' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => disconnectInstance.mutate(conn.id)}
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
                            onClick={() => deleteInstance.mutate(conn.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  {/* API Info */}
                  <div className="text-xs text-muted-foreground pt-2 border-t space-y-1">
                    <p>API URL: {conn.evolution_api_url}</p>
                    <p className="flex items-center gap-1">
                      API Key: 
                      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                        <ShieldCheck className="h-3 w-3" />
                        Criptografada
                      </span>
                    </p>
                    <p>Webhook: {conn.webhook_url}</p>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Create New Connection */}
            {!hasExistingConnection && (
              <Card>
                <CardHeader>
                  <CardTitle>Conectar WhatsApp</CardTitle>
                  <CardDescription>
                    Configure sua conexão com a Evolution API para gerenciar mensagens do WhatsApp.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="instanceName">Nome da Instância</Label>
                    <Input
                      id="instanceName"
                      placeholder="minha-imobiliaria"
                      value={instanceName}
                      onChange={(e) => setInstanceName(e.target.value.replace(/\s+/g, '-').toLowerCase())}
                    />
                    <p className="text-xs text-muted-foreground">
                      Identificador único para sua conexão (apenas letras, números e hífens)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="evolutionApiUrl">URL da Evolution API</Label>
                    <Input
                      id="evolutionApiUrl"
                      placeholder="https://sua-api.evolution.com"
                      value={evolutionApiUrl}
                      onChange={(e) => setEvolutionApiUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      URL do seu servidor Evolution API
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="evolutionApiKey">API Key</Label>
                    <Input
                      id="evolutionApiKey"
                      type="password"
                      placeholder="Sua chave de API"
                      value={evolutionApiKey}
                      onChange={(e) => setEvolutionApiKey(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Chave de autenticação da Evolution API
                    </p>
                  </div>

                  <Button
                    onClick={() => createInstance.mutate()}
                    disabled={!instanceName || !evolutionApiUrl || !evolutionApiKey || createInstance.isPending}
                    className="w-full"
                  >
                    {createInstance.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Wifi className="h-4 w-4 mr-2" />
                    )}
                    Criar Conexão
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
                  Para usar esta funcionalidade, você precisa de um servidor Evolution API configurado.
                </p>
                <p>
                  A Evolution API é uma solução open-source que permite conectar seu WhatsApp Business
                  à nossa plataforma para gerenciar conversas com clientes.
                </p>
                <p>
                  <strong>Requisitos:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Servidor Evolution API rodando (self-hosted ou contratado)</li>
                  <li>URL de acesso à API</li>
                  <li>Chave de API (API Key)</li>
                  <li>Celular com WhatsApp para escanear o QR Code</li>
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
