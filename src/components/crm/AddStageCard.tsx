import { useState } from 'react';
import { Plus, Briefcase, Phone, Calendar, FileText, ThumbsUp, ThumbsDown, Target, Users, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface ExistingStage {
  id: string;
  name: string;
  isCustom: boolean;
}

interface AddStageCardProps {
  onAddStage: (name: string, color: string, isWonStage?: boolean, isLostStage?: boolean, insertAfterStageId?: string | null) => void;
  existingStages?: ExistingStage[];
}

const STAGE_PRESETS = [
  { name: 'Qualificação', color: '#8b5cf6', icon: Target },
  { name: 'Primeiro Contato', color: '#06b6d4', icon: Phone },
  { name: 'Reunião Agendada', color: '#f59e0b', icon: Calendar },
  { name: 'Apresentação', color: '#ec4899', icon: Briefcase },
  { name: 'Análise de Crédito', color: '#10b981', icon: FileText },
  { name: 'Negociação', color: '#6366f1', icon: Users },
  { name: 'Follow-up', color: '#84cc16', icon: Star },
  { name: 'Documentação', color: '#f97316', icon: FileText },
  { name: 'Ganho', color: '#22c55e', icon: ThumbsUp, isWonStage: true },
  { name: 'Perdido', color: '#ef4444', icon: ThumbsDown, isLostStage: true },
];

const COLOR_OPTIONS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#f59e0b', '#84cc16', '#22c55e', '#10b981', '#06b6d4',
];

export const AddStageCard = ({ onAddStage, existingStages = [] }: AddStageCardProps) => {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [stageName, setStageName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [isWonStage, setIsWonStage] = useState(false);
  const [isLostStage, setIsLostStage] = useState(false);
  const [insertAfterStageId, setInsertAfterStageId] = useState<string>('end');

  const resetForm = () => {
    setStageName('');
    setSelectedColor(COLOR_OPTIONS[0]);
    setIsWonStage(false);
    setIsLostStage(false);
    setInsertAfterStageId('end');
  };

  const handleAddCustomStage = () => {
    if (!stageName.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Digite um nome para o estágio.',
        variant: 'destructive',
      });
      return;
    }
    const position = insertAfterStageId === 'end' ? null : insertAfterStageId;
    onAddStage(stageName, selectedColor, isWonStage, isLostStage, position);
    resetForm();
    setIsDialogOpen(false);
  };

  const handlePresetClick = (preset: typeof STAGE_PRESETS[0]) => {
    const position = insertAfterStageId === 'end' ? null : insertAfterStageId;
    onAddStage(preset.name, preset.color, preset.isWonStage, preset.isLostStage, position);
    resetForm();
    setIsDialogOpen(false);
  };

  return (
    <>
      <div className="flex-shrink-0 w-80 mr-12 md:mr-0">
        <Card 
          className="h-full border-dashed border-2 hover:border-primary/50 hover:bg-accent/50 transition-colors cursor-pointer min-h-[200px] flex items-center justify-center touch-manipulation active:scale-[0.98]"
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setIsDialogOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsDialogOpen(true);
            }
          }}
        >
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <p className="font-medium text-sm">Adicionar Estágio</p>
            <p className="text-xs text-muted-foreground mt-1">
              Personalize seu pipeline
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen} modal>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Estágio</DialogTitle>
            <DialogDescription>
              Escolha um preset ou crie um estágio personalizado para seu pipeline.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Position Selector */}
            {existingStages.length > 0 && (
              <div>
                <Label htmlFor="insertPosition">Inserir após</Label>
                <Select value={insertAfterStageId} onValueChange={setInsertAfterStageId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione a posição" />
                  </SelectTrigger>
                  <SelectContent>
                    {existingStages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name} {stage.isCustom && '(personalizado)'}
                      </SelectItem>
                    ))}
                    <SelectItem value="end">Final (antes de Perdido/Ganho)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Presets */}
            <div>
              <Label className="text-sm font-medium">Presets</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {STAGE_PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  return (
                    <Button
                      key={preset.name}
                      variant="outline"
                      className="justify-start gap-2 h-auto py-2"
                      onClick={() => handlePresetClick(preset)}
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: preset.color }}
                      />
                      <Icon className="h-4 w-4" />
                      <span className="text-sm">{preset.name}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  ou personalize
                </span>
              </div>
            </div>

            {/* Custom Stage Form */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="stageName">Nome do Estágio</Label>
                <Input
                  id="stageName"
                  value={stageName}
                  onChange={(e) => setStageName(e.target.value)}
                  placeholder="Ex: Análise de Documentos"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Cor</Label>
                <div className="flex gap-2 mt-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        selectedColor === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setSelectedColor(color)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isWonStage}
                    onChange={(e) => {
                      setIsWonStage(e.target.checked);
                      if (e.target.checked) setIsLostStage(false);
                    }}
                    className="rounded"
                  />
                  <span className="text-sm">Estágio de Ganho</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isLostStage}
                    onChange={(e) => {
                      setIsLostStage(e.target.checked);
                      if (e.target.checked) setIsWonStage(false);
                    }}
                    className="rounded"
                  />
                  <span className="text-sm">Estágio de Perda</span>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddCustomStage} disabled={!stageName.trim()}>
              Criar Estágio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
