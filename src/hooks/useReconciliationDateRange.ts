import { useState, useEffect, useCallback } from "react";
import { subDays, startOfDay, startOfMonth, endOfDay, parseISO } from "date-fns";

const STORAGE_KEY = "finance:reconciliation:dateRange";

interface DateRange {
  from: Date;
  to: Date;
}

export type ReconciliationPreset = "last30" | "thisMonth" | "custom";

interface StoredRange {
  preset: ReconciliationPreset;
  from?: string;
  to?: string;
}

/** Recalcula o período do preset a partir de "agora". */
export function rangeForPreset(preset: ReconciliationPreset, now = new Date()): DateRange {
  if (preset === "thisMonth") return { from: startOfMonth(now), to: endOfDay(now) };
  return { from: startOfDay(subDays(now, 30)), to: endOfDay(now) };
}

/** Lê o valor salvo; formato antigo (datas soltas) migra para "last30". */
export function readStoredRange(raw: string | null, now = new Date()): { preset: ReconciliationPreset; range: DateRange } {
  try {
    const parsed = raw ? (JSON.parse(raw) as Partial<StoredRange>) : null;
    if (parsed?.preset === "custom" && parsed.from && parsed.to) {
      return { preset: "custom", range: { from: new Date(parsed.from), to: new Date(parsed.to) } };
    }
    if (parsed?.preset === "thisMonth") return { preset: "thisMonth", range: rangeForPreset("thisMonth", now) };
  } catch {
    /* valor inválido → padrão */
  }
  return { preset: "last30", range: rangeForPreset("last30", now) };
}

export function useReconciliationDateRange() {
  const [state, setState] = useState(() => readStoredRange(localStorage.getItem(STORAGE_KEY)));

  useEffect(() => {
    try {
      const value: StoredRange =
        state.preset === "custom"
          ? { preset: "custom", from: state.range.from.toISOString(), to: state.range.to.toISOString() }
          : { preset: state.preset };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }, [state]);

  /** Escolha manual do usuário = período personalizado. */
  const setDateRange = useCallback((range: DateRange) => setState({ preset: "custom", range }), []);
  const setPreset = useCallback(
    (preset: Exclude<ReconciliationPreset, "custom">) => setState({ preset, range: rangeForPreset(preset) }),
    [],
  );
  const resetToDefault = useCallback(() => setPreset("last30"), [setPreset]);

  /** Amplia o período para cobrir [min, max] ("yyyy-MM-dd"), ex.: após importar um extrato. */
  const expandToCover = useCallback((min: string, max: string) => {
    setState((prev) => {
      const lo = startOfDay(parseISO(min));
      const hi = endOfDay(parseISO(max));
      if (lo >= prev.range.from && hi <= prev.range.to) return prev;
      return {
        preset: "custom",
        range: { from: lo < prev.range.from ? lo : prev.range.from, to: hi > prev.range.to ? hi : prev.range.to },
      };
    });
  }, []);

  return { dateRange: state.range, preset: state.preset, setDateRange, setPreset, resetToDefault, expandToCover };
}
