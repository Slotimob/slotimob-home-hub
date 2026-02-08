import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Settings, CheckCircle, XCircle, ExternalLink, Copy, Calendar, Zap, Mail, MessageSquare, FileSignature } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Integration {
  id: string;
  integration_type: string;
  is_active: boolean;
  webhook_url: string | null;
  last_sync_at: string | null;
  sync_status: string | null;
}

const INTEGRATIONS = [
  {
    id: 'facebook_leads',
    name: 'Facebook Lead Ads',
    description: 'Receba leads automaticamente de campanhas do Facebook',
    icon: '📘',
    color: 'bg-blue-500',
    category: 'marketing',
  },
  {
    id: 'rd_station',
    name: 'RD Station',
    description: 'Sincronize contatos e automações de marketing',
    icon: '🎯',
    color: 'bg-purple-500',
    category: 'marketing',
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Conecte com mais de 5.000 aplicativos',
    icon: '⚡',
    color: 'bg-orange-500',
    category: 'automation',
  },
  {
    id: 'make',
    name: 'Make (Integromat)',
    description: 'Automações visuais poderosas',
    icon: '🔄',
    color: 'bg-violet-500',
    category: 'automation',
  },
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    description: 'Sincronize sua agenda automaticamente',
    icon: '📅',
    color: 'bg-green-500',
    category: 'productivity',
  },
  {
    id: 'whatsapp_business',
    name: 'WhatsApp Business API',
    description: 'Comunicação profissional com clientes',
    icon: '💬',
    color: 'bg-green-600',
    category: 'communication',
  },
  {
    id: 'clicksign',
    name: 'Clicksign',
    description: 'Assinatura digital com validade jurídica no Brasil',
    icon: '✍️',
    color: 'bg-teal-500',
    category: 'signature',
  },
  {
    id: 'docusign',
    name: 'DocuSign',
    description: 'Líder global em assinatura eletrônica',
    icon: '📝',
    color: 'bg-yellow-600',
    category: 'signature',
  },
  {
    id: 'd4sign',
    name: 'D4Sign',
    description: 'Assinatura digital brasileira com preço competitivo',
    icon: '✅',
    color: 'bg-blue-600',
    category: 'signature',
  },
  {
    id: 'zapsign',
    name: 'ZapSign',
    description: 'Assinatura digital simples com plano gratuito',
    icon: '⚡',
    color: 'bg-indigo-500',
    category: 'signature',
  },
];

const Integrations = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [configDialog, setConfigDialog] = useState<{ open: boolean; integration: typeof INTEGRATIONS[0] | null }>({ open: false, integration: null });
  const [webhookUrl, setWebhookUrl] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadIntegrations();
    }
  }, [user]);

  const loadIntegrations = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('integrations')
        .select('id, integration_type, is_active, webhook_url, last_sync_at, sync_status')
        .order('integration_type');

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar integrações',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleIntegration = async (integrationType: string) => {
    try {
      const existing = integrations.find(i => i.integration_type === integrationType);
      
      if (existing) {
        const { error } = await supabase
          .from('integrations')
          .update({ is_active: !existing.is_active })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        // Generate webhook URL for this integration using Edge Function
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        let generatedWebhook = '';
        
        if (integrationType === 'facebook_leads') {
          generatedWebhook = `${supabaseUrl}/functions/v1/facebook-leads-webhook`;
        } else {
          generatedWebhook = `${supabaseUrl}/functions/v1/${integrationType}-webhook`;
        }
        
        const { error } = await supabase
          .from('integrations')
          .insert({
            broker_id: user!.id,
            integration_type: integrationType,
            is_active: true,
            webhook_url: generatedWebhook,
          });
        
        if (error) throw error;
      }
      
      loadIntegrations();
      toast({
        title: 'Integração atualizada',
        description: 'As configurações foram salvas com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar integração',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const openConfigDialog = (integration: typeof INTEGRATIONS[0]) => {
    const existing = integrations.find(i => i.integration_type === integration.id);
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    let defaultWebhook = '';
    if (integration.id === 'facebook_leads') {
      defaultWebhook = `${supabaseUrl}/functions/v1/facebook-leads-webhook`;
    } else {
      defaultWebhook = `${supabaseUrl}/functions/v1/${integration.id}-webhook`;
    }
    
    setWebhookUrl(existing?.webhook_url || defaultWebhook);
    setConfigDialog({ open: true, integration });
    setConfigDialog({ open: true, integration });
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({
      title: 'Copiado!',
      description: 'URL do webhook copiada para a área de transferência.',
    });
  };

  const getIntegrationStatus = (integrationType: string) => {
    return integrations.find(i => i.integration_type === integrationType);
  };

  if (loading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const activeCount = integrations.filter(i => i.is_active).length;

  const categorizedIntegrations = {
    marketing: INTEGRATIONS.filter(i => i.category === 'marketing'),
    automation: INTEGRATIONS.filter(i => i.category === 'automation'),
    productivity: INTEGRATIONS.filter(i => i.category === 'productivity'),
    communication: INTEGRATIONS.filter(i => i.category === 'communication'),
    signature: INTEGRATIONS.filter(i => i.category === 'signature'),
  };

  return (
    <AppLayout title="Integrações">
      <div className="space-y-6">
        {/* Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Visão Geral</CardTitle>
            <CardDescription>
              {activeCount} {activeCount === 1 ? 'integração ativa' : 'integrações ativas'} de {INTEGRATIONS.length} disponíveis
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Marketing Integrations */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Marketing
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categorizedIntegrations.marketing.map((integration) => {
              const status = getIntegrationStatus(integration.id);
              return (
                <Card key={integration.id} className={status?.is_active ? 'border-primary/50' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{integration.icon}</span>
                        <div>
                          <CardTitle className="text-base">{integration.name}</CardTitle>
                          <CardDescription className="text-xs">{integration.description}</CardDescription>
                        </div>
                      </div>
                      <Switch
                        checked={status?.is_active || false}
                        onCheckedChange={() => toggleIntegration(integration.id)}
                      />
                    </div>
                  </CardHeader>
                  {status?.is_active && (
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Conectado
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => openConfigDialog(integration)}>
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {/* Automation Integrations */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Automação
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categorizedIntegrations.automation.map((integration) => {
              const status = getIntegrationStatus(integration.id);
              return (
                <Card key={integration.id} className={status?.is_active ? 'border-primary/50' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{integration.icon}</span>
                        <div>
                          <CardTitle className="text-base">{integration.name}</CardTitle>
                          <CardDescription className="text-xs">{integration.description}</CardDescription>
                        </div>
                      </div>
                      <Switch
                        checked={status?.is_active || false}
                        onCheckedChange={() => toggleIntegration(integration.id)}
                      />
                    </div>
                  </CardHeader>
                  {status?.is_active && (
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Conectado
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => openConfigDialog(integration)}>
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {/* Productivity Integrations */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Produtividade
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categorizedIntegrations.productivity.map((integration) => {
              const status = getIntegrationStatus(integration.id);
              return (
                <Card key={integration.id} className={status?.is_active ? 'border-primary/50' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{integration.icon}</span>
                        <div>
                          <CardTitle className="text-base">{integration.name}</CardTitle>
                          <CardDescription className="text-xs">{integration.description}</CardDescription>
                        </div>
                      </div>
                      <Switch
                        checked={status?.is_active || false}
                        onCheckedChange={() => toggleIntegration(integration.id)}
                      />
                    </div>
                  </CardHeader>
                  {status?.is_active && (
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Conectado
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => openConfigDialog(integration)}>
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {/* Communication Integrations */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comunicação
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categorizedIntegrations.communication.map((integration) => {
              const status = getIntegrationStatus(integration.id);
              return (
                <Card key={integration.id} className={status?.is_active ? 'border-primary/50' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{integration.icon}</span>
                        <div>
                          <CardTitle className="text-base">{integration.name}</CardTitle>
                          <CardDescription className="text-xs">{integration.description}</CardDescription>
                        </div>
                      </div>
                      <Switch
                        checked={status?.is_active || false}
                        onCheckedChange={() => toggleIntegration(integration.id)}
                      />
                    </div>
                  </CardHeader>
                  {status?.is_active && (
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Conectado
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => openConfigDialog(integration)}>
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {/* Digital Signature Integrations */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            Assinatura Digital
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categorizedIntegrations.signature.map((integration) => {
              const status = getIntegrationStatus(integration.id);
              return (
                <Card key={integration.id} className={status?.is_active ? 'border-primary/50' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{integration.icon}</span>
                        <div>
                          <CardTitle className="text-base">{integration.name}</CardTitle>
                          <CardDescription className="text-xs">{integration.description}</CardDescription>
                        </div>
                      </div>
                      <Switch
                        checked={status?.is_active || false}
                        onCheckedChange={() => toggleIntegration(integration.id)}
                      />
                    </div>
                  </CardHeader>
                  {status?.is_active && (
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Conectado
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => openConfigDialog(integration)}>
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Config Dialog */}
      <Dialog open={configDialog.open} onOpenChange={(open) => setConfigDialog({ ...configDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{configDialog.integration?.icon}</span>
              Configurar {configDialog.integration?.name}
            </DialogTitle>
            <DialogDescription>
              Configure as credenciais e opções da integração
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>URL do Webhook</Label>
              <div className="flex gap-2">
                <Input value={webhookUrl} readOnly className="font-mono text-sm" />
                <Button variant="outline" size="icon" onClick={copyWebhook}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use esta URL para configurar o webhook no {configDialog.integration?.name}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialog({ open: false, integration: null })}>
              Fechar
            </Button>
            <Button>Salvar Configurações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Integrations;
