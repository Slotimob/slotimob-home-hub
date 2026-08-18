/**
 * PDF generator for comprehensive asset report.
 * Cover page + summary + per-asset pages.
 */
import type { AssetReportData, AssetReportAsset } from '@/lib/asset-report-data';
import { ASSET_EXPENSE_CATEGORIES } from '@/lib/asset-expense-categories';
import { ACTIVITIES_REPORT_LIMIT } from '@/lib/asset-report-data';
import { pdfSafeText, pdfSafeRow, pdfSafeLabel } from '@/utils/pdfSafeText';

function fmtDateTime(d: string | null): string {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return fmtDate(d);
  return date.toLocaleDateString('pt-BR');
}

function fmtDateTimeFull(d: string | null): string {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return fmtDate(d);
  return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}


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

  const multiAsset = report.assets.length > 1;
  const periodLabel = report.period.all_history
    ? `Período: todo o histórico (até ${fmtDate(report.period.to)})`
    : `Período: ${fmtDate(report.period.from)} — ${fmtDate(report.period.to)}`;

  // ── Cover Page ──
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageW, pageH, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.text('Relatório Completo', pageW / 2, 80, { align: 'center' });
  doc.text('do Imóvel', pageW / 2, 95, { align: 'center' });

  doc.setFontSize(14);
  const coverSubject = multiAsset
    ? `${report.assets.length} imóveis`
    : pdfSafeLabel(report.assets[0]?.name || 'Nenhum imóvel');
  doc.text(coverSubject, pageW / 2, 112, { align: 'center', maxWidth: pageW - 40 });

  doc.setFontSize(12);
  doc.text(periodLabel, pageW / 2, 126, { align: 'center' });

  doc.setFontSize(9);
  doc.text(
    `Gerado em ${new Date(report.generated_at).toLocaleDateString('pt-BR')} às ${new Date(report.generated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    pageW / 2, pageH - 20, { align: 'center' },
  );

  // ── Página agregada: SOMENTE quando há mais de 1 imóvel ──
  if (multiAsset) {
    doc.addPage();
    doc.setTextColor(30, 58, 95);
    doc.setFontSize(16);
    doc.text('Sumário da Carteira', margin, 20);
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

    let yIdx = (doc as any).lastAutoTable.finalY + 8;
    doc.setTextColor(30, 58, 95);
    doc.setFontSize(12);
    doc.text('Imóveis incluídos', margin, yIdx);
    yIdx += 2;

    autoTable(doc, {
      startY: yIdx,
      head: [['Imóvel', 'Total investido', 'Valor de mercado', 'Receitas', 'Despesas', 'Resultado']],
      body: report.assets.map(a => pdfSafeRow([
        pdfSafeText(a.name),
        fmtCurrency(a.acquisition?.total_invested ?? null),
        fmtCurrency(a.market?.current_value ?? null),
        fmtCurrency(a.period?.income_total ?? null),
        fmtCurrency(a.period?.expenses_total ?? null),
        fmtCurrency(a.period ? a.period.income_total - a.period.expenses_total : null),
      ])),
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [30, 58, 95] },
      margin: { left: margin, right: margin },
    });
  }

  // ── Per-asset pages ──
  for (const asset of report.assets) {
    doc.addPage();
    let y = 15;

    function checkPageBreak() {
      if (y > pageH - 40) {
        doc.addPage();
        y = 15;
      }
    }

    function sectionTitle(title: string) {
      checkPageBreak();
      doc.setTextColor(30, 58, 95);
      doc.setFontSize(12);
      doc.text(pdfSafeLabel(title), margin, y);
      y += 7;

    }

    function subTitle(title: string) {
      checkPageBreak();
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text(pdfSafeLabel(title), margin, y);
      y += 2;
    }

    // Header
    doc.setTextColor(30, 58, 95);
    doc.setFontSize(14);
    doc.text(pdfSafeLabel(asset.name), margin, y);
    y += 5;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    if (asset.address) { doc.text(pdfSafeText(asset.address), margin, y); y += 4; }
    doc.text(`Tipo: ${asset.type === 'property' ? 'Imóvel' : 'Unidade'} · ${periodLabel}`, margin, y);
    y += 6;
    doc.setDrawColor(30, 58, 95);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    // ══ 1. Sumário Financeiro Consolidado ══
    const hasSummary = !!asset.acquisition || !!asset.market || !!asset.period;
    if (hasSummary) {
      sectionTitle('Sumário Financeiro Consolidado');

      // a) Patrimônio (aquisição × mercado)
      const patrimonyRows: string[][] = [];
      if (asset.acquisition) {
        const capitalized =
          asset.acquisition.total_invested != null
            ? asset.acquisition.total_invested - (asset.acquisition.value ?? 0) - (asset.acquisition.costs ?? 0)
            : null;
        patrimonyRows.push(
          ['Valor de aquisição', fmtCurrency(asset.acquisition.value)],
          ['Data de aquisição', fmtDate(asset.acquisition.date)],
          ['Custos de aquisição (ITBI, cartório)', fmtCurrency(asset.acquisition.costs)],
          ['Benfeitorias capitalizadas', fmtCurrency(capitalized)],
          ['Total investido', fmtCurrency(asset.acquisition.total_invested)],
        );
      }
      if (asset.market) {
        patrimonyRows.push(
          ['Valor de mercado atual', fmtCurrency(asset.market.current_value)],
          ['Última atualização do valor', fmtDate(asset.market.last_updated)],
          ['Valorização (R$)', fmtCurrency(asset.market.appreciation_abs)],
          ['Valorização (%)', fmtPct(asset.market.appreciation_pct)],
        );
      }
      if (asset.acquisition?.notes) {
        patrimonyRows.push(['Observações de aquisição', pdfSafeText(asset.acquisition.notes)]);
      }

      if (patrimonyRows.length > 0) {
        subTitle('Patrimônio');
        autoTable(doc, {
          startY: y,
          body: pdfSafeRow ? patrimonyRows.map(r => pdfSafeRow(r)) : patrimonyRows,
          theme: 'plain',
          styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70 } },
          margin: { left: margin, right: margin },
        });
        y = (doc as any).lastAutoTable.finalY + 5;
      }

      // b) Resultado no período
      if (asset.period) {
        subTitle('Resultado no período');
        autoTable(doc, {
          startY: y,
          body: [
            ['Receitas no período', fmtCurrency(asset.period.income_total)],
            ['Despesas no período', fmtCurrency(asset.period.expenses_total)],
            ['Resultado líquido', fmtCurrency(asset.period.income_total - asset.period.expenses_total)],
          ],
          theme: 'plain',
          styles: { fontSize: 9, cellPadding: 2 },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70 } },
          margin: { left: margin, right: margin },
        });
        y = (doc as any).lastAutoTable.finalY + 5;

        // c) Indicadores
        subTitle('Indicadores');
        autoTable(doc, {
          startY: y,
          body: [
            ['ROI no período', fmtPct(asset.period.roi_pct)],
            ['Yield mensal', fmtPct(asset.period.monthly_yield)],
            ['Cap Rate', fmtPct(asset.period.cap_rate)],
          ],
          theme: 'plain',
          styles: { fontSize: 9, cellPadding: 2 },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70 } },
          margin: { left: margin, right: margin },
        });
        y = (doc as any).lastAutoTable.finalY + 5;

        // d) Composição das despesas
        if (asset.period.expenses_total > 0) {
          const cats = Object.entries(asset.period.expenses_by_category).sort((a, b) => b[1] - a[1]);
          if (cats.length > 0) {
            subTitle('Composição das despesas');
            autoTable(doc, {
              startY: y,
              head: [['Categoria', 'Valor', '% do total']],
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

          if (asset.period.top_expenses.length > 0) {
            subTitle('Maiores despesas do período');
            autoTable(doc, {
              startY: y,
              head: [['Descrição', 'Categoria', 'Valor', 'Data']],
              body: asset.period.top_expenses.map(e => pdfSafeRow([
                pdfSafeText(e.description).slice(0, 45),
                getCategoryLabel(e.category),
                fmtCurrency(e.amount),
                fmtDate(e.date),
              ])),
              theme: 'striped',
              styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
              headStyles: { fillColor: [100, 116, 139] },
              margin: { left: margin, right: margin },
            });
            y = (doc as any).lastAutoTable.finalY + 6;
          }
        }
      }
    }

    // ══ 2. Benfeitorias no Período ══
    if (asset.improvements && asset.improvements.items.length > 0) {
      sectionTitle('Benfeitorias no Período');
      autoTable(doc, {
        startY: y,
        head: [['Tipo', 'Descrição', 'Custo', 'Data']],
        body: asset.improvements.items.map(i => pdfSafeRow([
          pdfSafeText(i.type), pdfSafeText(i.description).slice(0, 40), fmtCurrency(i.cost), fmtDate(i.completed_at),
        ])),
        foot: [['', 'Total', fmtCurrency(asset.improvements.total), '']],
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [30, 58, 95] },
        margin: { left: margin, right: margin },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    // ══ 3. Manutenções e Atividades ══
    if (asset.period && (asset.period.maintenance_items?.length ?? 0) > 0) {
      sectionTitle('Manutenções e Atividades');

      autoTable(doc, {
        startY: y,
        head: [['Data', 'Tipo', 'Atividade', 'Responsável', 'Custo estimado', 'Lançamento financeiro', 'Anexos', 'Status']],
        body: asset.period.maintenance_items.map(m => pdfSafeRow([
          fmtDateTime(m.date),
          m.type_label,
          pdfSafeText(m.title).slice(0, 45),
          m.responsible ? pdfSafeText(m.responsible).slice(0, 22) : '—',
          fmtCurrency(m.estimated_cost),
          m.has_transaction ? 'Sim' : 'Não',
          String(m.attachments_count),
          m.is_completed ? 'Concluída' : 'Pendente',
        ])),
        theme: 'striped',
        styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [30, 58, 95], fontSize: 6.5 },
        columnStyles: {
          0: { cellWidth: 18 },
          1: { cellWidth: 20 },
          4: { cellWidth: 20 },
          5: { cellWidth: 20 },
          6: { cellWidth: 13 },
          7: { cellWidth: 18 },
        },
        margin: { left: margin, right: margin },
      });
      y = (doc as any).lastAutoTable.finalY + 4;

      const total = asset.period.maintenance_count;
      const pending = asset.period.maintenance_pending_count;
      const done = Math.max(0, total - pending);
      const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

      checkPageBreak();
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text(
        pdfSafeLabel(
          `Resumo do período: ${total} ${plural(total, 'manutenção registrada', 'manutenções registradas')}, ` +
          `sendo ${pending} ainda ${plural(pending, 'pendente', 'pendentes')} e ${done} ${plural(done, 'concluída', 'concluídas')}.`,
        ),
        margin, y, { maxWidth: pageW - margin * 2 },
      );
      y += 5;
      doc.text(
        pdfSafeLabel(
          `Custo estimado total: ${fmtCurrency(asset.period.maintenance_estimated_cost)} ` +
          `(valores previstos; não representam necessariamente lançamentos financeiros efetivados).`,
        ),
        margin, y, { maxWidth: pageW - margin * 2 },
      );
      y += 5;

      if (total > asset.period.maintenance_items.length) {
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text(
          pdfSafeLabel(`Exibindo as ${asset.period.maintenance_items.length} manutenções mais recentes de ${total} no período.`),
          margin, y,
        );
        y += 5;
      }
      y += 3;
    }

    // ══ 4. Atividades no Período (log completo, por último) ══
    if (asset.period && (asset.period.activities_items?.length ?? 0) > 0) {
      sectionTitle('Atividades no Período');

      const items = asset.period.activities_items;
      autoTable(doc, {
        startY: y,
        head: [['Data e hora', 'Usuário', 'Evento', 'Alterações']],
        body: items.map(a => pdfSafeRow([
          fmtDateTimeFull(a.date),
          pdfSafeText(a.user_name || 'Sistema').slice(0, 28),
          `${a.group}\n${pdfSafeText(a.description)}`,
          (a.changes || []).length
            ? a.changes.map(c => `${pdfSafeText(c.label)}: ${pdfSafeText(c.from)} -> ${pdfSafeText(c.to)}`).join('\n')
            : '—',
        ])),
        theme: 'striped',
        styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak', valign: 'top' },
        headStyles: { fillColor: [30, 58, 95] },
        columnStyles: { 0: { cellWidth: 24 }, 1: { cellWidth: 28 }, 2: { cellWidth: 62 } },
        margin: { left: margin, right: margin },
      });
      y = (doc as any).lastAutoTable.finalY + 3;

      if (asset.period.activities_count > items.length) {
        checkPageBreak();
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text(
          pdfSafeLabel(
            `Exibindo as ${items.length} atividades mais recentes de ${asset.period.activities_count} no período (limite de ${ACTIVITIES_REPORT_LIMIT} por imóvel).`,
          ),
          margin, y,
        );
        y += 5;
      }
      y += 3;
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

