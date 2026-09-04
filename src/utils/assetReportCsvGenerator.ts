/**
 * CSV generator for comprehensive asset report.
 * Downloads a zip with one CSV per "tab".
 */
import type { AssetReportData } from '@/lib/asset-report-data';
import { ASSET_EXPENSE_CATEGORIES } from '@/lib/asset-expense-categories';
import { formatDateOnly } from "@/lib/date-only";

function getCategoryLabel(cat: string | null): string {
  if (!cat) return 'Outros';
  return (ASSET_EXPENSE_CATEGORIES as any)[cat]?.label ?? 'Outros';
}

function toCsv(rows: string[][]): string {
  return rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function generateAssetReportCsv(report: AssetReportData) {
  // Build a single summary CSV for simplicity
  const rows: string[][] = [
    ['Relatório Completo do Imóvel'],
    [`Período: ${report.period.from} a ${report.period.to}`],
    [`Gerado em: ${new Date(report.generated_at).toLocaleString('pt-BR')}`],
    [],
    ['SUMÁRIO CONSOLIDADO'],
    ['Total de imóveis', String(report.summary.total_assets)],
    ['Total investido', String(report.summary.total_invested)],
    ['Valor de mercado total', String(report.summary.total_market_value)],
    ['Valorização absoluta', String(report.summary.total_appreciation_abs ?? '—')],
    ['Valorização %', report.summary.total_appreciation_pct != null ? `${report.summary.total_appreciation_pct.toFixed(2)}%` : '—'],
    ['Receitas no período', String(report.summary.period_income)],
    ['Despesas no período', String(report.summary.period_expenses)],
    ['Resultado líquido', String(report.summary.period_net)],
    ['ROI no período', report.summary.period_roi_pct != null ? `${report.summary.period_roi_pct.toFixed(2)}%` : '—'],
    ['Yield mensal médio', report.summary.monthly_yield_avg != null ? `${report.summary.monthly_yield_avg.toFixed(2)}%` : '—'],
    ['Cap Rate médio', report.summary.cap_rate_avg != null ? `${report.summary.cap_rate_avg.toFixed(2)}%` : '—'],
    [],
    ['DETALHAMENTO POR IMÓVEL'],
    ['Nome', 'Tipo', 'Endereço', 'Valor Aquisição', 'Custos', 'Total Investido', 'Valor Mercado', 'Valorização %', 'Receitas', 'Despesas', 'ROI %', 'Yield %', 'Cap Rate %', 'Atividades', 'Manutenções', 'Custo Est. Manutenções'],
  ];

  for (const a of report.assets) {
    rows.push([
      a.name,
      a.type === 'property' ? 'Imóvel' : 'Unidade',
      a.address,
      String(a.acquisition?.value ?? ''),
      String(a.acquisition?.costs ?? ''),
      String(a.acquisition?.total_invested ?? ''),
      String(a.market?.current_value ?? ''),
      a.market?.appreciation_pct != null ? `${a.market.appreciation_pct.toFixed(2)}%` : '',
      String(a.period?.income_total ?? 0),
      String(a.period?.expenses_total ?? 0),
      a.period?.roi_pct != null ? `${a.period.roi_pct.toFixed(2)}%` : '',
      a.period?.monthly_yield != null ? `${a.period.monthly_yield.toFixed(2)}%` : '',
      a.period?.cap_rate != null ? `${a.period.cap_rate.toFixed(2)}%` : '',
      String(a.period?.activities_count ?? 0),
      String(a.period?.maintenance_count ?? 0),
      String(a.period?.maintenance_estimated_cost ?? 0),
    ]);
  }

  // Manutenções e Atividades
  const maintenanceRows = report.assets.flatMap(a => (a.period?.maintenance_items || []).map(m => [
    a.name,
    formatDateOnly(m.date),
    m.type_label,
    m.title,
    m.description ?? '',
    m.responsible ?? '',
    m.estimated_cost != null ? String(m.estimated_cost) : '',
    m.has_transaction ? 'Sim' : 'Não',
    String(m.attachments_count),
    m.is_completed ? 'Concluída' : 'Pendente',
  ]));

  rows.push([]);
  rows.push(['MANUTENÇÕES E ATIVIDADES']);
  rows.push(['Imóvel', 'Data', 'Tipo', 'Atividade', 'Descrição', 'Responsável', 'Custo Estimado', 'Lançamento Financeiro', 'Anexos', 'Status']);
  if (maintenanceRows.length === 0) {
    rows.push(['Nenhuma atividade no período']);
  } else {
    rows.push(...maintenanceRows);
  }

  downloadCsv(toCsv(rows), `relatorio-imovel-${report.period.from}-${report.period.to}.csv`);
}
