import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link, useSearchParams } from 'react-router-dom';
import { SEOHead } from '@/components/SEOHead';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { FooterSection } from '@/components/landing/FooterSection';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, ArrowRight, Loader2, MapPin, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Helmet } from 'react-helmet-async';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image: string | null;
  featured_image_alt: string | null;
  category_id: string | null;
  is_published: boolean;
  published_at: string | null;
  reading_time_min: number | null;
  views_count: number;
  ai_summary: string | null;
  geo_location: string | null;
  seo_tags: Record<string, string>;
}

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  color: string | null;
}

export default function Blog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const geoFilter = searchParams.get('geo') || '';
  const [activeCat, setActiveCat] = useState<string | null>(null);

  const { data: posts, isLoading } = useQuery({
    queryKey: ['blog-posts-public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, featured_image, featured_image_alt, category_id, is_published, published_at, reading_time_min, views_count, ai_summary, geo_location, seo_tags')
        .eq('is_published', true)
        .order('published_at', { ascending: false });
      if (error) throw error;
      return data as unknown as BlogPost[];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['blog-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_categories')
        .select('id, name, slug, color')
        .order('sort_order');
      if (error) throw error;
      return data as BlogCategory[];
    },
  });

  const getCat = (id: string | null) => categories?.find((c) => c.id === id);

  // Filter posts by GEO and category
  const filtered = (posts || []).filter((p) => {
    if (geoFilter && p.geo_location !== geoFilter) return false;
    if (activeCat && p.category_id !== activeCat) return false;
    return true;
  });

  const featured = filtered[0];
  const rest = filtered.slice(1);

  // Extract unique GEO locations for display
  const geoLocations = [...new Set((posts || []).map(p => p.geo_location).filter(Boolean))] as string[];

  const clearGeo = () => {
    searchParams.delete('geo');
    setSearchParams(searchParams);
  };

  return (
    <>
      <SEOHead
        title="Blog - Conteúdo para o Mercado Imobiliário"
        description="Artigos, dicas e estratégias para corretores e gestores imobiliários. Gestão, vendas, locação e tecnologia."
        path="/blog"
      />
      <Helmet>
        <link rel="alternate" type="application/rss+xml" title="SlotiMob Blog RSS" href="/rss.xml" />
      </Helmet>

      <div className="min-h-screen bg-background" data-theme="light-green">
        <LandingHeader />

        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Blog SlotiMob
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Conteúdo estratégico para quem quer escalar no mercado imobiliário.
              </p>

              {/* Category pills */}
              {categories && categories.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mt-6">
                  <Badge
                    variant={!activeCat ? 'default' : 'outline'}
                    className="px-3 py-1 text-sm cursor-pointer"
                    onClick={() => setActiveCat(null)}
                  >
                    Todos
                  </Badge>
                  {categories.map((cat) => (
                    <Badge
                      key={cat.id}
                      variant={activeCat === cat.id ? 'default' : 'outline'}
                      className="px-3 py-1 text-sm cursor-pointer"
                      onClick={() => setActiveCat(activeCat === cat.id ? null : cat.id)}
                    >
                      {cat.name}
                    </Badge>
                  ))}
                </div>
              )}

              {/* GEO filter indicator */}
              {geoFilter && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Badge variant="secondary" className="gap-1 px-3 py-1">
                    <MapPin className="h-3 w-3" /> {geoFilter}
                    <button onClick={clearGeo} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                </div>
              )}

              {/* Regional tags */}
              {!geoFilter && geoLocations.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mt-3">
                  {geoLocations.map((geo) => (
                    <Badge
                      key={geo}
                      variant="outline"
                      className="text-xs cursor-pointer gap-1 hover:bg-primary/10"
                      onClick={() => setSearchParams({ geo })}
                    >
                      <MapPin className="h-3 w-3" /> {geo}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !filtered || filtered.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <p className="text-lg">Nenhum artigo encontrado.</p>
                {(geoFilter || activeCat) && (
                  <button
                    onClick={() => { clearGeo(); setActiveCat(null); }}
                    className="text-sm mt-2 text-primary hover:underline"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-12">
                {/* Featured post */}
                {featured && (
                  <Link to={`/blog/${featured.slug}`} className="block group">
                    <article className="relative rounded-2xl overflow-hidden bg-card border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-xl">
                      <div className="grid md:grid-cols-2">
                        <div className="aspect-video md:aspect-auto overflow-hidden bg-muted">
                          {featured.featured_image ? (
                            <img
                              src={featured.featured_image}
                              alt={featured.featured_image_alt || featured.title}
                              className="w-full h-full object-cover"
                              loading="eager"
                              fetchPriority="high"
                            />
                          ) : (
                            <div className="w-full h-full min-h-[240px] bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                              <span className="text-6xl opacity-20">📝</span>
                            </div>
                          )}
                        </div>
                        <div className="p-6 md:p-10 flex flex-col justify-center">
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            {getCat(featured.category_id) && (
                              <Badge variant="secondary" className="text-xs">
                                {getCat(featured.category_id)!.name}
                              </Badge>
                            )}
                            {featured.geo_location && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <MapPin className="h-3 w-3" /> {featured.geo_location}
                              </Badge>
                            )}
                          </div>
                          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors line-clamp-2">
                            {featured.title}
                          </h2>
                          <p className="text-muted-foreground mb-4 line-clamp-3">
                            {featured.excerpt || featured.ai_summary || ''}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {featured.published_at && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(featured.published_at), "d 'de' MMM, yyyy", { locale: ptBR })}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {featured.reading_time_min || 5} min
                            </span>
                          </div>
                          <span className="inline-flex items-center gap-1 text-primary font-medium mt-4 text-sm group-hover:gap-2 transition-all">
                            Ler artigo <ArrowRight className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                    </article>
                  </Link>
                )}

                {/* Grid */}
                {rest.length > 0 && (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rest.map((post) => (
                      <Link key={post.id} to={`/blog/${post.slug}`} className="group">
                        <article className="rounded-xl overflow-hidden bg-card border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-lg h-full flex flex-col">
                          <div className="aspect-video overflow-hidden bg-muted">
                            {post.featured_image ? (
                              <img
                                src={post.featured_image}
                                alt={post.featured_image_alt || post.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                                <span className="text-4xl opacity-20">📝</span>
                              </div>
                            )}
                          </div>
                          <div className="p-5 flex flex-col flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 mb-2">
                              {getCat(post.category_id) && (
                                <Badge variant="outline" className="text-xs">
                                  {getCat(post.category_id)!.name}
                                </Badge>
                              )}
                              {post.geo_location && (
                                <Badge variant="outline" className="text-xs gap-0.5">
                                  <MapPin className="h-2.5 w-2.5" /> {post.geo_location}
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2">
                              {post.title}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
                              {post.excerpt || ''}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                              {post.published_at && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(post.published_at), "d MMM yyyy", { locale: ptBR })}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {post.reading_time_min || 5} min
                              </span>
                            </div>
                          </div>
                        </article>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        <FooterSection />
      </div>
    </>
  );
}
