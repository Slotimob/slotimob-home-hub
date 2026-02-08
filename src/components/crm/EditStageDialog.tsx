import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface EditStageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: {
    id: string;
    name: string;
    color: string;
    is_won_stage?: boolean;
    is_lost_stage?: boolean;
  } | null;
  onSave: (id: string, name: string, color: string, isWonStage: boolean, isLostStage: boolean) => void;
}

const COLOR_OPTIONS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#f59e0b', '#84cc16', '#22c55e', '#10b981', '#06b6d4',
];

export const EditStageDialog = ({ open, onOpenChange, stage, onSave }: EditStageDialogProps) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [isWonStage, setIsWonStage] = useState(false);
  const [isLostStage, setIsLostStage] = useState(false);

  useEffect(() => {
    if (stage) {
      setName(stage.name);
      setColor(stage.color);
      setIsWonStage(stage.is_won_stage || false);
      setIsLostStage(stage.is_lost_stage || false);
    }
  }, [stage]);

  const handleSave = () => {
    if (!stage || !name.trim()) return;
    onSave(stage.id, name.trim(), color, isWonStage, isLostStage);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Editar Estágio</DialogTitle>
          <DialogDescription>
            Altere o nome e a cor do estágio.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="editStageName">Nome do Estágio</Label>
            <Input
              id="editStageName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do estágio"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Cor</Label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`w-8 h-8 rounded-full transition-transform ${
                    color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-4 pt-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="isWonStage"
                checked={isWonStage}
                onCheckedChange={(checked) => {
                  setIsWonStage(!!checked);
                  if (checked) setIsLostStage(false);
                }}
              />
              <Label htmlFor="isWonStage" className="text-sm cursor-pointer">
                Estágio de Ganho
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="isLostStage"
                checked={isLostStage}
                onCheckedChange={(checked) => {
                  setIsLostStage(!!checked);
                  if (checked) setIsWonStage(false);
                }}
              />
              <Label htmlFor="isLostStage" className="text-sm cursor-pointer">
                Estágio de Perda
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};