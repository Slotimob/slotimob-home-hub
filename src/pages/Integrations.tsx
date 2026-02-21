import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageSquare, Globe, Copy, CheckCircle, ExternalLink, Clock, Building2, Plug, Loader2 } from 'lucide-react';
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

  // WhatsApp connection state
  const [whatsappConnection, setWhatsappConnection] = useState<any>(null);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadUserToken();
      loadWhatsAppConnection();
    }
  }, [user]);

  const loadUserToken = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('ical_token')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      setXmlToken(data?.ical_token || null);
    } catch (error) {
      console.error('Error loading token:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadWhatsAppConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('broker_id', user!.id)
        .eq('api_provider', 'meta')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) setWhatsappConnection(data);
    } catch (error) {
      console.error('Error loading WhatsApp connection:', error);
    }
  };

  const handleConnectWhatsApp = async () => {
    if (!phoneNumberId.trim() || !wabaId.trim()) {
      toast({ title: 'Erro', description: 'Preencha todos os campos.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const webhookUrl = `https://nelmmrqdiycmdhhslxfz.supabase.co/functions/v1/whatsapp-webhook`;

      const { data, error } = await supabase
        .from('whatsapp_connections')
        .insert({
          broker_id: user!.id,
          phone_number_id: phoneNumberId.trim(),
          waba_id: wabaId.trim(),
          api_provider: 'meta',
          status: 'connected',
          webhook_url: webhookUrl,
          connected_at: new Date().toISOString(),
          evolution_api_url: '',
          instance_name: '',
        })
        .select()
        .single();

      if (error) throw error;

      setWhatsappConnection(data);
      setConnectDialogOpen(false);
      setPhoneNumberId('');
      setWabaId('');
      toast({ title: 'WhatsApp conectado!', description: 'Sua integração com a API Oficial da Meta está ativa.' });
    } catch (error: any) {
      console.error('Error connecting WhatsApp:', error);
      toast({ title: 'Erro ao conectar', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    if (!whatsappConnection) return;
    try {
      await supabase
        .from('whatsapp_connections')
        .update({ status: 'disconnected' })
        .eq('id', whatsappConnection.id);

      setWhatsappConnection({ ...whatsappConnection, status: 'disconnected' });
      toast({ title: 'WhatsApp desconectado' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const xmlFeedUrl = xmlToken
    ? `https://nelmmrqdiycmdhhslxfz.supabase.co/functions/v1/xml-feed?token=${xmlToken}`
    : '';

  const copyXmlUrl = () => {
    if (xmlFeedUrl) {
      navigator.clipboard.writeText(xmlFeedUrl);
      setCopied(true);
      toast({ title: 'URL copiada!', description: 'O link do feed XML foi copiado.' });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isWhatsAppConnected = whatsappConnection?.status === 'connected';

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
        <div className="space-y-2">
          <p className="text-muted-foreground">
            Conecte seu sistema a canais de comunicação e portais imobiliários para aumentar sua visibilidade e eficiência.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* WhatsApp Card */}
          <Card className="border-2">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10">
                  <MessageSquare className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <CardTitle className="text-xl">WhatsApp Business</CardTitle>
                  <CardDescription>API Oficial da Meta</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                {isWhatsAppConnected ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Conectado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-muted text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    Não Conectado
                  </Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                Integração direta via <strong>API Oficial da Meta</strong> para gestão de conversas e leads centralizada.
                Envie mensagens, receba notificações e acompanhe todo o histórico no CRM.
              </p>

              {isWhatsAppConnected && whatsappConnection && (
                <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                  <h4 className="font-medium text-sm">Detalhes da Conexão</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p><strong>Phone Number ID:</strong> {whatsappConnection.phone_number_id}</p>
                    <p><strong>WABA ID:</strong> {whatsappConnection.waba_id}</p>
                    {whatsappConnection.phone_number && (
                      <p><strong>Número:</strong> {whatsappConnection.phone_number}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <h4 className="font-medium text-sm">Recursos Disponíveis:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Envio e recebimento de mensagens em tempo real</li>
                  <li>• Criação automática de contatos/leads</li>
                  <li>• Histórico vinculado ao CRM</li>
                  <li>• Status de entrega e leitura</li>
                </ul>
              </div>

              {isWhatsAppConnected ? (
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => navigate('/whatsapp')}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Abrir Chat
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleDisconnectWhatsApp}>
                    Desconectar
                  </Button>
                </div>
              ) : (
                <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <Plug className="h-4 w-4 mr-2" />
                      Conectar WhatsApp
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Conectar WhatsApp Business</DialogTitle>
                      <DialogDescription>
                        Insira os dados da sua conta do WhatsApp Business da Meta. O Token de acesso deve ser configurado como secret no Supabase (WHATSAPP_TOKEN).
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="phoneNumberId">Phone Number ID</Label>
                        <Input
                          id="phoneNumberId"
                          placeholder="Ex: 123456789012345"
                          value={phoneNumberId}
                          onChange={(e) => setPhoneNumberId(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Encontre em: Meta Business Suite → WhatsApp → Configurações da API
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="wabaId">WABA ID (WhatsApp Business Account ID)</Label>
                        <Input
                          id="wabaId"
                          placeholder="Ex: 123456789012345"
                          value={wabaId}
                          onChange={(e) => setWabaId(e.target.value)}
                        />
                      </div>
                      <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-3">
                        <p className="text-xs text-muted-foreground">
                          <strong>Webhook URL</strong> (configure na Meta):
                        </p>
                        <code className="text-xs break-all">
                          https://nelmmrqdiycmdhhslxfz.supabase.co/functions/v1/whatsapp-webhook
                        </code>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setConnectDialogOpen(false)}>Cancelar</Button>
                      <Button onClick={handleConnectWhatsApp} disabled={isSaving}>
                        {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Salvar Conexão
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
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
                Seus imóveis com status <strong>"Disponível"</strong> são sincronizados a cada 24h.
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
                  <li>Acesse a área de "Carga de Dados" do portal desejado</li>
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
