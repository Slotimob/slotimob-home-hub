import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Plus, Pencil, Trash2, Eye, EyeOff, Loader2, Search, FileText, Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BlogImageUpload } from './BlogImageUpload';
import { BlogFaqEditor, type FaqItem } from './BlogFaqEditor';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  featured_image: string | null;
  featured_image_alt: string | null;
  category_id: string | null;
  author_id: string;
  seo_tags: Record<string, string>;
  geo_location: string | null;
  ai_summary: string | null;
  is_published: boolean;
  published_at: string | null;
  views_count: number;
  reading_time_min: number | null;
  faqs: FaqItem[];
  created_at: string;
  updated_at: string;
}

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  sort_order: number;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function estimateReadingTime(content: string): number {
  const words = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export function CockpitBlogTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [featuredImageAlt, setFeaturedImageAlt] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [geoLocation, setGeoLocation] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ['blog-posts-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as BlogPost[];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['blog-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_categories')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as BlogCategory[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (publish: boolean) => {
      const seo_tags = {
        title: seoTitle || title,
        description: seoDescription || excerpt,
        keywords: seoKeywords,
      };
      const reading_time_min = estimateReadingTime(content);
      const postData = {
        title,
        slug: slug || slugify(title),
        content,
        excerpt: excerpt || null,
        featured_image: featuredImage || null,
        featured_image_alt: featuredImageAlt || null,
        category_id: categoryId || null,
        geo_location: geoLocation || null,
        ai_summary: aiSummary || null,
        seo_tags,
        faqs: faqs as any,
        is_published: publish,
        published_at: publish ? new Date().toISOString() : null,
        reading_time_min,
        author_id: user!.id,
      };

      if (editingPost) {
        const { error } = await supabase
          .from('blog_posts')
          .update(postData)
          .eq('id', editingPost.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('blog_posts')
          .insert(postData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingPost ? 'Post atualizado!' : 'Post criado!');
      queryClient.invalidateQueries({ queryKey: ['blog-posts-admin'] });
      closeEditor();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Post excluído!');
      queryClient.invalidateQueries({ queryKey: ['blog-posts-admin'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const togglePublish = useMutation({
    mutationFn: async (post: BlogPost) => {
      const { error } = await supabase.from('blog_posts').update({
        is_published: !post.is_published,
        published_at: !post.is_published ? new Date().toISOString() : null,
      }).eq('id', post.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Status atualizado!');
      queryClient.invalidateQueries({ queryKey: ['blog-posts-admin'] });
    },
  });

  const openEditor = (post?: BlogPost) => {
    if (post) {
      setEditingPost(post);
      setTitle(post.title);
      setSlug(post.slug);
      setContent(post.content);
      setExcerpt(post.excerpt || '');
      setFeaturedImage(post.featured_image || '');
      setFeaturedImageAlt(post.featured_image_alt || '');
      setCategoryId(post.category_id || '');
      setGeoLocation(post.geo_location || '');
      setAiSummary(post.ai_summary || '');
      setSeoTitle((post.seo_tags as Record<string, string>)?.title || '');
      setSeoDescription((post.seo_tags as Record<string, string>)?.description || '');
      setSeoKeywords((post.seo_tags as Record<string, string>)?.keywords || '');
      setIsPublished(post.is_published);
      setFaqs(Array.isArray(post.faqs) ? post.faqs : []);
    } else {
      setEditingPost(null);
      setTitle(''); setSlug(''); setContent(''); setExcerpt('');
      setFeaturedImage(''); setFeaturedImageAlt(''); setCategoryId(''); setGeoLocation('');
      setAiSummary(''); setSeoTitle(''); setSeoDescription('');
      setSeoKeywords(''); setIsPublished(false); setFaqs([]);
    }
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingPost(null);
  };

  const filtered = (posts || []).filter(
    (p) => p.title.toLowerCase().includes(search.toLowerCase())
  );

  const getCategoryName = (id: string | null) =>
    categories?.find((c) => c.id === id)?.name || '—';

  // SEO score calculation
  const seoScore = (() => {
    let score = 0;
    if (seoTitle && seoTitle.length <= 60) score += 20;
    if (seoDescription && seoDescription.length <= 160) score += 20;
    if (seoKeywords) score += 10;
    if (excerpt) score += 10;
    if (featuredImage) score += 10;
    if (featuredImageAlt) score += 10;
    if (geoLocation) score += 5;
    if (aiSummary) score += 5;
    if (faqs.length > 0 && faqs.every(f => f.question && f.answer)) score += 10;
    return score;
  })();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar posts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => openEditor()} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Post
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5" /> Posts ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {postsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Views</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm line-clamp-1">{post.title}</p>
                          <p className="text-xs text-muted-foreground">
                            /{post.slug} · {post.reading_time_min || 5} min
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {getCategoryName(post.category_id)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {post.is_published ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                            Publicado
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Rascunho</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm">{post.views_count}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => togglePublish.mutate(post)}
                            title={post.is_published ? 'Despublicar' : 'Publicar'}>
                            {post.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => openEditor(post)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                            onClick={() => {
                              if (confirm('Excluir este post?')) deleteMutation.mutate(post.id);
                            }} title="Excluir">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhum post encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Post Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={(isOpen) => { if (!isOpen) closeEditor(); }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPost ? 'Editar Post' : 'Novo Post'}</DialogTitle>
            <DialogDescription>
              Preencha os dados do artigo. O SEO Score indica a qualidade da otimização.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (!editingPost) setSlug(slugify(e.target.value));
                  }}
                  placeholder="Título do artigo"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)}
                  placeholder="url-do-artigo" />
              </div>
              <div className="space-y-2">
                <Label>Resumo IA (TL;DR)</Label>
                <Textarea value={aiSummary} onChange={(e) => setAiSummary(e.target.value)}
                  placeholder="Resumo curto gerado ou escrito manualmente..." rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Excerpt (prévia)</Label>
                <Textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Breve descrição do artigo para listagens..." rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Conteúdo (HTML/Rich Text) *</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="<h2>Introdução</h2><p>Escreva o conteúdo do artigo aqui...</p>"
                  rows={16}
                  className="font-mono text-sm"
                />
              </div>

              {/* FAQ Editor */}
              <BlogFaqEditor faqs={faqs} onChange={setFaqs} />
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* SEO Score */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-semibold">SEO Score</Label>
                    <span className={`text-lg font-bold ${seoScore >= 70 ? 'text-emerald-600' : seoScore >= 40 ? 'text-amber-500' : 'text-destructive'}`}>
                      {seoScore}/100
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${seoScore >= 70 ? 'bg-emerald-500' : seoScore >= 40 ? 'bg-amber-500' : 'bg-destructive'}`}
                      style={{ width: `${seoScore}%` }}
                    />
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {!featuredImageAlt && <p>⚠ Adicione texto alt à imagem</p>}
                    {faqs.length === 0 && <p>💡 Adicione FAQs para Rich Snippets</p>}
                    {!aiSummary && <p>💡 Adicione resumo IA (TL;DR)</p>}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Super Image Upload */}
              <BlogImageUpload
                value={featuredImage}
                altText={featuredImageAlt}
                onChange={setFeaturedImage}
                onAltTextChange={setFeaturedImageAlt}
              />

              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Globe className="h-3 w-3" /> Regional Tag (GEO)</Label>
                <Input value={geoLocation} onChange={(e) => setGeoLocation(e.target.value)}
                  placeholder="Ex: Curitiba, PR" />
                <p className="text-xs text-muted-foreground">
                  Usado para filtro regional e contentLocation no JSON-LD
                </p>
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <h4 className="text-sm font-semibold">Meta SEO</h4>
                <div className="space-y-2">
                  <Label className="text-xs">SEO Title ({seoTitle.length}/60)</Label>
                  <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)}
                    placeholder={title || 'Título SEO'} maxLength={60} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Meta Description ({seoDescription.length}/160)</Label>
                  <Textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)}
                    placeholder="Descrição para o Google..." maxLength={160} rows={2} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Keywords (separadas por vírgula)</Label>
                  <Input value={seoKeywords} onChange={(e) => setSeoKeywords(e.target.value)}
                    placeholder="imobiliária, gestão, CRM" />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label>Publicar agora</Label>
                <Switch checked={isPublished} onCheckedChange={setIsPublished} />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => saveMutation.mutate(false)}
                  disabled={saveMutation.isPending || !title || !content}>
                  {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  Salvar Rascunho
                </Button>
                <Button className="flex-1" onClick={() => saveMutation.mutate(true)}
                  disabled={saveMutation.isPending || !title || !content}>
                  {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  Publicar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
