import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRef } from "react";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      update: () => ({ eq: async () => ({ error: null }) }),
    }),
  },
}));

vi.mock("@/hooks/useLeaseFinancialProjection", () => ({
  useExistingLeaseCompetencies: () => ({ data: new Set<string>(), isLoading: false }),
  useLeaseFinancialProjection: () => ({
    generateProjections: { mutateAsync: vi.fn(async () => ({ count: 0 })) },
    isGenerating: false,
  }),
}));

vi.mock("@/hooks/useCustomObligationTypes", () => ({
  useCustomObligationTypes: () => ({ data: [] }),
}));

import {
  LeaseProjectionEditor,
  type LeaseForProjection,
  type LeaseProjectionEditorHandle,
} from "./LeaseProjectionEditor";

const lease: LeaseForProjection = {
  id: "lease-1",
  unit_id: "unit-1",
  tenant_contact_id: "tenant-1",
  owner_contact_id: "owner-1",
  property_id: null,
  rent_amount: 2000,
  due_day: 10,
  start_date: "2026-01-05",
  end_date: "2026-12-31",
  next_adjustment_date: null,
  is_indefinite_term: false,
  fire_insurance: null,
  iptu_charge: null,
  additional_obligations: null,
  unit: { unit_number: "101" },
  tenant: { name: "Fulano" },
};

const renderEditor = (ref?: React.Ref<LeaseProjectionEditorHandle>) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <LeaseProjectionEditor ref={ref as any} lease={lease} postAdjustment showSummary={false} />
    </QueryClientProvider>
  );

describe("LeaseProjectionEditor", () => {
  it("expõe os campos editáveis da projeção", () => {
    renderEditor();
    // competência inicial como data completa
    const competency = document.querySelector('input[type="date"]') as HTMLInputElement;
    expect(competency).toBeTruthy();
    expect(competency.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // 1º vencimento também é date
    expect(document.querySelectorAll('input[type="date"]').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Aluguel")).toBeInTheDocument();
  });

  it("marca todas as parcelas por padrão e reage ao nº de parcelas", () => {
    const ref = createRef<LeaseProjectionEditorHandle>();
    renderEditor(ref);

    const initial = ref.current!.count;
    expect(initial).toBeGreaterThan(0);

    const numbers = Array.from(
      document.querySelectorAll('input[type="number"]')
    ) as HTMLInputElement[];
    const monthsInput = numbers[0];
    fireEvent.change(monthsInput, { target: { value: "3" } });

    expect(ref.current!.count).toBe(3);
  });
});
