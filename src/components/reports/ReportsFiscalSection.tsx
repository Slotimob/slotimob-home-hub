import { DimobReportTab } from './DimobReportTab';

interface ReportsFiscalSectionProps {
  dateRange: { from: Date; to: Date };
  userName?: string;
  selectedUnitId: string | null;
}

// Relatório oficial da aba DIMOB (regime de caixa, mês a mês). Props mantidas por compatibilidade.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const ReportsFiscalSection = (_props: ReportsFiscalSectionProps) => {
  return (
    <div className="space-y-4">
      <DimobReportTab />
    </div>
  );
};
