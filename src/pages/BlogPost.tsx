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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Calendar, Clock, ArrowLeft, Calculator, UserPlus, Loader2, Lightbulb, ChevronRight,
  Linkedin, Instagram, MapPin,
} from 'lucide-react';
import DOMPurify from 'dompurify';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Helmet } from 'react-helmet-async';

interface FaqItem { question: string; answer: string; }

interface FullPost {
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
}

interface TocItem { id: string; text: string; level: number; }

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

// GEO coordinates mapping for contentLocation
const GEO_COORDS: Record<string, { lat: string; lng: string }> = {
  'curitiba': { lat: '-25.4284', lng: '-49.2733' },
  'são paulo': { lat: '-23.5505', lng: '-46.6333' },
  'rio de janeiro': { lat: '-22.9068', lng: '-43.1729' },
  'belo horizonte': { lat: '-19.9167', lng: '-43.9345' },
  'brasília': { lat: '-15.7975', lng: '-47.8919' },
  'salvador': { lat: '-12.9714', lng: '-38.5124' },
  'florianópolis': { lat: '-27.5954', lng: '-48.5480' },
  'porto alegre': { lat: '-30.0346', lng: '-51.2177' },
  'recife': { lat: '-8.0476', lng: '-34.8770' },
  'fortaleza': { lat: '-3.7172', lng: '-38.5433' },
};

function getGeoCoords(location: string | null) {
  if (!location) return null;
  const key = location.split(',')[0].trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return GEO_COORDS[key] || null;
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [readProgress, setReadProgress] = useState(0);

  const { data: post, isLoading } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug!)
        .eq('is_published', true)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as FullPost | null;
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

  // Author profile for E-E-A-T
  const { data: author } = useQuery({
    queryKey: ['blog-author', post?.author_id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('profile_directory')
        .select('full_name, bio_mini, linkedin_url, instagram_url, author_role, avatar_url')
        .eq('id', post!.author_id)
        .single();
      return data as any;
    },
    enabled: !!post?.author_id,
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
  const processedContent = useMemo(() => post ? DOMPurify.sanitize(injectIds(post.content), { ADD_ATTR: ['id'], ALLOW_DATA_ATTR: false }) : '', [post?.content]);
  const faqs = useMemo(() => Array.isArray(post?.faqs) ? post!.faqs : [], [post?.faqs]);

  const seoTags = (post?.seo_tags || {}) as Record<string, string>;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background" data-theme="light-green">
        <LandingHeader />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-5xl">
            <Skeleton className="h-6 w-32 mb-6" />
            <Skeleton className="h-10 w-3/4 mb-4" />
            <Skeleton className="h-4 w-48 mb-6" />
            {/* Reserve CLS space for featured image */}
            <Skeleton className="w-full aspect-video rounded-xl mb-8" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          </div>
        </main>
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

  const geoCoords = getGeoCoords(post.geo_location);

  // JSON-LD Article schema with E-E-A-T author
  const articleSchema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: seoTags.description || post.excerpt || '',
    image: post.featured_image || 'https://slotimob.com.br/sloti-logo.png',
    datePublished: post.published_at,
    dateModified: post.published_at,
    author: {
      '@type': 'Person',
      name: author?.full_name || 'SlotiMob',
      ...(author?.author_role && { jobTitle: author.author_role }),
      ...(author?.linkedin_url && { sameAs: [author.linkedin_url, ...(author?.instagram_url ? [author.instagram_url] : [])] }),
    },
    publisher: {
      '@type': 'Organization',
      name: 'SlotiMob',
      logo: { '@type': 'ImageObject', url: 'https://slotimob.com.br/sloti-logo.png' },
    },
    mainEntityOfPage: `https://slotimob.com.br/blog/${post.slug}`,
    wordCount: post.content.replace(/<[^>]*>/g, '').split(/\s+/).length,
  };

  // Add contentLocation for GEO
  if (post.geo_location) {
    articleSchema.contentLocation = {
      '@type': 'Place',
      name: post.geo_location,
      ...(geoCoords && {
        geo: {
          '@type': 'GeoCoordinates',
          latitude: geoCoords.lat,
          longitude: geoCoords.lng,
        },
      }),
    };
  }

  // FAQ schema
  const faqSchema = faqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  } : null;

  // HowTo schema for tech/management categories
  const categoryName = category?.name?.toLowerCase() || '';
  const isHowToCategory = ['tecnologia', 'gestão'].includes(categoryName);
  const howToSchema = isHowToCategory ? {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: post.title,
    description: post.excerpt || seoTags.description || '',
    image: post.featured_image || undefined,
    step: toc.map((item, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: item.text,
      url: `https://slotimob.com.br/blog/${post.slug}#${item.id}`,
    })),
  } : null;

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
        {faqSchema && <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>}
        {howToSchema && <script type="application/ld+json">{JSON.stringify(howToSchema)}</script>}
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
            <Link to="/blog" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Voltar ao Blog
            </Link>

            <div className="grid lg:grid-cols-[1fr_280px] gap-8 max-w-5xl mx-auto">
              {/* Article */}
              <article>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  {category && (
                    <Badge variant="secondary" className="text-xs">{category.name}</Badge>
                  )}
                  {post.geo_location && (
                    <Link
                      to={`/blog?geo=${encodeURIComponent(post.geo_location)}`}
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <MapPin className="h-3 w-3" /> {post.geo_location}
                    </Link>
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

                {/* Featured image with CLS-safe container + fetchpriority */}
                {post.featured_image && (
                  <div className="w-full aspect-video rounded-xl mb-8 overflow-hidden bg-muted">
                    <img
                      src={post.featured_image}
                      alt={post.featured_image_alt || post.title}
                      className="w-full h-full object-cover"
                      loading="eager"
                      fetchPriority="high"
                      width={1200}
                      height={675}
                    />
                  </div>
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

                {/* FAQ Section */}
                {faqs.length > 0 && (
                  <section className="mt-12 border-t border-border pt-8">
                    <h2 className="text-2xl font-bold mb-6">Perguntas Frequentes</h2>
                    <div className="space-y-4">
                      {faqs.map((faq, i) => (
                        <details key={i} className="group border border-border rounded-lg">
                          <summary className="flex items-center justify-between p-4 cursor-pointer font-medium text-foreground hover:text-primary transition-colors">
                            {faq.question}
                            <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90 shrink-0 ml-2" />
                          </summary>
                          <div className="px-4 pb-4 text-sm text-muted-foreground">
                            {faq.answer}
                          </div>
                        </details>
                      ))}
                    </div>
                  </section>
                )}

                {/* Author Card (E-E-A-T) */}
                {author && (
                  <Card className="mt-10 border-primary/10">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shrink-0 overflow-hidden">
                          {author.avatar_url ? (
                            <img src={author.avatar_url} alt={author.full_name || ''} className="h-full w-full object-cover" />
                          ) : (
                            (author.full_name || 'S')[0].toUpperCase()
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{author.full_name}</p>
                          {author.author_role && (
                            <p className="text-xs text-primary font-medium">{author.author_role}</p>
                          )}
                          {author.bio_mini && (
                            <p className="text-sm text-muted-foreground mt-1">{author.bio_mini}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            {author.linkedin_url && (
                              <a href={author.linkedin_url} target="_blank" rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-primary transition-colors">
                                <Linkedin className="h-4 w-4" />
                              </a>
                            )}
                            {author.instagram_url && (
                              <a href={author.instagram_url} target="_blank" rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-primary transition-colors">
                                <Instagram className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </article>

              {/* Sidebar */}
              <aside className="space-y-6 hidden lg:block">
                <div className="sticky top-20 space-y-6">
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
