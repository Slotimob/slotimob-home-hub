import { useState, useCallback } from 'react';

export interface CepData {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export interface UseCepSearchReturn {
  cepData: CepData | null;
  isSearching: boolean;
  cepError: string | null;
  searchCep: (cep: string) => Promise<void>;
  clearCepData: () => void;
}

export function useCepSearch(): UseCepSearchReturn {
  const [cepData, setCepData] = useState<CepData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  const searchCep = useCallback(async (rawCep: string) => {
    const digits = rawCep.replace(/\D/g, '');
    if (digits.length !== 8) return;

    setIsSearching(true);
    setCepError(null);

    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (!res.ok) throw new Error('Erro na consulta');
      const data: CepData = await res.json();
      if (data.erro) {
        setCepError('CEP não encontrado');
        setCepData(null);
      } else {
        setCepData(data);
        setCepError(null);
      }
    } catch {
      setCepError('Falha ao buscar CEP. Preencha manualmente.');
      setCepData(null);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clearCepData = useCallback(() => {
    setCepData(null);
    setCepError(null);
  }, []);

  return { cepData, isSearching, cepError, searchCep, clearCepData };
}
