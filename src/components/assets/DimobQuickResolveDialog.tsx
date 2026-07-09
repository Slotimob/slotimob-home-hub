import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, User, FileText, Home } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type ResolveType = 
  | 'cib' 
  | 'registration' 
  | 'address'
  | 'owner_document' 
  | 'tenant_document' 
  | 'lease';

interface DimobQuickResolveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resolveType: ResolveType | null;
  unitId: string;
  contactId?: string | null;
  contactName?: string | null;
  onSuccess: () => void;
  onCreateLease?: () => void;
  onEditUnit?: () => void;
}

const RESOLVE_CONFIG: Record<ResolveType, {
  title: string;
  description: string;
  icon: typeof User;
  fieldLabel: string;
  fieldPlaceholder: string;
  mask?: (value: string) => string;
}> = {
  cib: {
    title: 'Cadastrar Número CIB',
    description: 'O Código de Identificação do Imóvel (CIB) é obrigatório para a declaração DIMOB.',
    icon: Home,
    fieldLabel: 'Número CIB',
    fieldPlaceholder: 'Ex: 1234567890123456',
  },
  registration: {
    title: 'Cadastrar Matrícula',
    description: 'Informe o número de matrícula do imóvel no cartório de registro.',
    icon: FileText,
    fieldLabel: 'Número da Matrícula',
    fieldPlaceholder: 'Ex: 12345',
  },
  address: {
    title: 'Completar Endereço do Imóvel',
    description: 'O endereço completo (logradouro, bairro, cidade e UF) é obrigatório para DIMOB. Edite o imóvel para preencher os campos.',
    icon: Home,
    fieldLabel: '',
    fieldPlaceholder: '',
  },
  owner_document: {
    title: 'Documento do Proprietário',
    description: 'Informe o CPF ou CNPJ do proprietário para fins fiscais.',
    icon: User,
    fieldLabel: 'CPF/CNPJ',
    fieldPlaceholder: 'Digite o CPF ou CNPJ',
    mask: (value: string) => {
      const digits = value.replace(/\D/g, '');
      if (digits.length <= 11) {
        return digits
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d{1,2})/, '$1-$2')
          .replace(/(-\d{2})\d+?$/, '$1');
      }
      return digits
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
    },
  },
  tenant_document: {
    title: 'Documento do Inquilino',
    description: 'Informe o CPF ou CNPJ do inquilino para fins fiscais.',
    icon: User,
    fieldLabel: 'CPF/CNPJ',
    fieldPlaceholder: 'Digite o CPF ou CNPJ',
    mask: (value: string) => {
      const digits = value.replace(/\D/g, '');
      if (digits.length <= 11) {
        return digits
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d)/, '$1.$2')
          .replace(/(\d{3})(\d{1,2})/, '$1-$2')
          .replace(/(-\d{2})\d+?$/, '$1');
      }
      return digits
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
    },
  },
  lease: {
    title: 'Contrato de Locação',
    description: 'É necessário um contrato de locação ativo para a declaração DIMOB.',
    icon: FileText,
    fieldLabel: '',
    fieldPlaceholder: '',
  },
};

export function DimobQuickResolveDialog({
  open,
  onOpenChange,
  resolveType,
  unitId,
  contactId,
  contactName,
  onSuccess,
  onCreateLease,
  onEditUnit,
}: DimobQuickResolveDialogProps) {
  const [value, setValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!resolveType) return null;

  const config = RESOLVE_CONFIG[resolveType];
  const Icon = config.icon;

  const handleSave = async () => {
    if (!value.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: `Por favor, preencha o campo ${config.fieldLabel}.`,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      if (resolveType === 'cib' || resolveType === 'registration') {
        const updateField = resolveType === 'cib' ? 'cib' : 'registration_number';
        const { error } = await supabase
          .from('units')
          .update({ [updateField]: value.trim() })
          .eq('id', unitId);

        if (error) throw error;

        toast({
          title: 'Dados atualizados',
          description: `${config.fieldLabel} cadastrado com sucesso.`,
        });
      } else if ((resolveType === 'owner_document' || resolveType === 'tenant_document') && contactId) {
        const digits = value.replace(/\D/g, '');
        const docType = digits.length > 11 ? 'CNPJ' : 'CPF';
        
        const { error } = await supabase
          .from('contacts')
          .update({ 
            document_number: digits,
            document_type: docType,
          })
          .eq('id', contactId);

        if (error) throw error;

        toast({
          title: 'Documento atualizado',
          description: `${docType} de ${contactName || 'contato'} cadastrado com sucesso.`,
        });
      }

      setValue('');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar os dados. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = config.mask ? config.mask(e.target.value) : e.target.value;
    setValue(newValue);
  };

  // Special handling for lease - redirect to create lease
  if (resolveType === 'lease') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>{config.title}</DialogTitle>
                <DialogDescription className="mt-1">
                  {config.description}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-col gap-3 mt-4">
            <Button onClick={() => {
              onOpenChange(false);
              onCreateLease?.();
            }}>
              Criar Novo Contrato
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // For document types without contact - redirect to edit unit
  if ((resolveType === 'owner_document' || resolveType === 'tenant_document') && !contactId) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Icon className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <DialogTitle>{config.title}</DialogTitle>
                <DialogDescription className="mt-1">
                  {resolveType === 'owner_document' 
                    ? 'Primeiro vincule um proprietário ao imóvel para poder cadastrar o documento.'
                    : 'Primeiro vincule um inquilino ao imóvel para poder cadastrar o documento.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-col gap-3 mt-4">
            <Button onClick={() => {
              onOpenChange(false);
              onEditUnit?.();
            }}>
              Editar Imóvel
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>{config.title}</DialogTitle>
              <DialogDescription className="mt-1">
                {config.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {contactName && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{contactName}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="resolve-input">{config.fieldLabel}</Label>
            <Input
              id="resolve-input"
              value={value}
              onChange={handleInputChange}
              placeholder={config.fieldPlaceholder}
              autoFocus
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isLoading || !value.trim()}
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
