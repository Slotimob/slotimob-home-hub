import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, CheckCircle, Clock, BookOpen, Video, FileText, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TrainingContent {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_minutes: number | null;
  category: string | null;
  display_order: number;
}

interface TrainingProgress {
  content_id: string;
  is_completed: boolean;
  progress_percent: number;
}

const CATEGORIES = [
  { id: 'introducao', label: 'Primeiros Passos', icon: BookOpen },
  { id: 'imoveis', label: 'Gestão de Imóveis', icon: Video },
  { id: 'leads', label: 'Gestão de Leads', icon: FileText },
  { id: 'vendas', label: 'Pipeline de Vendas', icon: Video },
  { id: 'avancado', label: 'Recursos Avançados', icon: Award },
];

// Demo content for when database is empty
const DEMO_CONTENT: TrainingContent[] = [
  {
    id: '1',
    title: 'Bem-vindo ao SLOTIMOB',
    description: 'Aprenda os conceitos básicos e navegue pela plataforma',
    content_type: 'video',
    video_url: 'https://www.youtube.com/embed/demo1',
    thumbnail_url: null,
    duration_minutes: 5,
    category: 'introducao',
    display_order: 1,
  },
  {
    id: '2',
    title: 'Cadastrando seu primeiro imóvel',
    description: 'Passo a passo completo para cadastrar imóveis na plataforma',
    content_type: 'video',
    video_url: 'https://www.youtube.com/embed/demo2',
    thumbnail_url: null,
    duration_minutes: 8,
    category: 'imoveis',
    display_order: 2,
  },
  {
    id: '3',
    title: 'Gerenciando leads e contatos',
    description: 'Como organizar e acompanhar seus leads de forma eficiente',
    content_type: 'video',
    video_url: 'https://www.youtube.com/embed/demo3',
    thumbnail_url: null,
    duration_minutes: 10,
    category: 'leads',
    display_order: 3,
  },
  {
    id: '4',
    title: 'Usando o Pipeline de Vendas',
    description: 'Domine o funil de vendas e acompanhe suas negociações',
    content_type: 'video',
    video_url: 'https://www.youtube.com/embed/demo4',
    thumbnail_url: null,
    duration_minutes: 12,
    category: 'vendas',
    display_order: 4,
  },
  {
    id: '5',
    title: 'Integrações e Automações',
    description: 'Configure integrações com portais e automações de marketing',
    content_type: 'video',
    video_url: 'https://www.youtube.com/embed/demo5',
    thumbnail_url: null,
    duration_minutes: 15,
    category: 'avancado',
    display_order: 5,
  },
];

const Training = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [content, setContent] = useState<TrainingContent[]>([]);
  const [progress, setProgress] = useState<TrainingProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<TrainingContent | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadContent();
    }
  }, [user]);

  const loadContent = async () => {
    try {
      setIsLoading(true);
      
      const [contentRes, progressRes] = await Promise.all([
        supabase.from('training_content').select('*').eq('is_published', true).order('display_order'),
        supabase.from('training_progress').select('*'),
      ]);

      // Use demo content if database is empty
      const trainingContent = contentRes.data && contentRes.data.length > 0 ? contentRes.data : DEMO_CONTENT;
      
      setContent(trainingContent);
      setProgress(progressRes.data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar conteúdo',
        description: error.message,
        variant: 'destructive',
      });
      // Use demo content on error
      setContent(DEMO_CONTENT);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsCompleted = async (contentId: string) => {
    try {
      const existing = progress.find(p => p.content_id === contentId);
      
      if (existing) {
        await supabase
          .from('training_progress')
          .update({ is_completed: true, completed_at: new Date().toISOString(), progress_percent: 100 })
          .eq('content_id', contentId)
          .eq('user_id', user!.id);
      } else {
        await supabase
          .from('training_progress')
          .insert({
            user_id: user!.id,
            content_id: contentId,
            is_completed: true,
            completed_at: new Date().toISOString(),
            progress_percent: 100,
          });
      }
      
      loadContent();
      toast({
        title: 'Conteúdo concluído!',
        description: 'Seu progresso foi salvo.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar progresso',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getContentProgress = (contentId: string) => {
    return progress.find(p => p.content_id === contentId);
  };

  const getContentByCategory = (category: string) => {
    return content.filter(c => c.category === category);
  };

  const calculateOverallProgress = () => {
    if (content.length === 0) return 0;
    const completed = progress.filter(p => p.is_completed).length;
    return (completed / content.length) * 100;
  };

  if (loading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const overallProgress = calculateOverallProgress();
  const completedCount = progress.filter(p => p.is_completed).length;

  return (
    <AppLayout title="Treinamentos">
      <div className="space-y-6">
        {/* Progress Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Seu Progresso</CardTitle>
                <CardDescription>
                  {completedCount} de {content.length} conteúdos concluídos
                </CardDescription>
              </div>
              {overallProgress === 100 && (
                <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                  <Award className="h-4 w-4 mr-1" />
                  Curso Completo!
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={overallProgress} className="h-3" />
            <p className="text-sm text-muted-foreground mt-2">
              {overallProgress.toFixed(0)}% concluído
            </p>
          </CardContent>
        </Card>

        {/* Video Player Modal */}
        {selectedVideo && (
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>{selectedVideo.title}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedVideo(null)}>
                  Fechar
                </Button>
              </div>
              <CardDescription>{selectedVideo.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Video className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Player de vídeo</p>
                  <p className="text-sm text-muted-foreground">
                    Duração: {selectedVideo.duration_minutes} minutos
                  </p>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <Button onClick={() => {
                  markAsCompleted(selectedVideo.id);
                  setSelectedVideo(null);
                }}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Marcar como concluído
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content by Category */}
        <Tabs defaultValue="introducao">
          <TabsList className="flex-wrap h-auto">
            {CATEGORIES.map(cat => (
              <TabsTrigger key={cat.id} value={cat.id} className="gap-2">
                <cat.icon className="h-4 w-4" />
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {CATEGORIES.map(cat => (
            <TabsContent key={cat.id} value={cat.id} className="mt-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {getContentByCategory(cat.id).length === 0 ? (
                  <Card className="col-span-full">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Em breve</h3>
                      <p className="text-muted-foreground text-center">
                        Novos conteúdos serão adicionados em breve.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  getContentByCategory(cat.id).map(item => {
                    const itemProgress = getContentProgress(item.id);
                    const isCompleted = itemProgress?.is_completed;
                    
                    return (
                      <Card 
                        key={item.id} 
                        className={`overflow-hidden cursor-pointer transition-all hover:shadow-lg ${isCompleted ? 'border-green-500/50' : ''}`}
                        onClick={() => setSelectedVideo(item)}
                      >
                        <div className="aspect-video bg-muted relative">
                          {item.thumbnail_url ? (
                            <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Video className="h-12 w-12 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                            <Button size="icon" variant="secondary" className="rounded-full h-12 w-12">
                              <Play className="h-6 w-6" />
                            </Button>
                          </div>
                          {isCompleted && (
                            <Badge className="absolute top-2 right-2 bg-green-500 text-white">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Concluído
                            </Badge>
                          )}
                        </div>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{item.title}</CardTitle>
                          <CardDescription className="text-xs line-clamp-2">
                            {item.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>{item.duration_minutes} min</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Training;
