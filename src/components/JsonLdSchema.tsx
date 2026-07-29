import { Helmet } from 'react-helmet-async';

const BASE_URL = 'https://slotimob.com.br';

// Organization schema for the company
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "SLOTI",
  "legalName": "SLOTI",
  "url": BASE_URL,
  "logo": `${BASE_URL}/sloti-logo.png`,
  "description": "Empresa de tecnologia especializada em soluções otimizadas para o mercado imobiliário",
  "foundingDate": "2025",
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "BR"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "email": "contato@slotimob.com.br",
    "contactType": "customer service",
    "availableLanguage": ["Portuguese"]
  },
  "sameAs": []
};

// SoftwareApplication schema for the SLOTIMOB app
const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "SLOTIMOB",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "description": "Sistema de gestão imobiliária completo para corretores. CRM, pipeline de vendas, gestão de imóveis, integração WhatsApp e simuladores financeiros.",
  "url": BASE_URL,
  "screenshot": `${BASE_URL}/sloti-logo.png`,
  "softwareVersion": "1.0",
  "author": {
    "@type": "Organization",
    "name": "SLOTI"
  },
  "offers": {
    "@type": "Offer",
    "price": "997",
    "priceCurrency": "BRL",
    "priceValidUntil": "2027-12-31",
    "availability": "https://schema.org/InStock"
  },
  "featureList": [
    "CRM imobiliário completo",
    "Pipeline de vendas visual (Quadro de Status)",
    "Gestão de leads e contatos",
    "Catálogo de imóveis e unidades",
    "Integração com WhatsApp",
    "Simuladores de financiamento",
    "Calculadora de rentabilidade",
    "Geração de documentos",
    "Relatórios semanais e mensais",
    "Agenda de atividades"
  ],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "5",
    "ratingCount": "1",
    "bestRating": "5",
    "worstRating": "1"
  }
};

// WebSite schema for search functionality
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "SLOTIMOB",
  "url": BASE_URL,
  "description": "Sistema de gestão imobiliária completo para corretores",
  "publisher": {
    "@type": "Organization",
    "name": "SLOTI"
  }
};

export function JsonLdSchema() {
  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(softwareApplicationSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(websiteSchema)}
      </script>
    </Helmet>
  );
}

export default JsonLdSchema;
