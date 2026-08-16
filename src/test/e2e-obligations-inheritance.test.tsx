/**
 * Teste ponta-a-ponta (camada de dados + UI) da herança da Matriz de
 * Responsabilidades do contrato para o imóvel.
 *
 * Cobre:
 *  - inheritObligationsConfigFromLease: payload real gravado em units.obligations_config
 *  - ObligationsConfigForm: banner âmbar "Pendente de revisão" + "Salvar Configurações"
 *  - LeaseJourneyTab: passo "Configuração de Obrigações" pendente de revisão
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// --- Dados do contrato de TESTE (espelham as linhas criadas no banco) ---
const OWNER_ID = "11110000-0000-4000-8000-000000000001";
const TENANT_ID = "11110000-0000-4000-8000-000000000002";
const AGENCY_ID = "11110000-0000-4000-8000-000000000003";
const UNIT_ID = "11110000-0000-4000-8000-0000000000A1";
const LEASE_ID = "11110000-0000-4000-8000-0000000000B1";

const leaseSource = {
  leaseId: LEASE_ID,
  unitId: UNIT_ID,
  dueDay: 10,
  tenantContactId: TENANT_ID,
  ownerContactId: OWNER_ID,
  fireInsurance: {
    enabled: true,
    total_amount: 600,
    installments: 12,
    installment_amount: 50,
    first_due_date: "2026-09-15",
    charge_to: "owner" as const,
    responsible_contact_id: OWNER_ID,
    agency_contact_id: null,
  },
  iptuCharge: null,
  additionalObligations: [
    {
      type: "condominium" as const,
      enabled: true,
      installment_amount: 450,
      first_due_date: "2026-09-05",
      charge_to: "agency" as const,
      label: "Condominio ordinario",
      responsible_contact_id: AGENCY_ID,
      agency_contact_id: AGENCY_ID,
    },
  ],
};

// --- Client Supabase fake: registra o UPDATE realmente emitido ---
const captured: { update?: Record<string, unknown> } = {};

vi.mock("@/integrations/supabase/client", () => {
  const unitRow = { obligations_config: {} };
  const client = {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () =>
            table === "units" ? { data: unitRow, error: null } : { data: null, error: null },
          single: async () =>
            table === "units"
              ? {
                  data: {
                    owner_contact_id: OWNER_ID,
                    tenant_contact_id: TENANT_ID,
                    is_occupied: true,
                  },
                  error: null,
                }
              : {
                  data: { id: OWNER_ID, name: "ZZ TESTE Proprietario Agente", avatar_url: null },
                  error: null,
                },
        }),
      }),
      update: (payload: Record<string, unknown>) => ({
        eq: async () => {
          captured.update = payload;
          return { error: null };
        },
      }),
    }),
  };
  return { supabase: client };
});

import { inheritObligationsConfigFromLease } from "@/lib/lease-obligations-inheritance";

describe("herança da Matriz de Responsabilidades", () => {
  it("grava obligations_config com __meta.pending_review = true", async () => {
    const inherited = await inheritObligationsConfigFromLease(leaseSource);

    const written = captured.update?.obligations_config as Record<string, any>;
    // eslint-disable-next-line no-console
    console.log("PAYLOAD_OBLIGATIONS_CONFIG=" + JSON.stringify(written));

    expect(written.__meta.pending_review).toBe(true);
    expect(written.__meta.inherited_from_lease_id).toBe(LEASE_ID);
    expect(written.__meta.reviewed_at).toBeNull();

    // seguro incêndio -> proprietário (contato real)
    expect(written.insurance.responsible).toBe("owner");
    expect(written.insurance.responsible_contact_id).toBe(OWNER_ID);
    expect(written.insurance.amount).toBe(50);

    // condomínio -> imobiliária (contato real)
    expect(written.condominium.responsible).toBe("agency");
    expect(written.condominium.agency_contact_id).toBe(AGENCY_ID);
    expect(written.condominium.responsible_contact_id).toBe(AGENCY_ID);
    expect(written.condominium.amount).toBe(450);

    // aluguel sempre do inquilino
    expect(written.rent.responsible_contact_id).toBe(TENANT_ID);
    expect(Object.keys(inherited).sort()).toEqual(["condominium", "insurance", "rent"]);
  });
});

// ---------------------------------------------------------------------------
// UI: banner "Pendente de revisão" no ObligationsConfigForm (/gestao/alugueis)
// ---------------------------------------------------------------------------

const inheritedConfig = {
  rent: { active: true, due_day: 10, responsible: "tenant", responsible_contact_id: TENANT_ID, control_type: "financial", amount: null },
  insurance: { active: true, due_day: 15, responsible: "owner", responsible_contact_id: OWNER_ID, agency_contact_id: null, control_type: "financial", amount: 50 },
  condominium: { active: true, due_day: 5, responsible: "agency", responsible_contact_id: AGENCY_ID, agency_contact_id: AGENCY_ID, control_type: "financial", amount: 450 },
  __meta: {
    pending_review: true,
    inherited_from_lease_id: LEASE_ID,
    inherited_at: "2026-08-16T16:00:00.000Z",
    reviewed_at: null,
  },
};

const updateSpy = vi.fn(async () => {});

vi.mock("@/hooks/useAssetHealth", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useUnitObligationsConfig: () => ({ data: inheritedConfig, isLoading: false }),
    updateUnitObligationsConfig: (...args: unknown[]) => updateSpy(...(args as [])),
  };
});

vi.mock("@/hooks/useLeases", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useLeaseByUnitId: () => ({ data: { id: LEASE_ID, tenant: { id: TENANT_ID, name: "ZZ TESTE Inquilino Agente" }, owner: { id: OWNER_ID, name: "ZZ TESTE Proprietario Agente" } } }),
  };
});

vi.mock("@/hooks/useCustomObligationTypes", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, useCustomObligationTypes: () => ({ data: [], isLoading: false }) };
});

vi.mock("@/components/ContactSelector", () => ({
  ContactSelector: () => <div data-testid="contact-selector" />,
}));

import { ObligationsConfigForm } from "@/components/assets/ObligationsConfigForm";
import { LeaseJourneyTab } from "@/components/assets/LeaseJourneyTab";

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe("ObligationsConfigForm — estado pendente de revisão", () => {
  beforeEach(() => updateSpy.mockClear());

  it("exibe o banner âmbar e some após Salvar Configurações", async () => {
    render(<ObligationsConfigForm unitId={UNIT_ID} unitName="ZZ TESTE 101" />, { wrapper });

    // (3a) banner presente
    expect(await screen.findByText("Pendente de revisão")).toBeInTheDocument();
    expect(screen.getByText("Herdado do contrato")).toBeInTheDocument();

    // (4) salvar confirma a revisão
    const saveBtn = screen.getByRole("button", { name: /salvar configura/i });
    await userEvent.click(saveBtn);

    await waitFor(() => expect(updateSpy).toHaveBeenCalled());
    const [, payload] = updateSpy.mock.calls[0] as unknown as [string, Record<string, any>];
    // eslint-disable-next-line no-console
    console.log("PAYLOAD_SAVE_META=" + JSON.stringify(payload.__meta));
    expect(payload.__meta.pending_review).toBe(false);
    expect(payload.__meta.reviewed_at).toBeTruthy();

    // banner desaparece
    await waitFor(() =>
      expect(screen.queryByText("Pendente de revisão")).not.toBeInTheDocument()
    );
  });
});

describe("LeaseJourneyTab — passo de obrigações", () => {
  it("(3b) mostra 'pendente de revisão' e ação Revisar", () => {
    render(
      <LeaseJourneyTab
        lease={{
          id: LEASE_ID,
          unit_id: UNIT_ID,
          status: "active",
          metadata: {
            obligations_configured: true,
            obligations_inherited_at: "2026-08-16T16:00:00.000Z",
            obligations_pending_review: true,
          },
        }}
        unitId={UNIT_ID}
        onConfigureObligations={() => {}}
      />,
      { wrapper }
    );

    expect(screen.getByText("Configuração de Obrigações")).toBeInTheDocument();
    expect(screen.getByText(/pendente de revisão/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /revisar/i })).toBeInTheDocument();
  });
});
