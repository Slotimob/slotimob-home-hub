import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

const BASE_URL = 'https://slotimob.com.br';

// Route configuration with labels and parent relationships
const routeConfig: Record<string, { label: string; parent?: string }> = {
  '/': { label: 'Início' },
  '/properties': { label: 'Empreendimentos', parent: '/' },
  '/real-estate': { label: 'Imóveis', parent: '/' },
  '/units': { label: 'Unidades', parent: '/' },
  '/pipeline': { label: 'Pipeline', parent: '/' },
  '/leads': { label: 'Leads', parent: '/' },
  '/contacts': { label: 'Contatos', parent: '/' },
  '/contacts/owners': { label: 'Proprietários', parent: '/contacts' },
  '/contacts/leads': { label: 'Leads', parent: '/contacts' },
  '/contacts/companies': { label: 'Empresas', parent: '/contacts' },
  '/documents': { label: 'Documentos', parent: '/' },
  '/documents/templates': { label: 'Modelos', parent: '/documents' },
  '/documents/history': { label: 'Histórico', parent: '/documents' },
  '/simulator': { label: 'Simulador', parent: '/' },
  '/simulator/financing': { label: 'Financiamento', parent: '/simulator' },
  '/simulator/taxes': { label: 'Taxas e IPTU', parent: '/simulator' },
  '/simulator/comparison': { label: 'Comparativo', parent: '/simulator' },
  '/rentability': { label: 'Rentabilidade', parent: '/' },
  '/rentability/yield': { label: 'Retorno', parent: '/rentability' },
  '/rentability/payback': { label: 'Payback', parent: '/rentability' },
  '/rentability/comparison': { label: 'Comparativo', parent: '/rentability' },
  '/schedule': { label: 'Agenda', parent: '/' },
  '/portals': { label: 'Portais', parent: '/' },
  '/reports': { label: 'Relatórios', parent: '/' },
  '/reports/weekly': { label: 'Resumo Semanal', parent: '/reports' },
  '/reports/monthly': { label: 'Resumo Mensal', parent: '/reports' },
  '/integrations': { label: 'Integrações', parent: '/' },
  '/training': { label: 'Treinamento', parent: '/' },
  '/whatsapp': { label: 'WhatsApp', parent: '/' },
  
  '/settings': { label: 'Configurações', parent: '/' },
  '/notification-history': { label: 'Notificações', parent: '/' },
  '/history': { label: 'Histórico de Atividades', parent: '/' },
  '/admin/terms': { label: 'Termos (Admin)', parent: '/' },
  '/admin/users': { label: 'Usuários (Admin)', parent: '/' },
};

interface BreadcrumbItem {
  label: string;
  path: string;
  isLast: boolean;
}

function buildBreadcrumbTrail(pathname: string): BreadcrumbItem[] {
  const trail: BreadcrumbItem[] = [];
  let currentPath = pathname;

  // Handle dynamic routes (e.g., /properties/:id/units)
  const dynamicRouteMatch = pathname.match(/^\/properties\/([^/]+)\/units$/);
  if (dynamicRouteMatch) {
    trail.unshift({ label: 'Unidades', path: pathname, isLast: true });
    trail.unshift({ label: 'Empreendimento', path: `/properties`, isLast: false });
    trail.unshift({ label: 'Início', path: '/', isLast: false });
    return trail;
  }

  // Build trail from current route up to root
  while (currentPath && routeConfig[currentPath]) {
    const config = routeConfig[currentPath];
    trail.unshift({
      label: config.label,
      path: currentPath,
      isLast: trail.length === 0,
    });
    currentPath = config.parent || '';
  }

  return trail;
}

function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.label,
      "item": `${BASE_URL}${item.path}`
    }))
  };
}

interface BreadcrumbsProps {
  className?: string;
}

export function Breadcrumbs({ className = '' }: BreadcrumbsProps) {
  const location = useLocation();
  const trail = buildBreadcrumbTrail(location.pathname);

  // Don't render breadcrumbs on home page or if trail is too short
  if (trail.length <= 1 || location.pathname === '/') {
    return null;
  }

  const schema = generateBreadcrumbSchema(trail);

  return (
    <>
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      </Helmet>
      <nav 
        aria-label="Breadcrumb" 
        className={`flex items-center text-sm text-muted-foreground ${className}`}
      >
        <ol className="flex items-center flex-wrap gap-1">
          {trail.map((item, index) => (
            <li key={item.path} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="h-3.5 w-3.5 mx-1 flex-shrink-0" />
              )}
              {item.isLast ? (
                <span 
                  className="font-medium text-foreground truncate max-w-[150px] md:max-w-none"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.path}
                  className="hover:text-foreground transition-colors flex items-center gap-1 truncate max-w-[100px] md:max-w-none"
                >
                  {index === 0 && <Home className="h-3.5 w-3.5 flex-shrink-0" />}
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}

export default Breadcrumbs;
