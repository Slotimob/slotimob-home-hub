import { useState, useCallback } from 'react';

export interface CepData {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export interface CepLookupResult {
  address: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface UseCepSearchOptions {
  includeNeighborhoodInAddress?: boolean;
}

export interface UseCepSearchReturn {
  // New API
  cepData: CepData | null;
  isSearching: boolean;
  cepError: string | null;
  searchCep: (cep: string) => Promise<void>;
  clearCepData: () => void;
  // Legacy API (used across the app)
  isLoadingCep: boolean;
  formatCep: (value: string) => string;
  searchCepData: (cep: string) => Promise<CepLookupResult | null>;
  handleCepBlur: (
    cep: string,
    onResult: (result: CepLookupResult) => void
  ) => Promise<void>;
}

export function useCepSearch(options: UseCepSearchOptions = {}): UseCepSearchReturn {
  const { includeNeighborhoodInAddress = false } = options;
  const [cepData, setCepData] = useState<CepData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  const formatCep = useCallback((value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    return digits.replace(/(\d{5})(\d{0,3})/, '$1-$2').replace(/-$/, '');
  }, []);

  const fetchCep = useCallback(async (rawCep: string): Promise<CepData | null> => {
    const digits = rawCep.replace(/\D/g, '');
    if (digits.length !== 8) return null;

    setIsSearching(true);
    setCepError(null);

    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (!res.ok) throw new Error('Erro na consulta');
      const data: CepData = await res.json();
      if (data.erro) {
        setCepError('CEP não encontrado');
        setCepData(null);
        return null;
      }
      setCepData(data);
      setCepError(null);
      return data;
    } catch {
      setCepError('Falha ao buscar CEP. Preencha manualmente.');
      setCepData(null);
      return null;
    } finally {
      setIsSearching(false);
    }
  }, []);

  const searchCep = useCallback(
    async (rawCep: string) => {
      await fetchCep(rawCep);
    },
    [fetchCep]
  );

  const toLookupResult = useCallback(
    (data: CepData): CepLookupResult => {
      const address = includeNeighborhoodInAddress && data.bairro
        ? `${data.logradouro || ''}${data.logradouro && data.bairro ? ', ' : ''}${data.bairro}`
        : data.logradouro || '';
      return {
        address,
        neighborhood: data.bairro || '',
        city: data.localidade || '',
        state: data.uf || '',
      };
    },
    [includeNeighborhoodInAddress]
  );

  const searchCepData = useCallback(
    async (cep: string): Promise<CepLookupResult | null> => {
      const data = await fetchCep(cep);
      return data ? toLookupResult(data) : null;
    },
    [fetchCep, toLookupResult]
  );

  const handleCepBlur = useCallback(
    async (cep: string, onResult: (result: CepLookupResult) => void) => {
      const result = await searchCepData(cep);
      if (result) onResult(result);
    },
    [searchCepData]
  );

  const clearCepData = useCallback(() => {
    setCepData(null);
    setCepError(null);
  }, []);

  return {
    cepData,
    isSearching,
    cepError,
    searchCep,
    clearCepData,
    isLoadingCep: isSearching,
    formatCep,
    searchCepData,
    handleCepBlur,
  };
}
