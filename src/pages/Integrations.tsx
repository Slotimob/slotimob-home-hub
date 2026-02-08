import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MessageSquare, Globe, Copy, CheckCircle, ExternalLink, Clock, Building2 } from 'lucide-react';
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

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadUserToken();
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
    } catch (error: any) {
      console.error('Error loading token:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const xmlFeedUrl = xmlToken 
    ? `https://nelmmrqdiycmdhhslxfz.supabase.co/functions/v1/xml-feed?token=${xmlToken}`
    : '';

  const copyXmlUrl = () => {
    if (xmlFeedUrl) {
      navigator.clipboard.writeText(xmlFeedUrl);
      setCopied(true);
      toast({
        title: 'URL copiada!',
        description: 'O link do feed XML foi copiado para a área de transferência.',
      });
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
        {/* Header */}
        <div className="space-y-2">
          <p className="text-muted-foreground">
            Conecte seu sistema a canais de comunicação e portais imobiliários para aumentar sua visibilidade e eficiência.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pilar 1: WhatsApp */}
          <Card className="border-2">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10">
                  <MessageSquare className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <CardTitle className="text-xl">WhatsApp Business</CardTitle>
                  <CardDescription>Comunicação Centralizada</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                  <Clock className="h-3 w-3 mr-1" />
                  Em Breve
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground leading-relaxed">
                Integração direta via <strong>API Oficial da Meta</strong> para gestão de conversas e leads centralizada. 
                Envie mensagens, receba notificações e acompanhe todo o histórico de comunicação com seus clientes.
              </p>

              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <h4 className="font-medium text-sm">Recursos Planejados:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Envio e recebimento de mensagens</li>
                  <li>• Templates de mensagens aprovados</li>
                  <li>• Automações e lembretes</li>
                  <li>• Histórico vinculado ao CRM</li>
                </ul>
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/whatsapp-settings')}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Configurar Instância
              </Button>
            </CardContent>
          </Card>

          {/* Pilar 2: Portais Imobiliários */}
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

              {/* XML Feed URL */}
              <div className="space-y-2">
                <label className="text-sm font-medium">URL do Feed XML</label>
                <div className="flex gap-2">
                  <Input 
                    value={xmlFeedUrl || 'Token não disponível'} 
                    readOnly 
                    className="font-mono text-xs bg-muted"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={copyXmlUrl}
                    disabled={!xmlToken}
                  >
                    {copied ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Portais Compatíveis */}
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

              {/* Instructions */}
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

        {/* Info sobre Badge nos Imóveis */}
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
