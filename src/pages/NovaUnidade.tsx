import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Building2 } from 'lucide-react';

import { AppLayout } from '@/components/AppLayout';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { UnitFormFields, UnitFormData, getInitialFormData } from '@/components/units/UnitFormFields';
import { useCreateUnit } from '@/hooks/useCreateUnit';

interface NovaUnidadeProps {
  /** If true, creates a standalone real estate (no property required) */
  standalone?: boolean;
}

export default function NovaUnidade({ standalone = false }: NovaUnidadeProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const propertyId = searchParams.get('propertyId') || undefined;

  const { createUnit, saving } = useCreateUnit(standalone);
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([]);
  const draftKey = standalone ? 'novo-imovel-avulso-draft' : 'nova-unidade-draft';
  const [formData, setFormData] = useState<UnitFormData>(() => {
    const initial = getInitialFormData();
    if (propertyId) initial.property_id = propertyId;
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft?.propertyId === (propertyId || null) && draft?.formData) {
          return { ...initial, ...draft.formData };
        }
      }
    } catch {
      /* ignore */
    }
    return initial;
  });

  const backTo = standalone ? '/real-estate' : '/units';
  const showPropertySelector = !standalone && !propertyId;

  // Persist draft against reloads
  useEffect(() => {
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({ propertyId: propertyId || null, formData })
      );
    } catch {
      /* ignore */
    }
  }, [draftKey, propertyId, formData]);

  const clearDraft = () => {
    try {
      sessionStorage.removeItem(draftKey);
    } catch {
      /* ignore */
    }
  };

  const initialSnapshot = JSON.stringify(getInitialFormData());
  useUnsavedChangesGuard(JSON.stringify({ ...formData, property_id: getInitialFormData().property_id }) !== initialSnapshot);

  useEffect(() => {
    if (user && showPropertySelector) {
      supabase.from('properties').select('id, name').order('name').then(({ data }) => setProperties(data || []));
    }
  }, [user, showPropertySelector]);

  useEffect(() => {
    if (propertyId) {
      setFormData(prev => ({ ...prev, property_id: propertyId }));
    }
  }, [propertyId]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectivePropertyId = standalone ? null : (propertyId || formData.property_id || null);
    const created = await createUnit(formData, effectivePropertyId);
    if (!created) return;

    if (created.intent_type !== 'sale' && created.tenant_contact_id) {
      navigate('/gestao/contratos/novo?unitId=' + created.id);
    } else {
      navigate(backTo);
    }
  };

  const title = standalone ? 'Novo Imóvel Avulso' : 'Nova Unidade';
  const subtitle = standalone
    ? 'Cadastre um imóvel que não pertence a um empreendimento'
    : 'Cadastre uma nova unidade para o empreendimento';

  return (
    <AppLayout>
      <SEOHead title={title} description={subtitle} noIndex />

      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Voltar"
            onClick={() => navigate(backTo)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {title}
            </h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <UnitFormFields
                formData={formData}
                setFormData={setFormData}
                properties={properties}
                showImageUpload={true}
                showPropertySelector={showPropertySelector}
                propertyRequired={!standalone && !propertyId}
                isStandalone={standalone}
                onPropertiesChange={setProperties}
              />

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate(backTo)} className="w-full sm:w-auto">
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                  {saving ? 'Criando...' : (standalone ? 'Criar Imóvel' : 'Criar Unidade')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
