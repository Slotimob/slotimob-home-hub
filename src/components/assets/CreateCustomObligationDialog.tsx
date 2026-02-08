import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useCreateCustomObligationType } from "@/hooks/useCustomObligationTypes";
import { Loader2, Plus } from "lucide-react";

interface CreateCustomObligationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateCustomObligationDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateCustomObligationDialogProps) {
  const { toast } = useToast();
  const createMutation = useCreateCustomObligationType();
  
  const [name, setName] = useState("");
  const [defaultDueDay, setDefaultDueDay] = useState(10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite um nome para o tipo de obrigação.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        default_due_day: defaultDueDay,
      });

      toast({
        title: "Tipo criado!",
        description: `"${name}" foi adicionado às suas obrigações personalizadas.`,
      });

      setName("");
      setDefaultDueDay(10);
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      if (error.message?.includes("duplicate")) {
        toast({
          title: "Nome duplicado",
          description: "Você já possui uma obrigação com este nome.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao criar",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Novo Tipo de Obrigação
            </DialogTitle>
            <DialogDescription>
              Crie um tipo personalizado de obrigação para monitorar nos seus ativos.
              Este tipo ficará disponível apenas para você.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Obrigação *</Label>
              <Input
                id="name"
                placeholder="Ex: Seguro Incêndio, Taxa de Lixo..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDay">Dia de Vencimento Padrão</Label>
              <Input
                id="dueDay"
                type="number"
                min={1}
                max={31}
                value={defaultDueDay}
                onChange={(e) => setDefaultDueDay(parseInt(e.target.value) || 10)}
              />
              <p className="text-xs text-muted-foreground">
                Este será o dia padrão ao ativar esta obrigação em um ativo.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Tipo"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
