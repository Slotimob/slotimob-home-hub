import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type Lead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  cpf_cnpj: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
};

export type Property = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  commission_rate: number | null;
};

export type Unit = {
  id: string;
  unit_number: string;
  property_id: string;
  property_name?: string;
  price: number | null;
  area: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_spots: number | null;
  condo_fee: number | null;
  iptu: number | null;
  registration_number: string | null;
};

export type Owner = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  cpf_cnpj: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
};

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
};

export const useAutoFillData = () => {
  const { user } = useAuth();

  const { data: leads = [] } = useQuery({
    queryKey: ['autofill-leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, email, phone, cpf_cnpj, address, city, state')
        .order('name');
      if (error) throw error;
      return data as Lead[];
    },
    enabled: !!user,
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['autofill-properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name, address, city, state, postal_code, commission_rate')
        .order('name');
      if (error) throw error;
      return data as Property[];
    },
    enabled: !!user,
  });

  const { data: units = [] } = useQuery({
    queryKey: ['autofill-units'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('units')
        .select(`
          id, unit_number, property_id, price, area, bedrooms, bathrooms, 
          parking_spots, condo_fee, iptu, registration_number,
          properties(name)
        `)
        .order('unit_number');
      if (error) throw error;
      return (data || []).map((u: any) => ({
        ...u,
        property_name: u.properties?.name,
      })) as Unit[];
    },
    enabled: !!user,
  });

  const { data: owners = [] } = useQuery({
    queryKey: ['autofill-owners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('owners')
        .select('id, name, email, phone, cpf_cnpj, address, city, state')
        .order('name');
      if (error) throw error;
      return data as Owner[];
    },
    enabled: !!user,
  });

  const { data: profile } = useQuery({
    queryKey: ['autofill-profile'],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user,
  });

  // Map CRM data to document fields
  const mapLeadToFields = (lead: Lead): Record<string, string> => ({
    cliente_nome: lead.name,
    cliente_email: lead.email || '',
    cliente_telefone: lead.phone || '',
    cliente_cpf: lead.cpf_cnpj || '',
    cliente_endereco: lead.address || '',
    cliente_cidade: lead.city || '',
    cliente_estado: lead.state || '',
    locatario_nome: lead.name,
    locatario_cpf: lead.cpf_cnpj || '',
    locatario_endereco: lead.address || '',
    locatario_telefone: lead.phone || '',
    comprador_nome: lead.name,
    comprador_cpf: lead.cpf_cnpj || '',
    fiador_nome: lead.name,
  });

  const mapPropertyToFields = (property: Property): Record<string, string> => ({
    imovel_endereco: property.address || '',
    imovel_cidade: property.city || '',
    imovel_estado: property.state || '',
    imovel_cep: property.postal_code || '',
    empreendimento_nome: property.name,
    taxa_comissao: property.commission_rate?.toString() || '',
  });

  const mapUnitToFields = (unit: Unit): Record<string, string> => ({
    unidade_numero: unit.unit_number,
    imovel_valor: unit.price?.toString() || '',
    imovel_area: unit.area?.toString() || '',
    imovel_quartos: unit.bedrooms?.toString() || '',
    imovel_banheiros: unit.bathrooms?.toString() || '',
    imovel_vagas: unit.parking_spots?.toString() || '',
    valor_condominio: unit.condo_fee?.toString() || '',
    valor_iptu: unit.iptu?.toString() || '',
    matricula_numero: unit.registration_number || '',
    valor_aluguel: unit.price?.toString() || '',
  });

  const mapOwnerToFields = (owner: Owner): Record<string, string> => ({
    proprietario_nome: owner.name,
    proprietario_cpf: owner.cpf_cnpj || '',
    proprietario_endereco: owner.address || '',
    proprietario_cidade: owner.city || '',
    proprietario_estado: owner.state || '',
    proprietario_telefone: owner.phone || '',
    proprietario_email: owner.email || '',
    locador_nome: owner.name,
    locador_cpf: owner.cpf_cnpj || '',
    locador_endereco: owner.address || '',
    vendedor_nome: owner.name,
  });

  const mapProfileToFields = (profile: Profile): Record<string, string> => ({
    corretor_nome: profile.full_name,
    corretor_email: profile.email,
    corretor_telefone: profile.phone || '',
  });

  return {
    leads,
    properties,
    units,
    owners,
    profile,
    mapLeadToFields,
    mapPropertyToFields,
    mapUnitToFields,
    mapOwnerToFields,
    mapProfileToFields,
  };
};
