import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectionBlock, competencyPeriodOf, issueDayOf } from "../ProjectionBlock";

const installments = [
  {
    key: "rent:2026-09:2026-09-10",
    description: "Aluguel — set/2026",
    competencyPeriod: "2026-09",
    competencyLabel: "set/2026",
    issueDate: "2026-09-15",
    dueDate: "2026-09-10",
    amount: 2000,
    transactionType: "income" as const,
    obligationType: "rent",
    alreadyExists: false,
  },
];

describe("ProjectionBlock", () => {
  it("renderiza 4 campos: competência como date, sem 'Dia de emissão'", () => {
    render(
      <ProjectionBlock
        blockKey="rent"
        title="Aluguel"
        icon={null}
        transactionType="income"
        installments={installments}
        config={{ competency: "2026-09-15", firstDueDate: "2026-09-10", months: 12, amount: 2000 }}
        onConfigChange={vi.fn()}
        enabled
        onEnabledChange={vi.fn()}
        selected={new Set()}
        onToggle={vi.fn()}
        onSelectAll={vi.fn()}
        onClearAll={vi.fn()}
      />
    );
    expect(screen.getByText("Competência inicial (emissão)")).toBeInTheDocument();
    expect(screen.queryByText("Dia de emissão")).not.toBeInTheDocument();
    const input = document.getElementById("competency-rent") as HTMLInputElement;
    expect(input.type).toBe("date");
    expect(input.value).toBe("2026-09-15");
    expect(screen.getByText("1º vencimento")).toBeInTheDocument();
    expect(screen.getByText("Nº de parcelas")).toBeInTheDocument();
    expect(screen.getByText("Valor da parcela")).toBeInTheDocument();
    // coluna Emissão no preview
    expect(screen.getByText("Emissão")).toBeInTheDocument();
    expect(screen.getByText("15/09/2026")).toBeInTheDocument();
  });

  it("deriva período e dia de emissão da data de competência", () => {
    expect(competencyPeriodOf("2026-09-31")).toBe("2026-09");
    expect(issueDayOf("2026-09-31")).toBe(31);
    expect(issueDayOf("2026-09-01")).toBe(1);
    expect(issueDayOf("")).toBe(1);
  });
});
