import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AddonId = 'extra-units-50' | 'extra-user';

/**
 * Fluxo nativo Asaas de contratação de add-ons.
 * Usa `create-checkout-session` com product_type: 'addon'.
 * (A edge function Stripe `manage-addons` não é utilizada.)
 */
export const useAddonCheckout = () => {
  const [loadingAddonId, setLoadingAddonId] = useState<AddonId | null>(null);

  const buyAddon = async (addonId: AddonId, quantity: number = 1): Promise<string | null> => {
    setLoadingAddonId(addonId);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          product_type: 'addon',
          addon_id: addonId,
          quantity: Math.max(1, Math.floor(quantity) || 1),
        },
      });

      if (error || !data?.url) {
        toast.error(data?.error || 'Erro ao contratar add-on');
        return null;
      }

      window.open(data.url, '_blank', 'noopener,noreferrer');
      return data.url as string;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao contratar add-on.';
      toast.error(message);
      return null;
    } finally {
      setLoadingAddonId(null);
    }
  };

  return { buyAddon, loadingAddonId };
};
