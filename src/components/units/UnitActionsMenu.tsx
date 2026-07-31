import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Eye, Share2, Copy, Trash2, MoreVertical } from 'lucide-react';

interface UnitActionsMenuProps {
  /** Label used in the delete confirmation text, e.g. the unit_number */
  unitLabel: string;
  onView: () => void;
  onShare?: () => void;
  /** Defaults to "Compartilhar" — pass "Proposta" where that's the existing wording */
  shareLabel?: string;
  onDuplicate?: () => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  /** Extra classes for the trigger button, e.g. to bump touch target size on mobile cards */
  triggerClassName?: string;
}

export function UnitActionsMenu({
  unitLabel,
  onView,
  onShare,
  shareLabel = 'Compartilhar',
  onDuplicate,
  onDelete,
  triggerClassName,
}: UnitActionsMenuProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleDuplicate = async (e: Event) => {
    e.stopPropagation();
    if (!onDuplicate) return;
    setBusy(true);
    try {
      await onDuplicate();
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!onDelete) return;
    setBusy(true);
    try {
      await onDelete();
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={triggerClassName ?? 'h-8 w-8'}
            onClick={(e) => e.stopPropagation()}
            disabled={busy}
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Mais ações</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem
            onSelect={(e) => {
              e.stopPropagation();
              onView();
            }}
          >
            <Eye className="mr-2 h-4 w-4" />
            Ver detalhes
          </DropdownMenuItem>
          {onShare && (
            <DropdownMenuItem
              onSelect={(e) => {
                e.stopPropagation();
                onShare();
              }}
            >
              <Share2 className="mr-2 h-4 w-4" />
              {shareLabel}
            </DropdownMenuItem>
          )}
          {onDuplicate && (
            <DropdownMenuItem onSelect={handleDuplicate}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicar
            </DropdownMenuItem>
          )}
          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.stopPropagation();
                  setConfirmOpen(true);
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {onDelete && (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir imóvel</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir "{unitLabel}"? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={busy}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {busy ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
