import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LinkedResources {
  units: { id: string; unit_number: string; property_name?: string }[];
  leases: { id: string; status: string; unit_number?: string }[];
  deals: { id: string; title?: string; stage: string }[];
  proposals: { id: string; lead_name?: string; status?: string }[];
  transactions: { id: string; description: string }[];
}

export const useContactLinkedResources = (contactId: string | null) => {
  const [resources, setResources] = useState<LinkedResources>({
    units: [], leases: [], deals: [], proposals: [], transactions: [],
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!contactId) {
      setResources({ units: [], leases: [], deals: [], proposals: [], transactions: [] });
      return;
    }
    loadResources(contactId);
  }, [contactId]);

  const loadResources = async (id: string) => {
    setIsLoading(true);
    try {
      const [unitsRes, leasesRes, dealsRes, proposalsRes, txRes] = await Promise.all([
        supabase
          .from('units')
          .select('id, unit_number, properties:property_id(name)')
          .or(`owner_contact_id.eq.${id},tenant_contact_id.eq.${id}`)
          .limit(20),
        supabase
          .from('leases')
          .select('id, status, units:unit_id(unit_number)')
          .or(`tenant_contact_id.eq.${id},owner_contact_id.eq.${id}`)
          .limit(20),
        supabase
          .from('deals')
          .select('id, title, stage')
          .eq('contact_id', id)
          .limit(20),
        supabase
          .from('proposals')
          .select('id, lead_name, status')
          .eq('contact_id', id)
          .limit(20),
        supabase
          .from('financial_transactions')
          .select('id, description')
          .eq('contact_id', id)
          .limit(5),
      ]);

      setResources({
        units: (unitsRes.data || []).map((u: any) => ({
          id: u.id,
          unit_number: u.unit_number,
          property_name: u.properties?.name,
        })),
        leases: (leasesRes.data || []).map((l: any) => ({
          id: l.id,
          status: l.status,
          unit_number: l.units?.unit_number,
        })),
        deals: (dealsRes.data || []).map((d: any) => ({
          id: d.id,
          title: d.title,
          stage: d.stage,
        })),
        proposals: (proposalsRes.data || []).map((p: any) => ({
          id: p.id,
          lead_name: p.lead_name,
          status: p.status,
        })),
        transactions: (txRes.data || []).map((t: any) => ({
          id: t.id,
          description: t.description,
        })),
      });
    } catch (error) {
      console.error('Error loading linked resources:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasAnyLinks = 
    resources.units.length > 0 || 
    resources.leases.length > 0 || 
    resources.deals.length > 0 || 
    resources.proposals.length > 0 || 
    resources.transactions.length > 0;

  const getBlockingMessage = (): string | null => {
    if (!hasAnyLinks) return null;
    const parts: string[] = [];
    if (resources.units.length > 0) parts.push(`${resources.units.length} imóve${resources.units.length > 1 ? 'is' : 'l'}`);
    if (resources.leases.length > 0) parts.push(`${resources.leases.length} contrato${resources.leases.length > 1 ? 's' : ''}`);
    if (resources.deals.length > 0) parts.push(`${resources.deals.length} negociaç${resources.deals.length > 1 ? 'ões' : 'ão'}`);
    if (resources.proposals.length > 0) parts.push(`${resources.proposals.length} proposta${resources.proposals.length > 1 ? 's' : ''}`);
    if (resources.transactions.length > 0) parts.push(`${resources.transactions.length} transaç${resources.transactions.length > 1 ? 'ões' : 'ão'}`);
    return `Este contato está vinculado a: ${parts.join(', ')}. Remova os vínculos antes de excluir.`;
  };

  return { resources, isLoading, hasAnyLinks, getBlockingMessage, reload: () => contactId && loadResources(contactId) };
};
