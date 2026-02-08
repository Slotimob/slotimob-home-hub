export interface CepData {
  address: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

/**
 * Search address data by CEP using ViaCEP API
 * @param cep - CEP string (with or without formatting)
 * @returns CepData object with address, neighborhood, city, and state
 * @throws Error if CEP is invalid or not found
 */
export async function searchCep(cep: string): Promise<CepData> {
  // Remove non-numeric characters
  const cleanCep = cep.replace(/\D/g, '');

  // Validate length
  if (cleanCep.length !== 8) {
    throw new Error('CEP deve conter 8 dígitos');
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);

    if (!response.ok) {
      throw new Error('Erro ao consultar CEP. Tente novamente.');
    }

    const data: ViaCepResponse = await response.json();

    if (data.erro) {
      throw new Error('CEP não encontrado');
    }

    return {
      address: data.logradouro || '',
      neighborhood: data.bairro || '',
      city: data.localidade || '',
      state: data.uf?.toUpperCase() || '',
    };
  } catch (error: any) {
    if (error.message === 'CEP não encontrado' || error.message === 'CEP deve conter 8 dígitos') {
      throw error;
    }
    throw new Error('Erro de conexão. Verifique sua internet.');
  }
}

/**
 * Format CEP with mask (00000-000)
 */
export function formatCep(cep: string): string {
  const clean = cep.replace(/\D/g, '');
  if (clean.length <= 5) return clean;
  return `${clean.slice(0, 5)}-${clean.slice(5, 8)}`;
}
