import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApprovalRequestsTab } from '@/components/approvals/ApprovalRequestsTab';
import { ApprovalSettingsTab } from '@/components/approvals/ApprovalSettingsTab';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';

export default function AdminApprovals() {
  const { isMember } = useWorkspace();
  const [activeTab, setActiveTab] = useState('requests');

  // Only owner can access
  if (isMember) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AppLayout title="Aprovações">
      <div className="container mx-auto py-6 px-4 max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Aprovações</h1>
          <p className="text-muted-foreground">
            Gerencie solicitações de ações em massa da sua equipe
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="requests">Solicitações</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="requests">
            <ApprovalRequestsTab />
          </TabsContent>

          <TabsContent value="settings">
            <ApprovalSettingsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
