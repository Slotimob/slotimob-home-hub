import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ObligationType } from "@/hooks/useAssetHealth";

// Maps obligation types to likely category names/keywords
const OBLIGATION_CATEGORY_KEYWORDS: Record<ObligationType, string[]> = {
  rent: ["aluguel", "rent", "locação", "receita de aluguel"],
  condominium: ["condomínio", "condominio", "taxa condominial"],
  iptu: ["iptu", "imposto predial", "imposto territorial"],
  energy: ["energia", "luz", "eletricidade", "conta de luz", "cemig", "enel"],
  water: ["água", "agua", "conta de água", "saneamento", "copasa", "sabesp"],
  gas: ["gás", "gas", "conta de gás"],
  garbage_fee: ["taxa de lixo", "lixo", "coleta de lixo"],
  insurance: ["seguro", "seguro incêndio", "seguro residencial"],
  other: ["outros", "outras despesas"],
};

// Get the transaction type for each obligation
const OBLIGATION_TRANSACTION_TYPE: Record<ObligationType, "income" | "expense"> = {
  rent: "income", // Rent is income for the property owner
  condominium: "expense",
  iptu: "expense",
  energy: "expense",
  water: "expense",
  gas: "expense",
  garbage_fee: "expense",
  insurance: "expense",
  other: "expense",
};

export function useObligationCategoryMapping() {
  const { data: categories = [] } = useQuery({
    queryKey: ["financial-categories-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const findCategoryForObligation = (obligationType: ObligationType): string | null => {
    const keywords = OBLIGATION_CATEGORY_KEYWORDS[obligationType];
    const expectedType = OBLIGATION_TRANSACTION_TYPE[obligationType];
    
    // Try to find a matching category
    for (const keyword of keywords) {
      const match = categories.find(
        (cat) =>
          cat.type === expectedType &&
          cat.name.toLowerCase().includes(keyword.toLowerCase())
      );
      if (match) return match.id;
    }
    
    return null;
  };

  const getTransactionTypeForObligation = (obligationType: ObligationType): "income" | "expense" => {
    return OBLIGATION_TRANSACTION_TYPE[obligationType];
  };

  return {
    categories,
    findCategoryForObligation,
    getTransactionTypeForObligation,
  };
}
