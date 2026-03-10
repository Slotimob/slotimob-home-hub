import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import type { ObligationType } from "./useAssetHealth";

export interface CustomObligationType {
  id: string;
  broker_id: string;
  name: string;
  icon: string;
  default_due_day: number;
  created_at: string;
}

// System default obligation types
export const SYSTEM_OBLIGATION_TYPES: {
  type: ObligationType;
  label: string;
  icon: string;
  defaultDueDay: number;
}[] = [
  { type: "rent", label: "Aluguel", icon: "Home", defaultDueDay: 5 },
  { type: "condominium", label: "Condomínio", icon: "Building", defaultDueDay: 10 },
  { type: "iptu", label: "IPTU", icon: "Receipt", defaultDueDay: 15 },
  { type: "energy", label: "Energia", icon: "Zap", defaultDueDay: 20 },
  { type: "water", label: "Água", icon: "Droplets", defaultDueDay: 20 },
  { type: "gas", label: "Gás", icon: "Flame", defaultDueDay: 20 },
  { type: "insurance", label: "Seguro", icon: "Shield", defaultDueDay: 1 },
];

export function useCustomObligationTypes() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["custom-obligation-types", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("custom_obligation_types")
        .select("*")
        .eq("broker_id", user.id)
        .order("name");

      if (error) throw error;
      return data as CustomObligationType[];
    },
    enabled: !!user,
  });
}

export function useCreateCustomObligationType() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; icon?: string; default_due_day?: number }) => {
      if (!user) throw new Error("User not authenticated");

      const { data: result, error } = await supabase
        .from("custom_obligation_types")
        .insert({
          broker_id: user.id,
          name: data.name,
          icon: data.icon || "Circle",
          default_due_day: data.default_due_day || 10,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-obligation-types"] });
    },
  });
}

export function useDeleteCustomObligationType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("custom_obligation_types")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-obligation-types"] });
    },
  });
}

// Combined list of system + custom types for display
export function useAllObligationTypes() {
  const { data: customTypes, isLoading } = useCustomObligationTypes();

  const allTypes = [
    ...SYSTEM_OBLIGATION_TYPES.map((t) => ({
      type: t.type,
      label: t.label,
      icon: t.icon,
      defaultDueDay: t.defaultDueDay,
      isSystem: true,
      id: t.type,
    })),
    ...(customTypes || []).map((t) => ({
      type: `custom_${t.id}` as ObligationType,
      label: t.name,
      icon: t.icon,
      defaultDueDay: t.default_due_day,
      isSystem: false,
      id: t.id,
    })),
  ];

  return { allTypes, isLoading };
}
