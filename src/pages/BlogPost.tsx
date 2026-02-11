import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SEOHead } from '@/components/SEOHead';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { FooterSection } from '@/components/landing/FooterSection';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Calendar, Clock, ArrowLeft, Calculator, UserPlus, Loader2, Lightbulb, ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Helmet } from 'react-helmet-async';

interface FullPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  featured_image: string | null;
  category_id: string | null;
  author_id: string;
  seo_tags: Record<string, string>;
  geo_location: string | null;
  ai_summary: string | null;
  is_published: boolean;
  published_at: string | null;
  views_count: number;
  reading_time_min: number | null;
  created_at: string;
}

interface TocItem {
  id: string;
  text: string;
  level: number;
}

function extractToc(html: string): TocItem[] {
  const regex = /<h([2-3])[^>]*>([^<]+)<\/h[2-3]>/gi;
  const items: TocItem[] = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    const id = match[2].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    items.push({ id, text: match[2], level: parseInt(match[1]) });
  }
  return items;
}

function injectIds(html: string): string {
  return html.replace(
    /<h([2-3])([^>]*)>([^<]+)<\/h[2-3]>/gi,
    (_, level, attrs, text) => {
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return `<h${level}${attrs} id="${id}">${text}</h${level}>`;
    }
  );
}

const relatedTools = [
  { label: 'Simulador de Financiamento', href: '/simulator', icon: Calculator },
  { label: 'Criar Conta Grátis', href: '/auth', icon: UserPlus },
];

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [readProgress, setReadProgress] = useState(0);

  const { data: post, isLoading, error } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug!)
        .eq('is_published', true)
        .maybeSingle();
      if (error) throw error;
      return data as FullPost | null;
    },
    enabled: !!slug,
  });

  const { data: category } = useQuery({
    queryKey: ['blog-category', post?.category_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('blog_categories')
        .select('name, slug')
        .eq('id', post!.category_id!)
        .single();
      return data;
    },
    enabled: !!post?.category_id,
  });

  // Increment view count
  useEffect(() => {
    if (post?.id) {
      supabase.from('blog_posts')
        .update({ views_count: (post.views_count || 0) + 1 })
        .eq('id', post.id)
        .then();
    }
  }, [post?.id]);

  // Reading progress
  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setReadProgress(docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toc = useMemo(() => post ? extractToc(post.content) : [], [post?.content]);
  const processedContent = useMemo(() => post ? injectIds(post.content) : '', [post?.content]);

  const seoTags = (post?.seo_tags || {}) as Record<string, string>;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-theme="light-green">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background" data-theme="light-green">
        <LandingHeader />
        <div className="pt-24 text-center py-20">
          <h1 className="text-2xl font-bold mb-4">Artigo não encontrado</h1>
          <Button asChild variant="outline">
            <Link to="/blog"><ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao Blog</Link>
          </Button>
        </div>
      </div>
    );
  }

  // JSON-LD Article schema
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: seoTags.description || post.excerpt || '',
    image: post.featured_image || 'https://slotimob.com.br/sloti-logo.png',
    datePublished: post.published_at,
    dateModified: post.published_at,
    author: { '@type': 'Organization', name: 'SlotiMob' },
    publisher: {
      '@type': 'Organization',
      name: 'SlotiMob',
      logo: { '@type': 'ImageObject', url: 'https://slotimob.com.br/sloti-logo.png' },
    },
    mainEntityOfPage: `https://slotimob.com.br/blog/${post.slug}`,
    wordCount: post.content.replace(/<[^>]*>/g, '').split(/\s+/).length,
  };

  return (
    <>
      <SEOHead
        title={seoTags.title || post.title}
        description={seoTags.description || post.excerpt || `Leia: ${post.title}`}
        path={`/blog/${post.slug}`}
        image={post.featured_image || undefined}
        type="article"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
        {seoTags.keywords && <meta name="keywords" content={seoTags.keywords} />}
        {post.geo_location && <meta name="geo.region" content={post.geo_location} />}
      </Helmet>

      <div className="min-h-screen bg-background" data-theme="light-green">
        {/* Reading progress bar */}
        <div className="fixed top-0 left-0 right-0 z-[60]">
          <Progress value={readProgress} className="h-1 rounded-none" />
        </div>

        <LandingHeader />

        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            {/* Back link */}
            <Link to="/blog" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Voltar ao Blog
            </Link>

            <div className="grid lg:grid-cols-[1fr_280px] gap-8 max-w-5xl mx-auto">
              {/* Article */}
              <article>
                {/* Meta */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  {category && (
                    <Badge variant="secondary" className="text-xs">{category.name}</Badge>
                  )}
                  {post.published_at && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(post.published_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {post.reading_time_min || 5} min de leitura
                  </span>
                </div>

                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6 leading-tight">
                  {post.title}
                </h1>

                {/* Featured image */}
                {post.featured_image && (
                  <img
                    src={post.featured_image}
                    alt={post.title}
                    className="w-full rounded-xl mb-8 aspect-video object-cover"
                    loading="eager"
                  />
                )}

                {/* AI Summary / TL;DR */}
                {post.ai_summary && (
                  <Card className="mb-8 border-primary/20 bg-primary/5">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="font-semibold text-sm text-primary mb-1">TL;DR — Resumo IA</p>
                          <p className="text-sm text-foreground/80">{post.ai_summary}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Content */}
                <div
                  className="prose prose-lg max-w-none dark:prose-invert prose-headings:scroll-mt-20 prose-a:text-primary prose-img:rounded-xl"
                  dangerouslySetInnerHTML={{ __html: processedContent }}
                />
              </article>

              {/* Sidebar */}
              <aside className="space-y-6 hidden lg:block">
                <div className="sticky top-20 space-y-6">
                  {/* Table of Contents */}
                  {toc.length > 0 && (
                    <Card>
                      <CardContent className="p-4">
                        <h3 className="text-sm font-semibold mb-3">Sumário</h3>
                        <nav className="space-y-1">
                          {toc.map((item) => (
                            <a
                              key={item.id}
                              href={`#${item.id}`}
                              className={`block text-sm text-muted-foreground hover:text-foreground transition-colors ${item.level === 3 ? 'pl-4' : ''}`}
                              onClick={(e) => {
                                e.preventDefault();
                                document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                              }}
                            >
                              <span className="flex items-center gap-1">
                                <ChevronRight className="h-3 w-3 shrink-0" />
                                <span className="line-clamp-2">{item.text}</span>
                              </span>
                            </a>
                          ))}
                        </nav>
                      </CardContent>
                    </Card>
                  )}

                  {/* Related Tools */}
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="text-sm font-semibold mb-3">Ferramentas Relacionadas</h3>
                      <div className="space-y-2">
                        {relatedTools.map((tool) => (
                          <Link
                            key={tool.href}
                            to={tool.href}
                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors text-sm text-muted-foreground hover:text-foreground"
                          >
                            <tool.icon className="h-4 w-4 shrink-0" />
                            {tool.label}
                          </Link>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </aside>
            </div>
          </div>
        </main>

        <FooterSection />
      </div>
    </>
  );
}
