/**
 * PDF generator for comprehensive asset report.
 * Cover page + summary + per-asset pages.
 */
import type { AssetReportData, AssetReportAsset } from '@/lib/asset-report-data';
import { ASSET_EXPENSE_CATEGORIES } from '@/lib/asset-expense-categories';
import { pdfSafeText, pdfSafeRow, pdfSafeLabel } from '@/utils/pdfSafeText';

function fmtCurrency(v: number | null | undefined): string {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
}

function fmtDate(d: string | null): string {
  if (!d) return '—';
  const parts = d.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return d;
}

function getCategoryLabel(cat: string | null): string {
  if (!cat) return 'Outros';
  return (ASSET_EXPENSE_CATEGORIES as any)[cat]?.label ?? 'Outros';
}

export async function generateAssetReportPdf(report: AssetReportData) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;

  // ── Cover Page ──
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageW, pageH, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.text('Relatório Completo', pageW / 2, 80, { align: 'center' });
  doc.text('do Imóvel', pageW / 2, 95, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`Período: ${fmtDate(report.period.from)} — ${fmtDate(report.period.to)}`, pageW / 2, 120, { align: 'center' });
  doc.text(`${report.summary.total_assets} imóve${report.summary.total_assets === 1 ? 'l' : 'is'}`, pageW / 2, 132, { align: 'center' });
  doc.setFontSize(9);
  doc.text(`Gerado em ${new Date(report.generated_at).toLocaleDateString('pt-BR')} às ${new Date(report.generated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, pageW / 2, pageH - 20, { align: 'center' });

  // ── Summary Page ──
  doc.addPage();
  doc.setTextColor(30, 58, 95);
  doc.setFontSize(16);
  doc.text('Sumário Consolidado', margin, 20);
  doc.setDrawColor(30, 58, 95);
  doc.line(margin, 23, pageW - margin, 23);

  const s = report.summary;
  const kpis: [string, string][] = [
    ['Total investido', fmtCurrency(s.total_invested)],
    ['Valor de mercado total', fmtCurrency(s.total_market_value)],
    ['Valorização', `${fmtCurrency(s.total_appreciation_abs)} (${fmtPct(s.total_appreciation_pct)})`],
    ['Receitas no período', fmtCurrency(s.period_income)],
    ['Despesas no período', fmtCurrency(s.period_expenses)],
    ['Resultado líquido', fmtCurrency(s.period_net)],
    ['ROI no período', fmtPct(s.period_roi_pct)],
    ['Yield mensal médio', fmtPct(s.monthly_yield_avg)],
    ['Cap Rate médio', fmtPct(s.cap_rate_avg)],
  ];

  autoTable(doc, {
    startY: 28,
    head: [['Indicador', 'Valor']],
    body: kpis,
    theme: 'striped',
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [30, 58, 95] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 } },
    margin: { left: margin, right: margin },
  });

  // ── Per-asset pages ──
  for (const asset of report.assets) {
    doc.addPage();
    let y = 15;

    // Header
    doc.setTextColor(30, 58, 95);
    doc.setFontSize(14);
    doc.text(asset.name, margin, y);
    y += 5;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    if (asset.address) { doc.text(asset.address, margin, y); y += 4; }
    doc.text(`Tipo: ${asset.type === 'property' ? 'Imóvel' : 'Unidade'}`, margin, y);
    y += 6;
    doc.setDrawColor(30, 58, 95);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    // Acquisition
    if (asset.acquisition) {
      doc.setTextColor(30, 58, 95);
      doc.setFontSize(11);
      doc.text('Aquisição', margin, y);
      y += 2;
      autoTable(doc, {
        startY: y,
        body: [
          ['Valor de aquisição', fmtCurrency(asset.acquisition.value)],
          ['Data de aquisição', fmtDate(asset.acquisition.date)],
          ['Custos (ITBI, cartório)', fmtCurrency(asset.acquisition.costs)],
          ['Total investido', fmtCurrency(asset.acquisition.total_invested)],
          ...(asset.acquisition.notes ? [['Observações', asset.acquisition.notes]] : []),
        ],
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
        margin: { left: margin, right: margin },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    // Market
    if (asset.market) {
      checkPageBreak();
      doc.setTextColor(30, 58, 95);
      doc.setFontSize(11);
      doc.text('Valor de Mercado', margin, y);
      y += 2;
      autoTable(doc, {
        startY: y,
        body: [
          ['Valor atual', fmtCurrency(asset.market.current_value)],
          ['Última atualização', fmtDate(asset.market.last_updated)],
          ['Valorização absoluta', fmtCurrency(asset.market.appreciation_abs)],
          ['Valorização %', fmtPct(asset.market.appreciation_pct)],
        ],
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
        margin: { left: margin, right: margin },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    // Improvements
    if (asset.improvements && asset.improvements.items.length > 0) {
      checkPageBreak();
      doc.setTextColor(30, 58, 95);
      doc.setFontSize(11);
      doc.text('Benfeitorias no Período', margin, y);
      y += 2;
      autoTable(doc, {
        startY: y,
        head: [['Tipo', 'Descrição', 'Custo', 'Data']],
        body: asset.improvements.items.map(i => [
          i.type, i.description.slice(0, 40), fmtCurrency(i.cost), fmtDate(i.completed_at),
        ]),
        foot: [['', 'Total', fmtCurrency(asset.improvements.total), '']],
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [30, 58, 95] },
        margin: { left: margin, right: margin },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    // Expenses
    if (asset.period && asset.period.expenses_total > 0) {
      checkPageBreak();
      doc.setTextColor(30, 58, 95);
      doc.setFontSize(11);
      doc.text('Despesas no Período', margin, y);
      y += 2;

      // By category
      const cats = Object.entries(asset.period.expenses_by_category)
        .sort((a, b) => b[1] - a[1]);
      if (cats.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['Categoria', 'Valor', '% do Total']],
          body: cats.map(([cat, amt]) => [
            getCategoryLabel(cat),
            fmtCurrency(amt),
            `${((amt / asset.period!.expenses_total) * 100).toFixed(1)}%`,
          ]),
          foot: [['Total', fmtCurrency(asset.period.expenses_total), '100%']],
          theme: 'striped',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [30, 58, 95] },
          margin: { left: margin, right: margin },
        });
        y = (doc as any).lastAutoTable.finalY + 4;
      }

      // Top expenses
      if (asset.period.top_expenses.length > 0) {
        checkPageBreak();
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.text('Top 10 despesas', margin, y);
        y += 2;
        autoTable(doc, {
          startY: y,
          head: [['Descrição', 'Categoria', 'Valor', 'Data']],
          body: asset.period.top_expenses.map(e => [
            e.description.slice(0, 35),
            getCategoryLabel(e.category),
            fmtCurrency(e.amount),
            fmtDate(e.date),
          ]),
          theme: 'striped',
          styles: { fontSize: 7, cellPadding: 2 },
          headStyles: { fillColor: [100, 116, 139] },
          margin: { left: margin, right: margin },
        });
        y = (doc as any).lastAutoTable.finalY + 6;
      }
    }

    // Income
    if (asset.period) {
      checkPageBreak();
      doc.setTextColor(30, 58, 95);
      doc.setFontSize(11);
      doc.text('Receitas no Período', margin, y);
      y += 5;
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(`Total: ${fmtCurrency(asset.period.income_total)}`, margin, y);
      y += 8;
    }

    // Indicators
    if (asset.period) {
      checkPageBreak();
      doc.setTextColor(30, 58, 95);
      doc.setFontSize(11);
      doc.text('Indicadores', margin, y);
      y += 2;
      autoTable(doc, {
        startY: y,
        body: [
          ['ROI no período', fmtPct(asset.period.roi_pct)],
          ['Yield mensal', fmtPct(asset.period.monthly_yield)],
          ['Cap Rate', fmtPct(asset.period.cap_rate)],
          ['Atividades no período', String(asset.period.activities_count)],
        ],
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
        margin: { left: margin, right: margin },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    function checkPageBreak() {
      if (y > pageH - 40) {
        doc.addPage();
        y = 15;
      }
    }
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Página ${i} de ${totalPages}`, pageW / 2, pageH - 8, { align: 'center' });
  }

  doc.save(`relatorio-imovel-${report.period.from}-${report.period.to}.pdf`);
}
