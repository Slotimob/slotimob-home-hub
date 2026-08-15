import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2 } from 'lucide-react';

import { AppLayout } from '@/components/AppLayout';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PropertyForm, PropertyPayload, PropertyFormData } from '@/components/properties/PropertyForm';
import { useCreateProperty } from '@/hooks/useCreateProperty';
import { useUnsavedChangesGuard } from '@/lib/unsaved-changes-guard';

const DRAFT_KEY = 'novo-empreendimento-draft';

export default function NovoEmpreendimento() {
  const navigate = useNavigate();
  const { createProperty, saving } = useCreateProperty();

  const [formData, setFormData] = useState<Partial<PropertyFormData>>(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Persist draft
  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
    } catch {
      /* ignore */
    }
  }, [formData]);

  const isDirty = !!(formData.name || formData.address || formData.description);
  useUnsavedChangesGuard(isDirty);

  const clearDraft = () => {
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
  };

  const handleSubmit = async (payload: PropertyPayload) => {
    const ok = await createProperty(payload);
    if (ok) {
      clearDraft();
      navigate('/properties');
    }
  };

  const handleCancel = () => {
    clearDraft();
    navigate('/properties');
  };

  return (
    <AppLayout>
      <SEOHead
        title="Novo Empreendimento"
        description="Cadastre um novo empreendimento com ficha técnica completa."
        noIndex
      />

      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Voltar para empreendimentos"
            onClick={handleCancel}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Novo Empreendimento
            </h1>
            <p className="text-sm text-muted-foreground">
              Cadastre um novo empreendimento com ficha técnica completa
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <PropertyForm
              isEditing={false}
              initialData={formData}
              onFormChange={(data) => setFormData(data)}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isSubmitting={saving}
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
