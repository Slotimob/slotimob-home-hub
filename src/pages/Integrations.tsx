import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageSquare, Globe, Copy, CheckCircle, ExternalLink, Clock, Building2, Plug, Loader2, QrCode, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const COMPATIBLE_PORTALS = [
  { name: 'Zap Imóveis', logo: '🏠' },
  { name: 'VivaReal', logo: '🏡' },
  { name: 'OLX', logo: '📦' },
  { name: 'Imovelweb', logo: '🌐' },
  { name: '123i', logo: '🔢' },
];

const Integrations = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [xmlToken, setXmlToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // WhatsApp Evolution state
  const [whatsappConnection, setWhatsappConnection] = useState<any>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadUserToken();
      loadWhatsAppConnection();
    }
  }, [user]);

  // Realtime subscription for connection status changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('whatsapp-connection-status')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'whatsapp_connections',
        filter: `broker_id=eq.${user.id}`,
      }, (payload) => {
        console.log('Realtime update:', payload.new);
        const updated = payload.new as any;
        setWhatsappConnection(updated);

        if (updated.connection_status === 'open' || updated.status === 'connected') {
          setQrDialogOpen(false);
          setQrCodeBase64(null);
          toast({ title: '✅ WhatsApp Conectado!', description: 'Seu WhatsApp foi vinculado com sucesso.' });
        }

        if (updated.qr_code_base64 && updated.connection_status === 'qrcode') {
          setQrCodeBase64(updated.qr_code_base64);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const loadUserToken = async () => {
    try {
      setIsLoading(true);
      const { data } = await supabase.from('profiles').select('ical_token').eq('id', user!.id).single();
      setXmlToken(data?.ical_token || null);
    } catch (error) {
      console.error('Error loading token:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadWhatsAppConnection = async () => {
    try {
      const { data } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('broker_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) setWhatsappConnection(data);
    } catch (error) {
      console.error('Error loading WhatsApp connection:', error);
    }
  };

  const handleConnectWhatsApp = async () => {
    setIsConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-instance', {
        body: { action: 'create' },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.connection) {
        setWhatsappConnection(data.connection);
      }

      // Open QR dialog immediately — QR will arrive via Realtime
      setQrDialogOpen(true);
      toast({ title: 'Instância criada!', description: 'Aguardando QR Code... ele aparecerá em instantes.' });
    } catch (error: any) {
      console.error('Error creating instance:', error);
      toast({ title: 'Erro ao conectar', description: error.message, variant: 'destructive' });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRefreshQr = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-instance', {
        body: { action: 'refresh_qr' },
      });
      if (error) throw error;
      if (data?.qrCode) setQrCodeBase64(data.qrCode);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleDisconnectWhatsApp = async () => {
    setIsDisconnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-instance', {
        body: { action: 'disconnect' },
      });
      if (error) throw error;

      setWhatsappConnection((prev: any) => prev ? { ...prev, status: 'disconnected', connection_status: 'disconnected' } : null);
      setQrCodeBase64(null);
      toast({ title: 'WhatsApp desconectado' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const isConnected = whatsappConnection?.status === 'connected' || whatsappConnection?.connection_status === 'open';
  const isPending = whatsappConnection?.connection_status === 'qrcode' || whatsappConnection?.connection_status === 'connecting';

  const xmlFeedUrl = xmlToken
    ? `https://nelmmrqdiycmdhhslxfz.supabase.co/functions/v1/xml-feed?token=${xmlToken}`
    : '';

  const copyXmlUrl = () => {
    if (xmlFeedUrl) {
      navigator.clipboard.writeText(xmlFeedUrl);
      setCopied(true);
      toast({ title: 'URL copiada!' });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <AppLayout title="Integrações">
      <div className="space-y-6">
        <p className="text-muted-foreground">
          Conecte seu sistema a canais de comunicação e portais imobiliários.
        </p>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* WhatsApp Card */}
          <Card className="border-2">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10">
                  <MessageSquare className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <CardTitle className="text-xl">WhatsApp</CardTitle>
                  <CardDescription>Conexão via QR Code</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                    <Wifi className="h-3 w-3 mr-1" />
                    Conectado
                  </Badge>
                ) : isPending ? (
                  <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                    <QrCode className="h-3 w-3 mr-1" />
                    Aguardando QR Code
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-muted text-muted-foreground">
                    <WifiOff className="h-3 w-3 mr-1" />
                    Não Conectado
                  </Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                Conecte seu WhatsApp pessoal ou comercial escaneando um QR Code.
                Todas as mensagens serão sincronizadas com o CRM em tempo real.
              </p>

              {isConnected && whatsappConnection && (
                <div className="rounded-lg bg-muted/50 p-4 space-y-1">
                  <h4 className="font-medium text-sm">Detalhes da Conexão</h4>
                  <p className="text-sm text-muted-foreground">
                    <strong>Instância:</strong> {whatsappConnection.instance_name}
                  </p>
                </div>
              )}

              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <h4 className="font-medium text-sm">Recursos:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Envio e recebimento em tempo real</li>
                  <li>• Criação automática de contatos</li>
                  <li>• Histórico vinculado ao CRM</li>
                  <li>• Sem custos adicionais por mensagem</li>
                </ul>
              </div>

              {isConnected ? (
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => navigate('/whatsapp')}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Abrir Chat
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleDisconnectWhatsApp} disabled={isDisconnecting}>
                    {isDisconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Desconectar'}
                  </Button>
                </div>
              ) : isPending ? (
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => setQrDialogOpen(true)}>
                    <QrCode className="h-4 w-4 mr-2" />
                    Ver QR Code
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleDisconnectWhatsApp} disabled={isDisconnecting}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Button className="w-full" onClick={handleConnectWhatsApp} disabled={isConnecting}>
                  {isConnecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plug className="h-4 w-4 mr-2" />}
                  Conectar WhatsApp
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Portais Imobiliários Card */}
          <Card className="border-2">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Portais Imobiliários</CardTitle>
                  <CardDescription>Publicação via Feed XML</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Ativo
                </Badge>
                <Badge variant="outline">Padrão Zap</Badge>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                Publique seus imóveis automaticamente nos principais portais do Brasil.
              </p>

              <div className="space-y-2">
                <label className="text-sm font-medium">URL do Feed XML</label>
                <div className="flex gap-2">
                  <Input value={xmlFeedUrl || 'Token não disponível'} readOnly className="font-mono text-xs bg-muted" />
                  <Button variant="outline" size="icon" onClick={copyXmlUrl} disabled={!xmlToken}>
                    {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Portais Compatíveis</label>
                <div className="flex flex-wrap gap-2">
                  {COMPATIBLE_PORTALS.map((portal) => (
                    <Badge key={portal.name} variant="secondary" className="gap-1">
                      <span>{portal.logo}</span>
                      {portal.name}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-4 space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-blue-500" />
                  Como Configurar
                </h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Copie a URL do Feed XML acima</li>
                  <li>Acesse a área de "Carga de Dados" do portal</li>
                  <li>Cole a URL no campo indicado</li>
                  <li>Seus imóveis serão atualizados automaticamente</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-muted/30">
          <CardContent className="flex items-center gap-4 py-4">
            <Building2 className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">Identificação Visual</p>
              <p className="text-sm text-muted-foreground">
                Imóveis incluídos no Feed XML são identificados com uma badge "Publicado no Feed" na listagem de unidades.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Escaneie o QR Code
            </DialogTitle>
            <DialogDescription>
              Abra o WhatsApp no seu celular, vá em <strong>Configurações → Dispositivos Conectados → Conectar Dispositivo</strong> e escaneie o código abaixo.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-4">
            {qrCodeBase64 ? (
              <div className="rounded-xl border-2 border-green-500/20 p-4 bg-white">
                <img
                  src={qrCodeBase64.startsWith('data:') ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`}
                  alt="QR Code WhatsApp"
                  className="w-64 h-64 object-contain"
                />
              </div>
            ) : (
              <div className="flex h-64 w-64 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            <Button variant="outline" size="sm" onClick={handleRefreshQr}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar QR Code
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              O QR Code expira em poucos segundos. Clique em "Atualizar" se necessário.
              A conexão será detectada automaticamente.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Integrations;
