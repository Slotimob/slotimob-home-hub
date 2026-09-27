import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import SectionWrapper from '@/components/marketing/SectionWrapper';

interface HighlightPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  published_at: string | null;
}

export function LpBlogHighlights() {
  const { data: posts, isError } = useQuery({
    queryKey: ['blog-highlights-home'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, published_at')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(3);
      if (error) throw error;
      return data as HighlightPost[];
    },
  });

  if (isError || !posts || posts.length === 0) return null;

  return (
    <SectionWrapper id="blog">
      <div className="text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">Do blog</h2>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
        {posts.map((post) => (
          <Link key={post.id} to={`/blog/${post.slug}`} className="group">
            <article className="rounded-xl bg-card border border-border hover:border-accent/30 transition-all duration-300 hover:shadow-lg h-full flex flex-col p-5">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2">
                {post.title}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{post.excerpt || ''}</p>
              {post.published_at && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(post.published_at), 'dd/MM/yyyy')}
                </span>
              )}
            </article>
          </Link>
        ))}
      </div>

      <div className="text-center mt-8">
        <Link to="/blog" className="inline-flex items-center gap-1 text-accent font-medium text-sm hover:gap-2 transition-all">
          Ver todos os artigos <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </SectionWrapper>
  );
}
