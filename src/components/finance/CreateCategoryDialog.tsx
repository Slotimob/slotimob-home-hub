import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useFinancialCategories } from "@/hooks/useFinancialCategories";
import { CATEGORY_GROUPS, DRE_TYPES_INCOME, DRE_TYPES_EXPENSE } from "@/utils/financialConstants";

interface CreateCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (categoryId: string) => void;
  editCategory?: any;
  defaultType?: 'income' | 'expense';
}

// Standard colors: Green for income, Red for expense
const INCOME_COLOR = "#22c55e";
const EXPENSE_COLOR = "#ef4444";

export function CreateCategoryDialog({
  open,
  onOpenChange,
  onSuccess,
  editCategory,
  defaultType = 'expense',
}: CreateCategoryDialogProps) {
  const [type, setType] = useState<'income' | 'expense'>(editCategory?.type || defaultType);
  const [name, setName] = useState(editCategory?.name || "");
  const [group, setGroup] = useState(editCategory?.category_group || "");
  const [dreType, setDreType] = useState(editCategory?.dre_type || "");

  // Auto-assign color based on type
  const color = type === 'income' ? INCOME_COLOR : EXPENSE_COLOR;

  const { createCategory, updateCategory } = useFinancialCategories();

  useEffect(() => {
    if (editCategory) {
      setType(editCategory.type);
      setName(editCategory.name);
      setGroup(editCategory.category_group || "");
      setDreType(editCategory.dre_type || "");
    } else {
      setType(defaultType);
      setName("");
      setGroup("");
      setDreType("");
    }
  }, [editCategory, defaultType, open]);

  const dreTypeOptions = type === 'income' ? DRE_TYPES_INCOME : DRE_TYPES_EXPENSE;
  const groupOptions = CATEGORY_GROUPS[type];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      name,
      type,
      category_group: group,
      dre_type: dreType,
      color,
    };

    if (editCategory) {
      await updateCategory.mutateAsync({ id: editCategory.id, ...data });
    } else {
      const result = await createCategory.mutateAsync(data);
      if (onSuccess && result) {
        onSuccess(result.id);
      }
    }
    
    onOpenChange(false);
  };

  const isLoading = createCategory.isPending || updateCategory.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{editCategory ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
          <DialogDescription>
            {editCategory 
              ? "Atualize os dados da categoria" 
              : "Crie uma nova categoria vinculada à DRE"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Selector */}
          <Tabs value={type} onValueChange={(v) => {
            setType(v as 'income' | 'expense');
            setDreType("");
            setGroup("");
          }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="income" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Receita
              </TabsTrigger>
              <TabsTrigger value="expense" className="gap-2">
                <TrendingDown className="h-4 w-4" />
                Despesa
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Categoria *</Label>
            <Input
              id="name"
              placeholder="Ex: Marketing Digital"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Group */}
          <div className="space-y-2">
            <Label>Grupo *</Label>
            <Select value={group} onValueChange={setGroup} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um grupo" />
              </SelectTrigger>
              <SelectContent>
                {groupOptions.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* DRE Type */}
          <div className="space-y-2">
            <Label>Tipo DRE *</Label>
            <p className="text-xs text-muted-foreground">
              Vinculação contábil para o Demonstrativo do Resultado
            </p>
            <Select value={dreType} onValueChange={setDreType} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo DRE" />
              </SelectTrigger>
              <SelectContent>
                {dreTypeOptions.map((dt) => (
                  <SelectItem key={dt.value} value={dt.value}>
                    <div className="flex flex-col">
                      <span>{dt.label}</span>
                      <span className="text-xs text-muted-foreground">{dt.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Color indicator (automatic based on type) */}
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <div 
              className="w-4 h-4 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-sm text-muted-foreground">
              Cor definida automaticamente: {type === 'income' ? 'Verde (Receita)' : 'Vermelho (Despesa)'}
            </span>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !name || !group || !dreType}>
              {isLoading ? "Salvando..." : editCategory ? "Atualizar" : "Criar Categoria"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
