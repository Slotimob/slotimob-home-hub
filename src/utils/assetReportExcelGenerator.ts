/**
 * Excel generator for comprehensive asset report (6 tabs).
 */
import type { AssetReportData } from '@/lib/asset-report-data';
import { ASSET_EXPENSE_CATEGORIES } from '@/lib/asset-expense-categories';
import ExcelJS from 'exceljs';

function getCategoryLabel(cat: string | null): string {
  if (!cat) return 'Outros';
  return (ASSET_EXPENSE_CATEGORIES as any)[cat]?.label ?? 'Outros';
}

function pct(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v.toFixed(2)}%`;
}

export async function generateAssetReportExcel(report: AssetReportData) {
  const wb = new ExcelJS.Workbook();
  const headerStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } },
    alignment: { horizontal: 'center' },
  };

  function addHeader(ws: ExcelJS.Worksheet, cols: string[]) {
    const row = ws.addRow(cols);
    row.eachCell(c => { c.style = headerStyle; });
    return row;
  }

  // Tab 1: Summary
  const wsSummary = wb.addWorksheet('Sumário');
  wsSummary.columns = [{ width: 30 }, { width: 30 }];
  addHeader(wsSummary, ['Indicador', 'Valor']);
  const s = report.summary;
  const kpis: [string, string | number][] = [
    ['Total de imóveis', s.total_assets],
    ['Total investido', s.total_invested],
    ['Valor de mercado total', s.total_market_value],
    ['Valorização absoluta', s.total_appreciation_abs ?? '—'],
    ['Valorização %', pct(s.total_appreciation_pct)],
    ['Receitas no período', s.period_income],
    ['Despesas no período', s.period_expenses],
    ['Resultado líquido', s.period_net],
    ['ROI no período', pct(s.period_roi_pct)],
    ['Yield mensal médio', pct(s.monthly_yield_avg)],
    ['Cap Rate médio', pct(s.cap_rate_avg)],
    ['', ''],
    ['Período', `${report.period.from} a ${report.period.to}`],
    ['Gerado em', new Date(report.generated_at).toLocaleString('pt-BR')],
  ];
  for (const [k, v] of kpis) wsSummary.addRow([k, v]);

  // Tab 2: Acquisition
  const wsAcq = wb.addWorksheet('Aquisição');
  wsAcq.columns = [{ width: 30 }, { width: 10 }, { width: 30 }, { width: 18 }, { width: 14 }, { width: 18 }, { width: 18 }, { width: 30 }];
  addHeader(wsAcq, ['Nome', 'Tipo', 'Endereço', 'Valor Aquisição', 'Data', 'Custos', 'Total Investido', 'Observações']);
  for (const a of report.assets) {
    wsAcq.addRow([
      a.name, a.type === 'property' ? 'Imóvel' : 'Unidade', a.address,
      a.acquisition?.value ?? '', a.acquisition?.date ?? '', a.acquisition?.costs ?? '',
      a.acquisition?.total_invested ?? '', a.acquisition?.notes ?? '',
    ]);
  }

  // Tab 3: Market
  const wsMkt = wb.addWorksheet('Mercado');
  wsMkt.columns = [{ width: 30 }, { width: 10 }, { width: 18 }, { width: 18 }, { width: 14 }];
  addHeader(wsMkt, ['Nome', 'Tipo', 'Valor Atual', 'Valorização Abs', 'Valorização %']);
  for (const a of report.assets) {
    wsMkt.addRow([
      a.name, a.type === 'property' ? 'Imóvel' : 'Unidade',
      a.market?.current_value ?? '', a.market?.appreciation_abs ?? '',
      pct(a.market?.appreciation_pct),
    ]);
  }

  // Tab 4: Expenses
  const wsExp = wb.addWorksheet('Despesas');
  wsExp.columns = [{ width: 30 }, { width: 35 }, { width: 20 }, { width: 15 }, { width: 14 }];
  addHeader(wsExp, ['Imóvel', 'Descrição', 'Categoria', 'Valor', 'Data']);
  for (const a of report.assets) {
    for (const e of a.period?.top_expenses || []) {
      wsExp.addRow([a.name, e.description, getCategoryLabel(e.category), e.amount, e.date]);
    }
  }

  // Tab 5: Improvements
  const wsImp = wb.addWorksheet('Benfeitorias');
  wsImp.columns = [{ width: 30 }, { width: 18 }, { width: 30 }, { width: 15 }, { width: 14 }, { width: 18 }];
  addHeader(wsImp, ['Imóvel', 'Tipo', 'Descrição', 'Custo', 'Data', 'Afeta Valor Mercado']);
  for (const a of report.assets) {
    for (const i of a.improvements?.items || []) {
      wsImp.addRow([a.name, i.type, i.description, i.cost, i.completed_at, i.affects_market_value ? 'Sim' : 'Não']);
    }
  }

  // Tab 6: Activities
  const wsAct = wb.addWorksheet('Atividades');
  wsAct.columns = [{ width: 30 }, { width: 10 }, { width: 15 }, { width: 15 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }];
  addHeader(wsAct, ['Imóvel', 'Tipo', 'Receitas', 'Despesas', 'ROI %', 'Yield %', 'Cap Rate %', 'Atividades', 'Manutenções', 'Custo Est. Manutenções']);
  for (const a of report.assets) {
    wsAct.addRow([
      a.name, a.type === 'property' ? 'Imóvel' : 'Unidade',
      a.period?.income_total ?? 0, a.period?.expenses_total ?? 0,
      pct(a.period?.roi_pct), pct(a.period?.monthly_yield),
      pct(a.period?.cap_rate), a.period?.activities_count ?? 0,
      a.period?.maintenance_count ?? 0, a.period?.maintenance_estimated_cost ?? 0,
    ]);
  }

  // Tab 7: Manutenções e Atividades
  const wsMaint = wb.addWorksheet('Manutenções');
  wsMaint.columns = [{ width: 30 }, { width: 14 }, { width: 16 }, { width: 34 }, { width: 40 }, { width: 22 }, { width: 16 }, { width: 18 }, { width: 10 }, { width: 14 }];
  addHeader(wsMaint, ['Imóvel', 'Data', 'Tipo', 'Atividade', 'Descrição', 'Responsável', 'Custo Estimado', 'Lançamento Financeiro', 'Anexos', 'Status']);
  for (const a of report.assets) {
    for (const m of a.period?.maintenance_items || []) {
      wsMaint.addRow([
        a.name,
        new Date(m.date).toLocaleDateString('pt-BR'),
        m.type_label,
        m.title,
        m.description ?? '',
        m.responsible ?? '',
        m.estimated_cost ?? '',
        m.has_transaction ? 'Sim' : 'Não',
        m.attachments_count,
        m.is_completed ? 'Concluída' : 'Pendente',
      ]);
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `relatorio-imovel-${report.period.from}-${report.period.to}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
