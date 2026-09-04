/**
 * DOCX generator for comprehensive asset report.
 * Tables and text only (no charts).
 */
import type { AssetReportData } from '@/lib/asset-report-data';
import { ASSET_EXPENSE_CATEGORIES } from '@/lib/asset-expense-categories';
import { formatDateOnly } from "@/lib/date-only";

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
  const p = d.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d;
}
function getCategoryLabel(cat: string | null): string {
  if (!cat) return 'Outros';
  return (ASSET_EXPENSE_CATEGORIES as any)[cat]?.label ?? 'Outros';
}

export async function generateAssetReportDocx(report: AssetReportData) {
  const docx = await import('docx');
  const { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, TextRun, HeadingLevel, AlignmentType, BorderStyle } = docx;

  const noBorder = { top: { style: BorderStyle.NONE, size: 0 }, bottom: { style: BorderStyle.NONE, size: 0 }, left: { style: BorderStyle.NONE, size: 0 }, right: { style: BorderStyle.NONE, size: 0 } };

  function kvRow(key: string, val: string) {
    return new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: key, bold: true, size: 18 })] })], width: { size: 35, type: WidthType.PERCENTAGE }, borders: noBorder }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: val, size: 18 })] })], width: { size: 65, type: WidthType.PERCENTAGE }, borders: noBorder }),
      ],
    });
  }

  const sections: any[] = [];

  // Title
  sections.push(
    new Paragraph({ children: [new TextRun({ text: 'Relatório Completo do Imóvel', bold: true, size: 32, color: '1E3A5F' })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
    new Paragraph({ children: [new TextRun({ text: `Período: ${fmtDate(report.period.from)} — ${fmtDate(report.period.to)}`, size: 20 })], alignment: AlignmentType.CENTER }),
    new Paragraph({ children: [new TextRun({ text: `${report.summary.total_assets} imóve${report.summary.total_assets === 1 ? 'l' : 'is'} • Gerado em ${new Date(report.generated_at).toLocaleDateString('pt-BR')}`, size: 18, color: '666666' })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
  );

  // Summary
  const s = report.summary;
  sections.push(
    new Paragraph({ text: 'Sumário Consolidado', heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 100 } }),
    new Table({ rows: [
      kvRow('Total investido', fmtCurrency(s.total_invested)),
      kvRow('Valor de mercado', fmtCurrency(s.total_market_value)),
      kvRow('Valorização', `${fmtCurrency(s.total_appreciation_abs)} (${fmtPct(s.total_appreciation_pct)})`),
      kvRow('Receitas no período', fmtCurrency(s.period_income)),
      kvRow('Despesas no período', fmtCurrency(s.period_expenses)),
      kvRow('Resultado líquido', fmtCurrency(s.period_net)),
      kvRow('ROI no período', fmtPct(s.period_roi_pct)),
      kvRow('Yield mensal médio', fmtPct(s.monthly_yield_avg)),
      kvRow('Cap Rate médio', fmtPct(s.cap_rate_avg)),
    ], width: { size: 100, type: WidthType.PERCENTAGE } }),
  );

  // Per asset
  for (const asset of report.assets) {
    sections.push(
      new Paragraph({ text: asset.name, heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 50 } }),
    );
    if (asset.address) sections.push(new Paragraph({ children: [new TextRun({ text: asset.address, size: 18, color: '666666' })] }));

    if (asset.acquisition) {
      sections.push(new Paragraph({ text: 'Aquisição', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 50 } }));
      sections.push(new Table({ rows: [
        kvRow('Valor de aquisição', fmtCurrency(asset.acquisition.value)),
        kvRow('Data de aquisição', fmtDate(asset.acquisition.date)),
        kvRow('Custos', fmtCurrency(asset.acquisition.costs)),
        kvRow('Total investido', fmtCurrency(asset.acquisition.total_invested)),
      ], width: { size: 100, type: WidthType.PERCENTAGE } }));
    }

    if (asset.market) {
      sections.push(new Paragraph({ text: 'Valor de Mercado', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 50 } }));
      sections.push(new Table({ rows: [
        kvRow('Valor atual', fmtCurrency(asset.market.current_value)),
        kvRow('Valorização', `${fmtCurrency(asset.market.appreciation_abs)} (${fmtPct(asset.market.appreciation_pct)})`),
      ], width: { size: 100, type: WidthType.PERCENTAGE } }));
    }

    if (asset.improvements && asset.improvements.items.length > 0) {
      sections.push(new Paragraph({ text: 'Benfeitorias', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 50 } }));
      const headerRow = new TableRow({
        children: ['Tipo', 'Descrição', 'Custo', 'Data'].map(h =>
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 16 })] })] })
        ),
      });
      const rows = asset.improvements.items.map(i => new TableRow({
        children: [i.type, i.description, fmtCurrency(i.cost), fmtDate(i.completed_at)].map(v =>
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: v, size: 16 })] })] })
        ),
      }));
      sections.push(new Table({ rows: [headerRow, ...rows], width: { size: 100, type: WidthType.PERCENTAGE } }));
    }

    if (asset.period) {
      if (asset.period.expenses_total > 0) {
        sections.push(new Paragraph({ text: 'Despesas no Período', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 50 } }));
        const cats = Object.entries(asset.period.expenses_by_category).sort((a, b) => b[1] - a[1]);
        const catHeader = new TableRow({
          children: ['Categoria', 'Valor', '% do Total'].map(h =>
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 16 })] })] })
          ),
        });
        const catRows = cats.map(([cat, amt]) => new TableRow({
          children: [getCategoryLabel(cat), fmtCurrency(amt), `${((amt / asset.period!.expenses_total) * 100).toFixed(1)}%`].map(v =>
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: v, size: 16 })] })] })
          ),
        }));
        sections.push(new Table({ rows: [catHeader, ...catRows], width: { size: 100, type: WidthType.PERCENTAGE } }));
      }

      sections.push(new Paragraph({ text: 'Receitas no Período', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 50 } }));
      sections.push(new Paragraph({ children: [new TextRun({ text: `Total: ${fmtCurrency(asset.period.income_total)}`, size: 20 })] }));

      if ((asset.period.maintenance_items?.length ?? 0) > 0) {
        sections.push(new Paragraph({ text: 'Manutenções e Atividades', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 50 } }));
        const maintHeader = new TableRow({
          children: ['Data', 'Tipo', 'Atividade', 'Responsável', 'Custo est.', 'Lançamento', 'Anexos', 'Status'].map(h =>
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 14 })] })] })
          ),
        });
        const maintRows = asset.period.maintenance_items.map(m => new TableRow({
          children: [
            formatDateOnly(m.date),
            m.type_label,
            m.title,
            m.responsible ?? '—',
            fmtCurrency(m.estimated_cost),
            m.has_transaction ? 'Sim' : 'Não',
            String(m.attachments_count),
            m.is_completed ? 'Concluída' : 'Pendente',
          ].map(v => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: v, size: 14 })] })] })),
        }));
        sections.push(new Table({ rows: [maintHeader, ...maintRows], width: { size: 100, type: WidthType.PERCENTAGE } }));
        sections.push(new Paragraph({ children: [new TextRun({ text: `Total: ${asset.period.maintenance_count} atividade(s) • ${asset.period.maintenance_pending_count} pendente(s) • Custo estimado ${fmtCurrency(asset.period.maintenance_estimated_cost)}`, size: 16, color: '666666' })], spacing: { before: 80 } }));
      }

      sections.push(new Paragraph({ text: 'Indicadores', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 50 } }));
      sections.push(new Table({ rows: [
        kvRow('ROI no período', fmtPct(asset.period.roi_pct)),
        kvRow('Yield mensal', fmtPct(asset.period.monthly_yield)),
        kvRow('Cap Rate', fmtPct(asset.period.cap_rate)),
        kvRow('Atividades', String(asset.period.activities_count)),
        kvRow('Manutenções no período', String(asset.period.maintenance_count)),
        kvRow('Custo estimado de manutenções', fmtCurrency(asset.period.maintenance_estimated_cost)),
      ], width: { size: 100, type: WidthType.PERCENTAGE } }));
    }
  }

  const docFile = new Document({
    sections: [{ children: sections }],
  });

  const blob = await Packer.toBlob(docFile);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `relatorio-imovel-${report.period.from}-${report.period.to}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
