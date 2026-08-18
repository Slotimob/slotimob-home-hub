import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { AssetActivitiesPanel } from '@/components/assets/AssetActivitiesPanel';
import { Plus, Wrench } from 'lucide-react';

export default function Manutencoes() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <AppLayout title="Manutenções">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Manutenções
            </h1>
            <p className="text-sm text-muted-foreground">
              Registre e acompanhe manutenções, vistorias, reformas e demais atividades dos imóveis.
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova atividade
          </Button>
        </div>

        <AssetActivitiesPanel
          createDialogOpen={dialogOpen}
          onCreateDialogOpenChange={setDialogOpen}
        />
      </div>
    </AppLayout>
  );
}
