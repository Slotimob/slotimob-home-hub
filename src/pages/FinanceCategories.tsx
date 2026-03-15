import { useState, useEffect } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, ChevronDown, TrendingUp, TrendingDown, Sparkles, RotateCcw, AlertTriangle, Loader2 } from "lucide-react";
import { useFinancialCategories } from "@/hooks/useFinancialCategories";
import { CreateCategoryDialog } from "@/components/finance/CreateCategoryDialog";
import { DRE_TYPE_LABELS } from "@/utils/financialConstants";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function FinanceCategories() {
  const { isOwner, hasPermission } = usePermissions();
  const canCreate = isOwner || hasPermission('finance_categories', 'create');
  const canEdit = isOwner || hasPermission('finance_categories', 'edit');
  const canDelete = isOwner || hasPermission('finance_categories', 'delete');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<any>(null);
  const [deleteCategory, setDeleteCategory] = useState<any>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  
  const { 
    categories, 
    isLoading, 
    hasCategories, 
    seedDefaultCategories,
    resetToDefaultCategories,
    deleteCategory: deleteMutation 
  } = useFinancialCategories(type);

  // Group categories by category_group
  const groupedCategories = categories.reduce((acc, cat) => {
    const group = cat.category_group || "Outros";
    if (!acc[group]) acc[group] = [];
    acc[group].push(cat);
    return acc;
  }, {} as Record<string, typeof categories>);

  // Initialize all groups as open
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    Object.keys(groupedCategories).forEach(group => {
      initial[group] = true;
    });
    setOpenGroups(initial);
  }, [categories]);

  const handleEdit = (category: any) => {
    setEditCategory(category);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deleteCategory) {
      await deleteMutation.mutateAsync(deleteCategory.id);
      setDeleteCategory(null);
    }
  };

  const handleResetCategories = async () => {
    await resetToDefaultCategories.mutateAsync();
    setResetDialogOpen(false);
  };

  const toggleGroup = (group: string) => {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  return (
    <AppLayout>
      <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Categorias Financeiras</h1>
            <p className="text-muted-foreground">
              Gerencie suas categorias de receitas e despesas
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {hasCategories && canDelete && (
              <Button
                variant="outline"
                onClick={() => setResetDialogOpen(true)}
                disabled={resetToDefaultCategories.isPending}
                className="text-destructive border-destructive/50 hover:bg-destructive/10"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restaurar Padrão
              </Button>
            )}
            {!hasCategories && canCreate && (
              <Button
                variant="outline"
                onClick={() => seedDefaultCategories.mutate()}
                disabled={seedDefaultCategories.isPending}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {seedDefaultCategories.isPending ? "Criando..." : "Criar Padrões"}
              </Button>
            )}
            {canCreate && (
            <Button onClick={() => { setEditCategory(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
            )}
          </div>
        </div>

        <Tabs value={type} onValueChange={(v) => setType(v as 'income' | 'expense')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="income" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Receitas
            </TabsTrigger>
            <TabsTrigger value="expense" className="gap-2">
              <TrendingDown className="h-4 w-4" />
              Despesas
            </TabsTrigger>
          </TabsList>

          <TabsContent value={type} className="mt-4 space-y-4">
            {isLoading ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Carregando categorias...
                </CardContent>
              </Card>
            ) : Object.keys(groupedCategories).length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground mb-4">
                    Nenhuma categoria encontrada
                  </p>
                  <Button onClick={() => seedDefaultCategories.mutate()} disabled={seedDefaultCategories.isPending}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Criar Categorias Padrão
                  </Button>
                </CardContent>
              </Card>
            ) : (
              Object.entries(groupedCategories).map(([group, cats]) => (
                <Collapsible 
                  key={group} 
                  open={openGroups[group]} 
                  onOpenChange={() => toggleGroup(group)}
                >
                  <Card>
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="flex flex-row items-center justify-between py-4">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{group}</CardTitle>
                          <Badge variant="secondary">{cats.length}</Badge>
                        </div>
                        <ChevronDown className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform",
                          openGroups[group] && "rotate-180"
                        )} />
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 space-y-2">
                        {cats.map((cat) => (
                          <div 
                            key={cat.id} 
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-4 h-4 rounded-full shrink-0"
                                style={{ backgroundColor: cat.type === 'income' ? '#22c55e' : '#ef4444' }}
                              />
                              <div>
                                <p className="font-medium">{cat.name}</p>
                                {cat.dre_type && (
                                  <p className="text-xs text-muted-foreground">
                                    {DRE_TYPE_LABELS[cat.dre_type] || cat.dre_type}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {cat.is_default ? (
                                <Badge variant="outline" className="text-xs">Padrão</Badge>
                              ) : (
                                <>
                                  {canEdit && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEdit(cat)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  )}
                                  {canDelete && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setDeleteCategory(cat)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))
            )}
          </TabsContent>
        </Tabs>

        <CreateCategoryDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editCategory={editCategory}
          defaultType={type}
        />

        <AlertDialog open={!!deleteCategory} onOpenChange={() => setDeleteCategory(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Categoria</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a categoria "{deleteCategory?.name}"? 
                Lançamentos vinculados a ela ficarão sem categoria.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reset Categories Confirmation Dialog */}
        <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-full bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <AlertDialogTitle>Restaurar Categorias Padrão?</AlertDialogTitle>
              </div>
              <AlertDialogDescription className="space-y-3">
                <p className="font-medium text-destructive">
                  CUIDADO: Esta ação é irreversível!
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Todas as suas categorias atuais serão removidas</li>
                  <li>As categorias padrão do sistema serão restauradas</li>
                  <li>Lançamentos existentes perderão o vínculo com suas categorias atuais</li>
                  <li>Você precisará reclassificar os lançamentos afetados</li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={resetToDefaultCategories.isPending}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleResetCategories}
                disabled={resetToDefaultCategories.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {resetToDefaultCategories.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Restaurando...
                  </>
                ) : (
                  "Confirmar Restauração"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
