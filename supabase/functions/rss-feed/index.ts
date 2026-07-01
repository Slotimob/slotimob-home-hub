import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: posts, error } = await supabase
      .from('blog_posts')
      .select('title, slug, excerpt, published_at, featured_image')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error fetching posts:', error)
      return new Response('Error fetching posts', { status: 500 })
    }

    const items = (posts || []).map((post) => {
      const pubDate = post.published_at
        ? new Date(post.published_at).toUTCString()
        : new Date().toUTCString()
      const description = (post.excerpt || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      const title = (post.title || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      const imageTag = post.featured_image
        ? `<enclosure url="${post.featured_image}" type="image/jpeg" length="0"/>`
        : ''
      return `
    <item>
      <title><![CDATA[${title}]]></title>
      <link>https://slotimob.com.br/blog/${post.slug}</link>
      <guid isPermaLink="true">https://slotimob.com.br/blog/${post.slug}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${description}]]></description>
      ${imageTag}
    </item>`
    }).join('')

    const now = new Date().toUTCString()
    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Blog Slotimob — Gestão de Aluguel para Proprietários</title>
    <link>https://slotimob.com.br/blog</link>
    <description>Dicas e guias práticos para proprietários de imóveis: boletos, contratos, reajuste IGPM/IPCA e gestão financeira.</description>
    <language>pt-BR</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="https://nelmmrqdiycmdhhslxfz.supabase.co/functions/v1/rss-feed" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`

    return new Response(rss, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response('Internal server error', { status: 500 })
  }
})