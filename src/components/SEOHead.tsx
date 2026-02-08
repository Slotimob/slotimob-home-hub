import { Helmet, HelmetProvider } from 'react-helmet-async';

const BASE_URL = 'https://slotimob.com.br';
const DEFAULT_IMAGE = `${BASE_URL}/sloti-logo.png`;
const DEFAULT_TITLE = 'SLOTIMOB - Gestão Imobiliária';
const DEFAULT_DESCRIPTION = 'Sistema de gestão imobiliária completo para corretores';

interface SEOHeadProps {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: 'website' | 'article';
  noIndex?: boolean;
}

export function SEOHead({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  path = '',
  image = DEFAULT_IMAGE,
  type = 'website',
  noIndex = false,
}: SEOHeadProps) {
  const canonicalUrl = `${BASE_URL}${path}`;
  const fullTitle = title === DEFAULT_TITLE ? title : `${title} | SLOTIMOB`;
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
      <meta property="og:site_name" content="SLOTIMOB" />
      <meta property="og:locale" content="pt_BR" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:site" content="@SLOTIMOB" />
    </Helmet>
  );
}

// Provider wrapper component
export function SEOProvider({ children }: { children: React.ReactNode }) {
  return <HelmetProvider>{children}</HelmetProvider>;
}
