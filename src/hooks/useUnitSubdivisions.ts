import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export type UnitStatus = Database["public"]["Enums"]["unit_status"];

export interface UnitSubdivision {
  id: string;
  unit_id: string;
  broker_id: string;
  label: string;
  area: number | null;
  rent_price: number | null;
  tenant_contact_id: string | null;
  status: UnitStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  contacts?: { name: string } | null;
}

export interface UnitSubdivisionInput {
  label: string;
  area?: number | null;
  rent_price?: number | null;
  tenant_contact_id?: string | null;
  status?: UnitStatus;
  notes?: string | null;
}

const invalidate = (
  queryClient: ReturnType<typeof useQueryClient>,
  unitId: string
) => {
  queryClient.invalidateQueries({ queryKey: ["unit_subdivisions", unitId] });
  queryClient.invalidateQueries({ queryKey: ["unit", unitId] });
  queryClient.invalidateQueries({ queryKey: ["units"] });
};

export function useUnitSubdivisions(unitId: string) {
  return useQuery({
    queryKey: ["unit_subdivisions", unitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unit_subdivisions")
        .select(`*, contacts:tenant_contact_id(name)`)
        .eq("unit_id", unitId)
        .order("created_at", { ascending: true });

      if (error) throw new Error(error.message || "Erro ao carregar frações");
      return (data || []) as unknown as UnitSubdivision[];
    },
    enabled: !!unitId,
  });
}

export function useCreateUnitSubdivision() {
  const queryClient = useQueryClient();
  const { effectiveBrokerId } = useWorkspace();

  return useMutation({
    mutationFn: async ({
      unitId,
      data,
    }: {
      unitId: string;
      data: UnitSubdivisionInput;
    }) => {
      if (!effectiveBrokerId) throw new Error("Usuário não autenticado");

      const { data: created, error } = await supabase
        .from("unit_subdivisions")
        .insert({
          unit_id: unitId,
          broker_id: effectiveBrokerId,
          label: data.label,
          area: data.area ?? null,
          rent_price: data.rent_price ?? null,
          tenant_contact_id: data.tenant_contact_id || null,
          status: data.status || "available",
          notes: data.notes || null,
        })
        .select()
        .single();

      if (error) throw new Error(error.message || "Erro ao criar fração");
      return created;
    },
    onSuccess: (_res, vars) => {
      invalidate(queryClient, vars.unitId);
      toast.success("Fração criada");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateUnitSubdivision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      unitId,
      data,
    }: {
      id: string;
      unitId: string;
      data: UnitSubdivisionInput;
    }) => {
      const { error } = await supabase
        .from("unit_subdivisions")
        .update({
          label: data.label,
          area: data.area ?? null,
          rent_price: data.rent_price ?? null,
          tenant_contact_id: data.tenant_contact_id || null,
          status: data.status || "available",
          notes: data.notes || null,
        })
        .eq("id", id);

      if (error) throw new Error(error.message || "Erro ao atualizar fração");
    },
    onSuccess: (_res, vars) => {
      invalidate(queryClient, vars.unitId);
      toast.success("Fração atualizada");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteUnitSubdivision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string; unitId: string }) => {
      const { error } = await supabase
        .from("unit_subdivisions")
        .delete()
        .eq("id", id);

      if (error) throw new Error(error.message || "Erro ao excluir fração");
    },
    onSuccess: (_res, vars) => {
      invalidate(queryClient, vars.unitId);
      toast.success("Fração excluída");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
