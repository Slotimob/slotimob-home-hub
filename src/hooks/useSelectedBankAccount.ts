import { useState, useEffect } from "react";

const STORAGE_KEY = "finance:cashflow:bankAccount";

export function useSelectedBankAccount() {
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || "all";
    } catch {
      return "all";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, selectedBankAccountId);
    } catch {}
  }, [selectedBankAccountId]);

  return {
    selectedBankAccountId,
    setSelectedBankAccountId,
    isAll: selectedBankAccountId === "all",
  };
}
