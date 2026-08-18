import { Helmet, HelmetProvider } from 'react-helmet-async';
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE } from '@/config/seoDefaults';

const BASE_URL = 'https://slotimob.com.br';
const DEFAULT_IMAGE = `${BASE_URL}/sloti-logo.png`;

interface SEOHeadProps {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: 'website' | 'article';
  noIndex?: boolean;
  structuredData?: object[];
}

export function SEOHead({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  path = '',
  image = DEFAULT_IMAGE,
  type = 'website',
  noIndex = false,
  structuredData = [],
}: SEOHeadProps) {
  const canonicalUrl = `${BASE_URL}${path}`;
  const fullTitle = title === DEFAULT_TITLE ? title : `${title} | Slotimob`;
  const imageUrl = image.startsWith('http') ? image : `${BASE_URL}${image}`;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:site_name" content="Slotimob" />
      <meta property="og:locale" content="pt_BR" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:site" content="@SLOTIMOB" />
      {structuredData?.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}

// Provider wrapper component
export function SEOProvider({ children }: { children: React.ReactNode }) {
  return <HelmetProvider>{children}</HelmetProvider>;
}
