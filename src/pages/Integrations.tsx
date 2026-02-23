import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { MessageSquare, Globe, Copy, CheckCircle, ExternalLink, Building2, Plug, Loader2, QrCode, Wifi, WifiOff, RefreshCw, Clock, AlertTriangle, XCircle, Timer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWhatsAppSettingsConnection } from '@/hooks/useWhatsApp';

const COMPATIBLE_PORTALS = [
  { name: 'Zap Imóveis', logo: '🏠' },
  { name: 'VivaReal', logo: '🏡' },
  { name: 'OLX', logo: '📦' },
  { name: 'Imovelweb', logo: '🌐' },
  { name: '123i', logo: '🔢' },
];

const QR_EXPIRY_SECONDS = 14;

const Integrations = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // XML Feed state
  const [xmlToken, setXmlToken] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const [copied, setCopied] = useState(false);

  // WhatsApp — centralized hook
  const { connection, loading: whatsappLoading, waitingForQr, setWaitingForQr, countdown, timedOut, setTimedOut, cancelRequest, refetch } = useWhatsAppSettingsConnection();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [qrTimer, setQrTimer] = useState<number | null>(null);
  const [qrExpired, setQrExpired] = useState(false);

  // Derived states
  const isConnected = connection?.status === 'connected' || connection?.connection_status === 'open';
  const isPreparing = (connection?.connection_status === 'preparing' || waitingForQr) && !isConnected;
  const hasQrCode = !!connection?.qr_code_base64 && !isConnected;

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) loadUserToken();
  }, [user]);

  // Animated progress bar while preparing
  useEffect(() => {
    if (!isPreparing || hasQrCode) {
      setProgress(0);
      return;
    }
    const interval = setInterval(() => {
      setProgress(prev => (prev >= 95 ? 95 : prev + Math.random() * 8));
    }, 600);
    return () => clearInterval(interval);
  }, [isPreparing, hasQrCode]);

  // QR Code expiry timer (14s)
  useEffect(() => {
    if (!hasQrCode) {
      setQrTimer(null);
      setQrExpired(false);
      return;
    }
    setQrExpired(false);
    setQrTimer(QR_EXPIRY_SECONDS);
    const interval = setInterval(() => {
      setQrTimer(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setQrExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [hasQrCode, connection?.qr_code_base64]);

  const loadUserToken = async () => {
    try {
      setIsLoadingToken(true);
      const { data } = await supabase.from('profiles').select('ical_token').eq('id', user!.id).single();
      setXmlToken(data?.ical_token || null);
    } catch (error) {
      console.error('Error loading token:', error);
    } finally {
      setIsLoadingToken(false);
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

      setWaitingForQr(true);
      refetch();
      toast({ title: 'Instância criada!', description: 'Configurando em segundo plano... o QR Code aparecerá em instantes.' });
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
      refetch();
      toast({ title: 'Novo QR Code solicitado', description: 'Aguarde alguns instantes...' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleDisconnectWhatsApp = async () => {
    setIsDisconnecting(true);
    try {
      const { error } = await supabase.functions.invoke('whatsapp-instance', {
        body: { action: 'disconnect' },
      });
      if (error) throw error;
      refetch();
      toast({ title: 'WhatsApp desconectado' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setIsDisconnecting(false);
    }
  };

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

  if (loading || isLoadingToken) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const qrSrc = connection?.qr_code_base64
    ? (connection.qr_code_base64.startsWith('data:') ? connection.qr_code_base64 : `data:image/png;base64,${connection.qr_code_base64}`)
    : '';

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
              {/* Status Badge */}
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                    <Wifi className="h-3 w-3 mr-1" />
                    Conectado
                  </Badge>
                ) : isPreparing ? (
                  <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Preparando...
                  </Badge>
                ) : hasQrCode ? (
                  <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                    <QrCode className="h-3 w-3 mr-1" />
                    QR Code Disponível
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-muted text-muted-foreground">
                    <WifiOff className="h-3 w-3 mr-1" />
                    Não Conectado
                  </Badge>
                )}
              </div>

              {/* Preparing State: Progress bar */}
              {isPreparing && !hasQrCode && !timedOut && (
                <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4 space-y-3">
                  <Progress value={progress} className="h-2" />
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                      Nosso servidor está configurando sua instância em segundo plano. Você pode continuar navegando na plataforma; avisaremos quando o código estiver pronto.
                    </p>
                  </div>
                  {countdown !== null && countdown > 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Timer className="h-3 w-3" />
                      <span>Tempo restante: <strong className={countdown <= 10 ? 'text-destructive' : ''}>{countdown}s</strong></span>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={cancelRequest}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Cancelar Solicitação
                  </Button>
                </div>
              )}

              {/* Timeout Error */}
              {timedOut && !isConnected && !hasQrCode && (
                <div className="rounded-lg border-2 border-destructive/20 bg-destructive/5 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <p className="text-sm font-medium text-destructive">O servidor demorou muito para responder.</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Isso pode acontecer quando o servidor está sobrecarregado. Tente novamente.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setTimedOut(false); handleConnectWhatsApp(); }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Tentar Novamente
                  </Button>
                </div>
              )}

              {/* QR Code Inline */}
              {hasQrCode && !qrExpired && (
                <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-green-500/20 bg-white p-4">
                  <img
                    src={qrSrc}
                    alt="QR Code WhatsApp"
                    className="w-56 h-56 object-contain"
                  />
                  {qrTimer !== null && qrTimer > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-yellow-500" />
                      <span className={`font-medium ${qrTimer <= 5 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        Expira em {qrTimer}s
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground text-center">
                    Abra o WhatsApp → Configurações → Dispositivos Conectados → Conectar Dispositivo
                  </p>
                </div>
              )}

              {/* QR Expired */}
              {hasQrCode && qrExpired && (
                <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-destructive/20 bg-destructive/5 p-4">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                  <p className="text-sm font-medium text-destructive">QR Code expirado</p>
                  <Button variant="outline" size="sm" onClick={handleRefreshQr}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Gerar Novo QR Code
                  </Button>
                </div>
              )}

              {/* Description (only when not showing QR or progress) */}
              {!isPreparing && !hasQrCode && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Conecte seu WhatsApp pessoal ou comercial escaneando um QR Code.
                  Todas as mensagens serão sincronizadas com o CRM em tempo real.
                </p>
              )}

              {/* Connection details */}
              {isConnected && connection && (
                <div className="rounded-lg bg-muted/50 p-4 space-y-1">
                  <h4 className="font-medium text-sm">Detalhes da Conexão</h4>
                  <p className="text-sm text-muted-foreground">
                    <strong>Instância:</strong> {connection.instance_name}
                  </p>
                </div>
              )}

              {/* Features list */}
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <h4 className="font-medium text-sm">Recursos:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Envio e recebimento em tempo real</li>
                  <li>• Criação automática de contatos</li>
                  <li>• Histórico vinculado ao CRM</li>
                  <li>• Sem custos adicionais por mensagem</li>
                </ul>
              </div>

              {/* Action Buttons */}
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
              ) : !isPreparing && !hasQrCode && !timedOut ? (
                <Button className="w-full" onClick={handleConnectWhatsApp} disabled={isConnecting}>
                  {isConnecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plug className="h-4 w-4 mr-2" />}
                  Conectar WhatsApp
                </Button>
              ) : null}
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
    </AppLayout>
  );
};

export default Integrations;
