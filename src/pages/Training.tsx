import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCockpitAccess } from '@/hooks/useCockpitAccess';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Award, GraduationCap, Sparkles, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { TrainingContentCard } from '@/components/training/TrainingContentCard';
import { VideoPlayerDialog } from '@/components/training/VideoPlayerDialog';
import { ManageContentDialog } from '@/components/training/ManageContentDialog';
import { DeleteContentDialog } from '@/components/training/DeleteContentDialog';

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
  is_premium?: boolean;
  price?: number | null;
  checkout_url?: string | null;
  is_published?: boolean;
  feature_key?: string | null;
  short_description?: string | null;
  body_markdown?: string | null;
}

interface TrainingProgress {
  content_id: string;
  is_completed: boolean;
  progress_percent: number;
}

const CATEGORIES = [
  { id: 'todos', label: 'Todos' },
  { id: 'primeiros-passos', label: 'Primeiros Passos' },
  { id: 'gestao', label: 'Gestão' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'vendas', label: 'Vendas' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'premium', label: 'Premium' },
];

const Training = () => {
  const { user, loading: authLoading } = useAuth();
  const { isModerator: isAdmin, isLoading: adminLoading } = useCockpitAccess();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [content, setContent] = useState<TrainingContent[]>([]);
  const [progress, setProgress] = useState<TrainingProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('todos');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const deepLinkHandled = useRef(false);
  
  // Dialog states
  const [selectedVideo, setSelectedVideo] = useState<TrainingContent | null>(null);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<TrainingContent | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingContent, setDeletingContent] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadContent();
    }
  }, [user]);

  const loadContent = async () => {
    try {
      setIsLoading(true);
      
      // Build query based on admin status - admins see all, users see only published
      let contentQuery = supabase
        .from('training_content')
        .select('*')
        .order('display_order');

      // Non-admins only see published content
      if (!isAdmin) {
        contentQuery = contentQuery.eq('is_published', true);
      }

      const [contentRes, progressRes] = await Promise.all([
        contentQuery,
        supabase.from('training_progress').select('*'),
      ]);

      if (contentRes.error) throw contentRes.error;
      
      setContent(contentRes.data || []);
      setProgress(progressRes.data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar conteúdo', { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const markAsCompleted = async (contentId: string) => {
    if (!user) return;
    
    try {
      const existing = progress.find(p => p.content_id === contentId);
      
      if (existing) {
        await supabase
          .from('training_progress')
          .update({ 
            is_completed: true, 
            completed_at: new Date().toISOString(), 
            progress_percent: 100 
          })
          .eq('content_id', contentId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('training_progress')
          .insert({
            user_id: user.id,
            content_id: contentId,
            is_completed: true,
            completed_at: new Date().toISOString(),
            progress_percent: 100,
          });
      }
      
      loadContent();
      toast.success('Aula concluída! 🎉');
      setSelectedVideo(null);
    } catch (error: any) {
      toast.error('Erro ao salvar progresso', { description: error.message });
    }
  };

  const isContentCompleted = (contentId: string) => {
    return progress.some(p => p.content_id === contentId && p.is_completed);
  };

  const filteredContent = useMemo(() => {
    if (activeTab === 'todos') return content;
    if (activeTab === 'premium') return content.filter(c => c.is_premium || c.content_type === 'external');
    return content.filter(c => c.category === activeTab);
  }, [content, activeTab]);

  const calculateOverallProgress = () => {
    const nonPremiumContent = content.filter(c => !c.is_premium && c.content_type !== 'external');
    if (nonPremiumContent.length === 0) return 0;
    const completed = progress.filter(p => 
      p.is_completed && nonPremiumContent.some(c => c.id === p.content_id)
    ).length;
    return (completed / nonPremiumContent.length) * 100;
  };

  const handleEdit = (item: TrainingContent) => {
    setEditingContent(item);
    setManageDialogOpen(true);
  };

  const handleDelete = (item: TrainingContent) => {
    setDeletingContent({ id: item.id, title: item.title });
    setDeleteDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingContent(null);
    setManageDialogOpen(true);
  };

  if (authLoading || isLoading || adminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  const overallProgress = calculateOverallProgress();
  const nonPremiumContent = content.filter(c => !c.is_premium && c.content_type !== 'external');
  const completedCount = progress.filter(p => 
    p.is_completed && nonPremiumContent.some(c => c.id === p.content_id)
  ).length;

  return (
    <AppLayout title="Treinamentos">
      <div className="space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 border">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <GraduationCap className="h-10 w-10 text-primary" />
                <h1 className="text-3xl font-bold tracking-tight">Slotimob Academy</h1>
              </div>
              <p className="text-muted-foreground max-w-xl">
                Domine todas as ferramentas e transforme sua gestão imobiliária. 
                Aprenda no seu ritmo com conteúdos exclusivos.
              </p>
            </div>
            
            {isAdmin && (
              <Button onClick={handleAddNew} size="lg" className="gap-2 shrink-0">
                <Plus className="h-5 w-5" />
                Adicionar Conteúdo
              </Button>
            )}
          </div>
          
          {/* Decorative elements */}
          <Sparkles className="absolute top-4 right-4 h-24 w-24 text-primary/10" />
        </div>

        {/* Progress Card */}
        {nonPremiumContent.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Seu Progresso</CardTitle>
                  <CardDescription>
                    {completedCount} de {nonPremiumContent.length} aulas concluídas
                  </CardDescription>
                </div>
                {overallProgress === 100 && (
                  <Badge variant="secondary" className="gap-1 text-green-600">
                    <Award className="h-4 w-4" />
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
        )}

        {/* Tabs & Content Grid */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto pb-2">
            <TabsList className="inline-flex h-auto p-1 bg-muted/50">
              {CATEGORIES.map(cat => (
                <TabsTrigger 
                  key={cat.id} 
                  value={cat.id}
                  className="px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value={activeTab} className="mt-6">
            {filteredContent.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <BookOpen className="h-16 w-16 text-muted-foreground/50 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">
                    {activeTab === 'todos' 
                      ? 'Nenhum conteúdo disponível' 
                      : 'Nenhum conteúdo nesta categoria'}
                  </h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    {isAdmin 
                      ? 'Clique em "Adicionar Conteúdo" para criar sua primeira aula.'
                      : 'Novos conteúdos serão adicionados em breve. Fique ligado!'}
                  </p>
                  {isAdmin && (
                    <Button onClick={handleAddNew} className="mt-6 gap-2">
                      <Plus className="h-4 w-4" />
                      Adicionar Conteúdo
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredContent.map(item => (
                  <TrainingContentCard
                    key={item.id}
                    content={item}
                    isAdmin={isAdmin}
                    isCompleted={isContentCompleted(item.id)}
                    onWatch={() => setSelectedVideo(item)}
                    onEdit={() => handleEdit(item)}
                    onDelete={() => handleDelete(item)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Video Player Dialog */}
        <VideoPlayerDialog
          content={selectedVideo}
          open={!!selectedVideo}
          onOpenChange={(open) => !open && setSelectedVideo(null)}
          onComplete={markAsCompleted}
          isCompleted={selectedVideo ? isContentCompleted(selectedVideo.id) : false}
        />

        {/* Manage Content Dialog (Admin only) */}
        <ManageContentDialog
          open={manageDialogOpen}
          onOpenChange={setManageDialogOpen}
          content={editingContent}
          onSuccess={loadContent}
        />

        {/* Delete Confirmation Dialog */}
        <DeleteContentDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          contentId={deletingContent?.id || null}
          contentTitle={deletingContent?.title || ''}
          onSuccess={loadContent}
        />
      </div>
    </AppLayout>
  );
};

export default Training;
