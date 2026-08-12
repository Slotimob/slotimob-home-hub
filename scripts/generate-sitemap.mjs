import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, '..', 'public', 'sitemap.xml');
const BLOG_SITEMAP_URL = 'https://nelmmrqdiycmdhhslxfz.supabase.co/functions/v1/blog-sitemap';
const TODAY = new Date().toISOString().split('T')[0];

const STATIC_URLS = `
  <url>
    <loc>https://slotimob.com.br/</loc>
    <lastmod>2026-06-27</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>

  <url>
    <loc>https://slotimob.com.br/planos</loc>
    <lastmod>2026-06-27</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>

  <url>
    <loc>https://slotimob.com.br/apresentacao</loc>
    <lastmod>2026-06-27</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>

  <url>
    <loc>https://slotimob.com.br/blog</loc>
    <lastmod>2026-06-27</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

  <url>
    <loc>https://slotimob.com.br/sobre</loc>
    <lastmod>2026-06-27</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>

  <url>
    <loc>https://slotimob.com.br/contato</loc>
    <lastmod>2026-06-27</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>

  <url>
    <loc>https://slotimob.com.br/legal?tab=terms</loc>
    <lastmod>2026-07-07</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>

  <url>
    <loc>https://slotimob.com.br/legal?tab=privacy</loc>
    <lastmod>2026-07-07</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>

  <url>
    <loc>https://slotimob.com.br/legal?tab=refund</loc>
    <lastmod>2026-07-07</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>

  <url>
    <loc>https://slotimob.com.br/calculadoras</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;

// Mantenha sincronizado com os slugs ativos de src/data/calculators.ts
const CALCULATOR_SLUGS = ['financiamento-imobiliario'];

const CALCULATOR_URLS = CALCULATOR_SLUGS.map(
  (slug) => `
  <url>
    <loc>https://slotimob.com.br/calculadoras/${slug}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`,
).join('\n');

async function fetchBlogUrls() {
  try {
    const res = await fetch(BLOG_SITEMAP_URL, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const xml = await res.text();
    const match = xml.match(/<urlset[^>]*>([\s\S]*)<\/urlset>/);
    return match ? match[1].trim() : '';
  } catch (err) {
    console.warn('[generate-sitemap] falha ao buscar blog-sitemap, seguindo so com paginas estaticas:', err.message);
    return '';
  }
}

const blogUrls = await fetchBlogUrls();

const finalXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${STATIC_URLS}
${blogUrls}
</urlset>
`;

writeFileSync(OUTPUT_PATH, finalXml, 'utf-8');
console.log('[generate-sitemap] sitemap.xml gerado com sucesso em', OUTPUT_PATH);
