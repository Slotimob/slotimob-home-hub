/**
 * Wrapper com abas internas usado no fluxo de CRIAÇÃO de empreendimento
 * (`NovoEmpreendimento.tsx`) e nos diálogos legados.
 *
 * O conteúdo de cada aba vive em `PropertyFormFields.tsx` e é reaproveitado por
 * `PropertyDetalhe.tsx`, que renderiza os mesmos blocos como abas de nível único.
 */
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { z } from 'zod';
import { Trash2, Info, Sparkles, Image, FileText } from 'lucide-react';
import { AssetDocuments } from '@/components/assets/AssetDocuments';
import { showError } from '@/utils/notifications';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import {
  PropertyInfoFields,
  PropertyAmenitiesFields,
  PropertyGalleryFields,
  buildPropertyPayload,
  normalizePropertyFormData,
  validatePropertyFinancials,
  propertySchema,
  type PropertyFormData,
  type PropertyPayload,
} from '@/components/properties/PropertyFormFields';

export {
  propertySchema,
  buildPropertyPayload,
  normalizePropertyFormData,
  validatePropertyFinancials,
};
export type { PropertyFormData, PropertyPayload };

interface PropertyFormProps {
  /** Initial data for editing, omit for creation */
  initialData?: Partial<PropertyFormData> & { id?: string };
  /** Whether this is an edit form */
  isEditing?: boolean;
  /** Submit handler that receives validated payload */
  onSubmit: (payload: PropertyPayload) => Promise<void>;
  /** Cancel handler */
  onCancel: () => void;
  /** Delete handler (only for edit mode) */
  onDelete?: () => void;
  /** Whether form is currently submitting */
  isSubmitting?: boolean;
  /** Property ID for document uploads (only in edit mode) */
  propertyId?: string;
  /** Callback to refresh property data after gallery changes */
  onRefreshProperty?: () => Promise<void>;
  /** Callback when form data changes (for draft persistence) */
  onFormChange?: (data: PropertyFormData) => void;
  /** When true, all inputs are disabled and submit is hidden (read-only mode) */
  disabled?: boolean;
}

export function PropertyForm({
  initialData,
  isEditing = false,
  onSubmit,
  onCancel,
  onDelete,
  isSubmitting = false,
  propertyId,
  onRefreshProperty,
  onFormChange,
  disabled = false,
}: PropertyFormProps) {
  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();
  const [activeTab, setActiveTab] = useState('info');

  // Internal state for when not managed externally
  const [internalFormData, setInternalFormData] = useState<PropertyFormData>(() =>
    normalizePropertyFormData(initialData)
  );

  // Use initialData directly if onFormChange is provided (managed externally)
  const formData: PropertyFormData =
    onFormChange && initialData ? normalizePropertyFormData(initialData) : internalFormData;

  const setFormData = (data: PropertyFormData) => {
    if (onFormChange) {
      onFormChange(data);
    } else {
      setInternalFormData(data);
    }
  };

  // Update form when initialData changes (for edit mode) - only for internal state
  useEffect(() => {
    if (initialData && !onFormChange) {
      setInternalFormData(normalizePropertyFormData(initialData));
      setActiveTab('info');
    }
  }, [initialData, onFormChange]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePropertyFinancials(formData)) return;

    try {
      const payload = buildPropertyPayload(formData);
      propertySchema.parse(payload);
      await onSubmit(payload);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        showError('Erro de validação', error.errors[0].message);
      } else {
        throw error;
      }
    }
  };

  // Show documents tab only in edit mode
  const showDocumentsTab = isEditing && propertyId;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className={`grid w-full ${showDocumentsTab ? 'grid-cols-4' : 'grid-cols-3'}`}>
        <TabsTrigger value="info" className="text-xs sm:text-sm">
          <Info className="h-4 w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Informações</span>
          <span className="sm:hidden">Info</span>
        </TabsTrigger>
        <TabsTrigger value="amenities" className="text-xs sm:text-sm">
          <Sparkles className="h-4 w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Infraestrutura</span>
          <span className="sm:hidden">Lazer</span>
        </TabsTrigger>
        <TabsTrigger value="gallery" className="text-xs sm:text-sm">
          <Image className="h-4 w-4 mr-1 sm:mr-2" />
          Galeria
        </TabsTrigger>
        {showDocumentsTab && (
          <TabsTrigger value="documents" className="text-xs sm:text-sm">
            <FileText className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Documentos</span>
            <span className="sm:hidden">Docs</span>
          </TabsTrigger>
        )}
      </TabsList>

      <form id="property-form" onSubmit={disabled ? (e) => e.preventDefault() : handleSubmit}>
        <fieldset disabled={disabled} className="space-y-0">
          <TabsContent value="info" className="mt-4">
            <PropertyInfoFields
              formData={formData}
              setFormData={setFormData}
              disabled={disabled}
              isEditing={isEditing}
              propertyId={propertyId}
              onRefreshProperty={onRefreshProperty}
            />
          </TabsContent>

          <TabsContent value="amenities" className="mt-4">
            <PropertyAmenitiesFields
              formData={formData}
              setFormData={setFormData}
              disabled={disabled}
            />
          </TabsContent>

          <TabsContent value="gallery" className="mt-4">
            <PropertyGalleryFields
              formData={formData}
              setFormData={setFormData}
              disabled={disabled}
              isEditing={isEditing}
              propertyId={propertyId}
              onRefreshProperty={onRefreshProperty}
            />
          </TabsContent>

          {showDocumentsTab && (
            <TabsContent value="documents" className="mt-4">
              {user && propertyId && (
                <AssetDocuments assetType="property" assetId={propertyId} userId={effectiveBrokerId} />
              )}
            </TabsContent>
          )}
        </fieldset>
      </form>

      {/* Footer - outside fieldset so delete button is never disabled by fieldset */}
      {activeTab !== 'documents' && (
        <div
          className={`flex flex-col-reverse sm:flex-row ${
            isEditing && onDelete ? 'sm:justify-between' : 'sm:justify-end'
          } gap-3 pt-4 mt-4 border-t`}
        >
          {isEditing && onDelete && (
            <Button type="button" variant="destructive" onClick={onDelete} className="w-full sm:w-auto">
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </Button>
          )}
          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
              {disabled ? 'Fechar' : 'Cancelar'}
            </Button>
            {!disabled && (
              <Button type="submit" form="property-form" disabled={isSubmitting} className="w-full sm:w-auto">
                {isSubmitting
                  ? isEditing
                    ? 'Salvando...'
                    : 'Criando...'
                  : isEditing
                    ? 'Salvar'
                    : 'Criar Empreendimento'}
              </Button>
            )}
          </div>
        </div>
      )}
    </Tabs>
  );
}
