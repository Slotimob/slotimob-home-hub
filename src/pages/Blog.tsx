import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

const PAGE_SIZE = 9;
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link, useSearchParams } from 'react-router-dom';
import { SEOHead } from '@/components/SEOHead';
import { LpHeader } from '@/components/landing/v2/LpHeader';
import '@/components/landing/v2/lp.css';
import { LpFooter } from '@/components/landing/v2/LpFooter';
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
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [activeCat, geoFilter]);

  const { data: totalCount } = useQuery({
    queryKey: ['blog-posts-count', activeCat, geoFilter],
    queryFn: async () => {
      let q = supabase
        .from('blog_posts')
        .select('id', { count: 'exact', head: true })
        .eq('is_published', true);
      if (activeCat) q = q.eq('category_id', activeCat);
      if (geoFilter) q = q.ilike('geo_location', geoFilter);
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: posts, isLoading } = useQuery({
    queryKey: ['blog-posts-public', activeCat, geoFilter, page],
    queryFn: async () => {
      const offset = (page - 1) * PAGE_SIZE;
      let q = supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, featured_image, featured_image_alt, category_id, is_published, published_at, reading_time_min, views_count, ai_summary, geo_location, seo_tags')
        .eq('is_published', true);
      if (activeCat) q = q.eq('category_id', activeCat);
      if (geoFilter) q = q.ilike('geo_location', geoFilter);
      const { data, error } = await q
        .order('published_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
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

  // Fetch geo locations independently (not filtered by current geo) for the chip row
  const { data: geoLocationsData } = useQuery({
    queryKey: ['blog-geo-locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('geo_location')
        .eq('is_published', true)
        .not('geo_location', 'is', null);
      if (error) throw error;
      return data as { geo_location: string | null }[];
    },
  });

  const getCat = (id: string | null) => categories?.find((c) => c.id === id);

  const filtered = posts || [];
  const featured = page === 1 ? filtered[0] : undefined;
  const rest = page === 1 ? filtered.slice(1) : filtered;
  const totalPages = Math.max(1, Math.ceil((totalCount ?? 0) / PAGE_SIZE));

  const geoLocations = [...new Set((geoLocationsData || []).map(p => p.geo_location).filter(Boolean))] as string[];

  const clearGeo = () => {
    searchParams.delete('geo');
    setSearchParams(searchParams);
  };

  return (
    <>
      <SEOHead
        title="Blog - Conteúdo para o Mercado Imobiliário"
        description="Dicas e guias práticos para quem gere imóveis sem depender de imobiliária. Boletos, contratos, reajustes e gestão financeira."
        path="/blog"
      />
      <Helmet>
        <link rel="alternate" type="application/rss+xml" title="Slotimob Blog RSS" href="/rss.xml" />
      </Helmet>

      <div data-lp="v2" className="min-h-screen bg-background">
        <LpHeader />

        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Blog Slotimob
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Dicas, guias e estratégias para quem gere imóveis com autonomia.
              </p>

              {/* Category pills */}
              {categories && categories.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mt-6">
                  <Badge
                    variant={!activeCat ? 'default' : 'outline'}
                    className={!activeCat ? 'bg-accent text-accent-foreground border-transparent cursor-pointer px-3 py-1 text-sm' : 'cursor-pointer px-3 py-1 text-sm'}
                    onClick={() => setActiveCat(null)}
                  >
                    Todos
                  </Badge>
                  {categories.map((cat) => (
                    <Badge
                      key={cat.id}
                      variant={activeCat === cat.id ? 'default' : 'outline'}
                      className={activeCat === cat.id ? 'bg-accent text-accent-foreground border-transparent cursor-pointer px-3 py-1 text-sm' : 'cursor-pointer px-3 py-1 text-sm'}
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
                    className="text-sm mt-2 text-accent hover:underline"
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
                    <article className="relative rounded-2xl overflow-hidden bg-card border border-border hover:border-accent/30 transition-all duration-300 hover:shadow-xl">
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
                          <span className="inline-flex items-center gap-1 text-accent font-medium mt-4 text-sm group-hover:gap-2 transition-all">
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
                        <article className="rounded-xl overflow-hidden bg-card border border-border hover:border-accent/30 transition-all duration-300 hover:shadow-lg h-full flex flex-col">
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

                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-4 mt-10">
                    <Button
                      variant="outline"
                      disabled={page === 1}
                      onClick={() => {
                        setPage((p) => Math.max(1, p - 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      ← Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Página {page} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      disabled={page >= totalPages}
                      onClick={() => {
                        setPage((p) => Math.min(totalPages, p + 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      Próxima →
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        <LpFooter />
      </div>
    </>
  );
}
