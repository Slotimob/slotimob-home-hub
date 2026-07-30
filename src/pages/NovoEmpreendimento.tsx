import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2 } from 'lucide-react';

import { AppLayout } from '@/components/AppLayout';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PropertyForm, PropertyPayload } from '@/components/properties/PropertyForm';
import { useCreateProperty } from '@/hooks/useCreateProperty';

export default function NovoEmpreendimento() {
  const navigate = useNavigate();
  const { createProperty, saving } = useCreateProperty();

  const handleSubmit = async (payload: PropertyPayload) => {
    const ok = await createProperty(payload);
    if (ok) navigate('/properties');
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
            onClick={() => navigate('/properties')}
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
              onSubmit={handleSubmit}
              onCancel={() => navigate('/properties')}
              isSubmitting={saving}
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
