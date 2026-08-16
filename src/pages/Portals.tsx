import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ExternalLink, CheckCircle, XCircle, Clock, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PortalConnection {
  id: string;
  portal_name: string;
  is_active: boolean;
  last_sync_at: string | null;
  sync_status: string | null;
}

const PORTALS = [
  { 
    id: 'zap', 
    name: 'ZAP Imóveis', 
    logo: '🏠',
    description: 'Um dos maiores portais de imóveis do Brasil',
    url: 'https://www.zapimoveis.com.br'
  },
  { 
    id: 'vivareal', 
    name: 'Viva Real', 
    logo: '🏡',
    description: 'Portal do grupo OLX focado em imóveis',
    url: 'https://www.vivareal.com.br'
  },
  { 
    id: 'olx', 
    name: 'OLX', 
    logo: '📦',
    description: 'Marketplace com seção de imóveis',
    url: 'https://www.olx.com.br'
  },
  { 
    id: 'quintoandar', 
    name: 'QuintoAndar', 
    logo: '🔑',
    description: 'Especializado em aluguel de imóveis',
    url: 'https://www.quintoandar.com.br'
  },
  { 
    id: 'imovelweb', 
    name: 'Imovelweb', 
    logo: '🌐',
    description: 'Portal tradicional de imóveis',
    url: 'https://www.imovelweb.com.br'
  },
  { 
    id: '123i', 
    name: '123i', 
    logo: '🔍',
    description: 'Buscador e agregador de imóveis',
    url: 'https://www.123i.com.br'
  },
  { 
    id: 'chavesnamao', 
    name: 'Chaves na Mão', 
    logo: '🗝️',
    description: 'Portal popular de classificados',
    url: 'https://www.chavesnamao.com.br'
  },
  { 
    id: 'webimoveis', 
    name: 'WebImóveis', 
    logo: '💻',
    description: 'Portal tradicional de imóveis',
    url: 'https://www.webimoveis.com.br'
  },
  { 
    id: 'loft', 
    name: 'Loft', 
    logo: '🏢',
    description: 'Marketplace moderno de imóveis',
    url: 'https://www.loft.com.br'
  },
  { 
    id: 'emcasa', 
    name: 'EmCasa', 
    logo: '🏘️',
    description: 'Plataforma tecnológica de imóveis',
    url: 'https://www.emcasa.com'
  },
];

const Portals = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [connections, setConnections] = useState<PortalConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<Record<string, { listings: number; views: number; leads: number }>>({});
  const [togglingPortal, setTogglingPortal] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadConnections();
    }
  }, [user]);

  const loadConnections = async () => {
    try {
      setIsLoading(true);
      
      // Use the secure edge function instead of direct queries
      const { data: response, error } = await supabase.functions.invoke('portal-connections', {
        body: { action: 'list' }
      });

      if (error) throw error;
      
      const connectionsData = response?.data || [];
      setConnections(connectionsData);

      // Load stats for each connected portal
      const statsData: Record<string, { listings: number; views: number; leads: number }> = {};
      for (const conn of connectionsData) {
        const { data: listings } = await supabase
          .from('portal_listings')
          .select('views_count, leads_count')
          .eq('portal_connection_id', conn.id);
        
        statsData[conn.portal_name] = {
          listings: listings?.length || 0,
          views: listings?.reduce((sum, l) => sum + (l.views_count || 0), 0) || 0,
          leads: listings?.reduce((sum, l) => sum + (l.leads_count || 0), 0) || 0,
        };
      }
      setStats(statsData);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao carregar portais',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePortal = async (portalId: string, portalName: string) => {
    try {
      setTogglingPortal(portalId);
      const existing = connections.find(c => c.portal_name === portalId);
      
      if (existing) {
        // Update existing connection via edge function
        const { data: response, error } = await supabase.functions.invoke('portal-connections', {
          body: { 
            action: 'update',
            id: existing.id,
            is_active: !existing.is_active
          }
        });
        
        if (error) throw error;
        
        toast({
          title: existing.is_active ? 'Portal desativado' : 'Portal ativado',
          description: `${portalName} foi ${existing.is_active ? 'desativado' : 'ativado'} com sucesso.`,
        });
      } else {
        // Create new connection via edge function
        const { data: response, error } = await supabase.functions.invoke('portal-connections', {
          body: {
            action: 'create',
            portal_name: portalId
          }
        });
        
        if (error) throw error;
        
        toast({
          title: 'Portal conectado',
          description: `${portalName} foi conectado com sucesso.`,
        });
      }
      
      await loadConnections();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao atualizar portal',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setTogglingPortal(null);
    }
  };

  const getPortalConnection = (portalId: string) => {
    return connections.find(c => c.portal_name === portalId);
  };

  const getSyncStatusBadge = (status: string | null) => {
    switch (status) {
      case 'synced':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle className="h-3 w-3 mr-1" />Sincronizado</Badge>;
      case 'syncing':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20"><Clock className="h-3 w-3 mr-1" />Sincronizando</Badge>;
      case 'error':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><XCircle className="h-3 w-3 mr-1" />Erro</Badge>;
      default:
        return null;
    }
  };

  if (loading || isLoading) {
    return (
      <AppLayout title="Portais">
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </AppLayout>
    );
  }


  const activeConnections = connections.filter(c => c.is_active);
  const totalListings = Object.values(stats).reduce((sum, s) => sum + s.listings, 0);
  const totalViews = Object.values(stats).reduce((sum, s) => sum + s.views, 0);
  const totalLeads = Object.values(stats).reduce((sum, s) => sum + s.leads, 0);

  return (
    <AppLayout title="Portais">
      <div className="space-y-6">
        {/* Overview Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Portais Conectados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeConnections.length}</div>
              <p className="text-xs text-muted-foreground">de {PORTALS.length} disponíveis</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Imóveis Publicados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalListings}</div>
              <p className="text-xs text-muted-foreground">em todos os portais</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Visualizações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalViews.toLocaleString('pt-BR')}</div>
              <p className="text-xs text-muted-foreground">total de visualizações</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Leads Gerados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLeads}</div>
              <p className="text-xs text-muted-foreground">através dos portais</p>
            </CardContent>
          </Card>
        </div>

        {/* Portals Grid */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Portais Disponíveis</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PORTALS.map((portal) => {
              const connection = getPortalConnection(portal.id);
              const portalStats = stats[portal.id];
              const isToggling = togglingPortal === portal.id;
              
              return (
                <Card key={portal.id} className={connection?.is_active ? 'border-primary/50' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{portal.logo}</span>
                        <div>
                          <CardTitle className="text-base">{portal.name}</CardTitle>
                          <CardDescription className="text-xs">{portal.description}</CardDescription>
                        </div>
                      </div>
                      <Switch
                        checked={connection?.is_active || false}
                        onCheckedChange={() => togglePortal(portal.id, portal.name)}
                        disabled={isToggling}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {connection?.is_active && (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          {getSyncStatusBadge(connection.sync_status)}
                          <Button variant="ghost" size="sm" asChild>
                            <a href={portal.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                        
                        {portalStats && (
                          <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                            <div className="text-center">
                              <div className="text-lg font-semibold">{portalStats.listings}</div>
                              <div className="text-xs text-muted-foreground">Imóveis</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-semibold">{portalStats.views}</div>
                              <div className="text-xs text-muted-foreground">Views</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-semibold">{portalStats.leads}</div>
                              <div className="text-xs text-muted-foreground">Leads</div>
                            </div>
                          </div>
                        )}
                        
                        <Button variant="outline" size="sm" className="w-full mt-2">
                          <Settings className="h-4 w-4 mr-2" />
                          Configurar
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Portals;
