import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import SectionWrapper from '@/components/marketing/SectionWrapper';
import CTAButton from '@/components/marketing/CTAButton';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image: string | null;
  published_at: string | null;
  blog_categories?: { name: string | null } | null;
}

const dateFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

export function LpBlogPreview() {
  const [posts, setPosts] = useState<BlogPost[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, featured_image, published_at, blog_categories(name)')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(3);
      if (cancelled) return;
      if (error) {
        setError(true);
      } else {
        setPosts((data ?? []) as unknown as BlogPost[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loading && (error || !posts || posts.length === 0)) return null;

  return (
    <SectionWrapper background="muted" id="blog">
      <div className="text-center mb-10 md:mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
          Aprenda a gerir seus imóveis melhor
        </h2>
        <p className="text-lg text-muted-foreground mt-3 max-w-2xl mx-auto">
          Dicas práticas de gestão, contratos, finanças e legislação.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <PostSkeleton key={i} />)
          : posts!.map((post) => <PostCard key={post.id} post={post} />)}
      </div>

      <div className="text-center mt-10">
        <CTAButton href="/blog" variant="secondary">
          Ver todos os artigos
        </CTAButton>
      </div>
    </SectionWrapper>
  );
}

function PostCard({ post }: { post: BlogPost }) {
  const category = post.blog_categories?.name ?? null;
  const dateLabel = post.published_at ? dateFmt.format(new Date(post.published_at)) : '';

  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md transition-shadow duration-200 flex flex-col"
    >
      {post.featured_image ? (
        <img
          src={post.featured_image}
          alt={post.title}
          loading="lazy"
          className="w-full h-48 object-cover"
        />
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
          <BookOpen className="h-10 w-10 text-primary/60" />
        </div>
      )}

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center justify-between gap-3 mb-3">
          {category ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[11px] font-semibold uppercase tracking-wide">
              {category}
            </span>
          ) : (
            <span />
          )}
          {dateLabel && (
            <span className="text-xs text-muted-foreground">{dateLabel}</span>
          )}
        </div>

        <h3 className="font-semibold text-foreground line-clamp-2 leading-snug">
          {post.title}
        </h3>

        {post.excerpt && (
          <p className="text-sm text-muted-foreground line-clamp-3 mt-2">
            {post.excerpt}
          </p>
        )}

        <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent mt-4 group-hover:gap-2 transition-all">
          Ler artigo <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}

function PostSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="h-48 bg-muted animate-pulse" />
      <div className="p-5 space-y-3">
        <div className="h-3 w-1/3 bg-muted rounded animate-pulse" />
        <div className="h-4 w-full bg-muted rounded animate-pulse" />
        <div className="h-4 w-4/5 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
}
