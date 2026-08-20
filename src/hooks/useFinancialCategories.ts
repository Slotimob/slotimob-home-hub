import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_FINANCIAL_CATEGORIES, CATEGORY_COLORS, CATEGORIES_WITH_TOOLTIPS } from "@/utils/financialConstants";
import { useToast } from "@/hooks/use-toast";
import { useWorkspace } from "@/hooks/useWorkspace";

interface CreateCategoryData {
  name: string;
  type: 'income' | 'expense';
  category_group: string;
  dre_type: string;
  color: string;
}

interface CategoryWithMeta {
  id: string;
  name: string;
  type: string;
  color: string | null;
  category_group: string | null;
  dre_type: string | null;
  is_default: boolean | null;
  priority?: number;
  tooltip?: string;
}

// Module-level guard: garante que o auto-seed rode apenas UMA vez por sessão,
// mesmo com várias instâncias do hook montadas simultaneamente na mesma tela.
const autoSeedAttempted = new Set<string>();

export function useFinancialCategories(type?: 'income' | 'expense') {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { effectiveBrokerId } = useWorkspace();

  const { data: categories = [], isLoading, refetch } = useQuery({
    queryKey: ["financial-categories", type],
    queryFn: async () => {
      let query = supabase
        .from("financial_categories")
        .select("*")
        .order("name");
      
      if (type) {
        query = query.eq("type", type);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Enhance categories with priority from defaults and tooltips
      const enhanced = (data || []).map((cat): CategoryWithMeta => {
        const defaultCat = DEFAULT_FINANCIAL_CATEGORIES.find(d => d.name === cat.name);
        return {
          ...cat,
          priority: defaultCat?.priority || 99,
          tooltip: CATEGORIES_WITH_TOOLTIPS[cat.name] || defaultCat?.tooltip,
        };
      });

      // Sort by priority (lower first), then alphabetically
      return enhanced.sort((a, b) => {
        const priorityDiff = (a.priority || 99) - (b.priority || 99);
        if (priorityDiff !== 0) return priorityDiff;
        return a.name.localeCompare(b.name);
      });
    },
  });

  const seedDefaultCategories = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const brokerId = effectiveBrokerId || user.id;

      // Check if user already has categories
      const { data: existing } = await supabase
        .from("financial_categories")
        .select("id")
        .eq("broker_id", brokerId)
        .limit(1);

      if (existing && existing.length > 0) {
        throw new Error("Categorias já existem para este usuário");
      }


      // Insert default categories with enforced colors
      const categoriesToInsert = DEFAULT_FINANCIAL_CATEGORIES.map(cat => ({
        broker_id: brokerId,
        name: cat.name,
        type: cat.type,
        category_group: cat.group,
        dre_type: cat.dre_type,
        // Force standardized colors based on type
        color: cat.type === 'income' ? CATEGORY_COLORS.income : CATEGORY_COLORS.expense,
        is_default: true,
      }));

      // Upsert idempotente: corridas paralelas não geram duplicatas nem erro
      const { error } = await supabase
        .from("financial_categories")
        .upsert(categoriesToInsert, {
          onConflict: "broker_id,name,type",
          ignoreDuplicates: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-categories"] });
      toast({ title: "Categorias padrão criadas com sucesso!" });
    },
    onError: (error: Error) => {
      if (error.message !== "Categorias já existem para este usuário") {
        toast({
          title: "Erro ao criar categorias",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const resetToDefaultCategories = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Delete all existing categories for this user
      const { error: deleteError } = await supabase
        .from("financial_categories")
        .delete()
        .eq("broker_id", user.id);

      if (deleteError) throw deleteError;

      // Insert default categories with enforced colors
      const categoriesToInsert = DEFAULT_FINANCIAL_CATEGORIES.map(cat => ({
        broker_id: effectiveBrokerId || user.id,
        name: cat.name,
        type: cat.type,
        category_group: cat.group,
        dre_type: cat.dre_type,
        color: cat.type === 'income' ? CATEGORY_COLORS.income : CATEGORY_COLORS.expense,
        is_default: true,
      }));

      const { error: insertError } = await supabase
        .from("financial_categories")
        .insert(categoriesToInsert);

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-categories"] });
      toast({ title: "Categorias restauradas com sucesso!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao restaurar categorias",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createCategory = useMutation({
    mutationFn: async (data: CreateCategoryData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Force standardized color based on type
      const color = data.type === 'income' ? CATEGORY_COLORS.income : CATEGORY_COLORS.expense;

      const { data: category, error } = await supabase
        .from("financial_categories")
        .insert({
          broker_id: effectiveBrokerId || user.id,
          name: data.name,
          type: data.type,
          category_group: data.category_group,
          dre_type: data.dre_type,
          color: color,
          is_default: false,
        })
        .select()
        .single();

      if (error) throw error;
      return category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-categories"] });
      toast({ title: "Categoria criada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar categoria",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...data }: CreateCategoryData & { id: string }) => {
      // Force standardized color based on type
      const color = data.type === 'income' ? CATEGORY_COLORS.income : CATEGORY_COLORS.expense;

      const { error } = await supabase
        .from("financial_categories")
        .update({
          name: data.name,
          type: data.type,
          category_group: data.category_group,
          dre_type: data.dre_type,
          color: color,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-categories"] });
      toast({ title: "Categoria atualizada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar categoria",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("financial_categories")
        .delete()
        .eq("id", id)
        .eq("is_default", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-categories"] });
      toast({ title: "Categoria excluída com sucesso!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir categoria",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (isLoading) return;
    if (!effectiveBrokerId) return;
    if (categories.length > 0) return;
    if (seedDefaultCategories.isPending) return;
    // Guard global (module-level): apenas a primeira instância montada dispara o seed
    if (autoSeedAttempted.has(effectiveBrokerId)) return;

    autoSeedAttempted.add(effectiveBrokerId);
    seedDefaultCategories.mutate();
  }, [isLoading, effectiveBrokerId, categories.length, seedDefaultCategories.isPending, seedDefaultCategories.mutate]);

  // Group categories by category_group for organized dropdown
  const categoriesByGroup = categories.reduce((acc, cat) => {
    const group = cat.category_group || "Outros";
    if (!acc[group]) acc[group] = [];
    acc[group].push(cat);
    return acc;
  }, {} as Record<string, typeof categories>);

  return {
    categories,
    categoriesByGroup,
    isLoading,
    refetch,
    seedDefaultCategories,
    resetToDefaultCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    hasCategories: categories.length > 0,
  };
}
