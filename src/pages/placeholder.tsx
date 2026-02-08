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

export default function PlaceholderPage() {
  const location = useLocation();
  const name = pageNames[location.pathname] || "Página";

  return (
    <div>
      <h1 className="text-2xl font-bold">{name}</h1>
      <p className="text-muted-foreground mt-1">Esta página será implementada em breve.</p>
    </div>
  );
}
