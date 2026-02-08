import { forwardRef } from "react";
import { useLocation } from "react-router-dom";

const pageNames: Record<string, string> = {
  "/properties": "Empreendimentos",
  "/units": "Unidades",
  "/real-estate": "Imóveis Avulsos",
  "/asset-health": "Gestão de Ativos",
  "/contacts": "Contatos",
  "/pipeline": "Pipeline",
  "/schedule": "Agenda",
  "/finance": "Financeiro",
  "/documents": "Documentos",
  "/reports": "Relatórios",
  "/settings": "Configurações",
};

const PlaceholderPage = forwardRef<HTMLDivElement>((_, ref) => {
  const location = useLocation();
  const name = pageNames[location.pathname] || "Página";

  return (
    <div ref={ref}>
      <h1 className="text-2xl font-bold">{name}</h1>
      <p className="text-muted-foreground mt-1">Esta página será implementada em breve.</p>
    </div>
  );
});

PlaceholderPage.displayName = "PlaceholderPage";

export default PlaceholderPage;
