/**
 * Excel generator for comprehensive asset report (6 tabs).
 */
import type { AssetReportData } from '@/lib/asset-report-data';
import { ASSET_EXPENSE_CATEGORIES } from '@/lib/asset-expense-categories';

function getCategoryLabel(cat: string | null): string {
  if (!cat) return 'Outros';
  return (ASSET_EXPENSE_CATEGORIES as any)[cat]?.label ?? 'Outros';
}

export async function generateAssetReportExcel(report: AssetReportData) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  // Tab 1: Summary
  const summaryData = [
    ['Indicador', 'Valor'],
    ['Total de imóveis', report.summary.total_assets],
    ['Total investido', report.summary.total_invested],
    ['Valor de mercado total', report.summary.total_market_value],
    ['Valorização absoluta', report.summary.total_appreciation_abs ?? '—'],
    ['Valorização %', report.summary.total_appreciation_pct != null ? `${report.summary.total_appreciation_pct.toFixed(2)}%` : '—'],
    ['Receitas no período', report.summary.period_income],
    ['Despesas no período', report.summary.period_expenses],
    ['Resultado líquido', report.summary.period_net],
    ['ROI no período', report.summary.period_roi_pct != null ? `${report.summary.period_roi_pct.toFixed(2)}%` : '—'],
    ['Yield mensal médio', report.summary.monthly_yield_avg != null ? `${report.summary.monthly_yield_avg.toFixed(2)}%` : '—'],
    ['Cap Rate médio', report.summary.cap_rate_avg != null ? `${report.summary.cap_rate_avg.toFixed(2)}%` : '—'],
    [],
    ['Período', `${report.period.from} a ${report.period.to}`],
    ['Gerado em', new Date(report.generated_at).toLocaleString('pt-BR')],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Sumário');

  // Tab 2: Acquisition
  const acqRows = [['Nome', 'Tipo', 'Endereço', 'Valor Aquisição', 'Data Aquisição', 'Custos', 'Total Investido', 'Observações']];
  for (const a of report.assets) {
    acqRows.push([
      a.name, a.type === 'property' ? 'Imóvel' : 'Unidade', a.address,
      a.acquisition?.value as any ?? '', a.acquisition?.date ?? '', a.acquisition?.costs as any ?? '',
      a.acquisition?.total_invested as any ?? '', a.acquisition?.notes ?? '',
    ]);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(acqRows), 'Aquisição');

  // Tab 3: Market
  const mktRows = [['Nome', 'Tipo', 'Valor Atual', 'Valorização Abs', 'Valorização %']];
  for (const a of report.assets) {
    mktRows.push([
      a.name, a.type === 'property' ? 'Imóvel' : 'Unidade',
      a.market?.current_value as any ?? '',
      a.market?.appreciation_abs as any ?? '',
      a.market?.appreciation_pct != null ? `${a.market.appreciation_pct.toFixed(2)}%` : '',
    ]);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(mktRows), 'Mercado');

  // Tab 4: Expenses (detailed)
  const expRows = [['Imóvel', 'Descrição', 'Categoria', 'Valor', 'Data']];
  for (const a of report.assets) {
    for (const e of a.period?.top_expenses || []) {
      expRows.push([a.name, e.description, getCategoryLabel(e.category), e.amount as any, e.date]);
    }
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(expRows), 'Despesas');

  // Tab 5: Improvements
  const impRows = [['Imóvel', 'Tipo', 'Descrição', 'Custo', 'Data', 'Afeta Valor Mercado']];
  for (const a of report.assets) {
    for (const i of a.improvements?.items || []) {
      impRows.push([a.name, i.type, i.description, i.cost as any, i.completed_at, i.affects_market_value ? 'Sim' : 'Não']);
    }
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(impRows), 'Benfeitorias');

  // Tab 6: Activities (summary per asset)
  const actRows = [['Imóvel', 'Tipo', 'Receitas', 'Despesas', 'ROI %', 'Yield %', 'Cap Rate %', 'Atividades']];
  for (const a of report.assets) {
    actRows.push([
      a.name, a.type === 'property' ? 'Imóvel' : 'Unidade',
      a.period?.income_total as any ?? 0, a.period?.expenses_total as any ?? 0,
      a.period?.roi_pct != null ? `${a.period.roi_pct.toFixed(2)}%` : '',
      a.period?.monthly_yield != null ? `${a.period.monthly_yield.toFixed(2)}%` : '',
      a.period?.cap_rate != null ? `${a.period.cap_rate.toFixed(2)}%` : '',
      a.period?.activities_count ?? 0,
    ]);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(actRows), 'Atividades');

  XLSX.writeFile(wb, `relatorio-imovel-${report.period.from}-${report.period.to}.xlsx`);
}
