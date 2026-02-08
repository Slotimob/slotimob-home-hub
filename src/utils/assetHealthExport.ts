import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { AssetHealth, ObligationHealth } from "@/hooks/useAssetHealth";

interface OverdueItem {
  unitNumber: string;
  propertyName: string | null;
  ownerName: string | null;
  obligationLabel: string;
  dueDay: number | null;
  amount: number | undefined;
}

function normalizeText(text: string): string {
  return text.normalize("NFC");
}

export function getOverdueAssets(assets: AssetHealth[]): OverdueItem[] {
  const overdueItems: OverdueItem[] = [];

  assets.forEach((asset) => {
    const overdueObligations = asset.obligations.filter(
      (o) => o.status === "overdue"
    );

    overdueObligations.forEach((obligation) => {
      overdueItems.push({
        unitNumber: asset.unitNumber,
        propertyName: asset.propertyName,
        ownerName: asset.ownerName,
        obligationLabel: obligation.label,
        dueDay: obligation.dueDay,
        amount: obligation.amount,
      });
    });
  });

  return overdueItems;
}

export function exportOverdueToCsv(assets: AssetHealth[]): void {
  const overdueItems = getOverdueAssets(assets);

  if (overdueItems.length === 0) {
    return;
  }

  const now = new Date();
  const monthYear = format(now, "MMMM/yyyy", { locale: ptBR });
  const capitalizedMonthYear =
    monthYear.charAt(0).toUpperCase() + monthYear.slice(1);

  const headers = [
    "Unidade",
    "Empreendimento",
    "Proprietário",
    "Obrigação",
    "Dia Vencimento",
    "Valor",
  ];

  const rows = overdueItems.map((item) => [
    item.unitNumber,
    item.propertyName || "-",
    item.ownerName || "-",
    item.obligationLabel,
    item.dueDay?.toString() || "-",
    item.amount
      ? new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(item.amount)
      : "-",
  ]);

  const csvContent = [
    `Relatório de Pendências - ${capitalizedMonthYear}`,
    "",
    headers.join(";"),
    ...rows.map((row) => row.join(";")),
  ].join("\n");

  // Add BOM for Excel compatibility
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `pendencias-${format(now, "yyyy-MM")}.csv`
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportOverdueToPdf(assets: AssetHealth[]): void {
  const overdueItems = getOverdueAssets(assets);

  if (overdueItems.length === 0) {
    return;
  }

  const now = new Date();
  const monthYear = format(now, "MMMM/yyyy", { locale: ptBR });
  const capitalizedMonthYear =
    monthYear.charAt(0).toUpperCase() + monthYear.slice(1);

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(
    normalizeText("Relatório de Pendências"),
    doc.internal.pageSize.width / 2,
    20,
    { align: "center" }
  );

  // Subtitle with date
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(
    normalizeText(`Referência: ${capitalizedMonthYear}`),
    doc.internal.pageSize.width / 2,
    28,
    { align: "center" }
  );

  // Generation date
  doc.setFontSize(9);
  doc.setTextColor(128, 128, 128);
  doc.text(
    normalizeText(`Gerado em: ${format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`),
    doc.internal.pageSize.width / 2,
    34,
    { align: "center" }
  );

  // Summary
  const uniqueUnits = new Set(overdueItems.map((i) => i.unitNumber)).size;
  const totalAmount = overdueItems.reduce(
    (sum, item) => sum + (item.amount || 0),
    0
  );

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(normalizeText("Resumo:"), 14, 44);
  doc.setFont("helvetica", "normal");
  doc.text(
    normalizeText(
      `${overdueItems.length} obrigação(ões) em atraso em ${uniqueUnits} imóvel(is)`
    ),
    14,
    50
  );
  if (totalAmount > 0) {
    doc.text(
      normalizeText(
        `Valor total pendente: ${new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(totalAmount)}`
      ),
      14,
      56
    );
  }

  // Table
  const tableData = overdueItems.map((item) => [
    normalizeText(item.unitNumber),
    normalizeText(item.propertyName || "-"),
    normalizeText(item.ownerName || "-"),
    normalizeText(item.obligationLabel),
    item.dueDay ? `Dia ${item.dueDay}` : "-",
    item.amount
      ? new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(item.amount)
      : "-",
  ]);

  autoTable(doc, {
    startY: totalAmount > 0 ? 64 : 58,
    head: [
      [
        normalizeText("Unidade"),
        normalizeText("Empreendimento"),
        normalizeText("Proprietário"),
        normalizeText("Obrigação"),
        normalizeText("Vencimento"),
        normalizeText("Valor"),
      ],
    ],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [220, 38, 38], // Red for overdue
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [254, 226, 226], // Light red
    },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 35 },
      2: { cellWidth: 35 },
      3: { cellWidth: 30 },
      4: { cellWidth: 25 },
      5: { cellWidth: 25, halign: "right" },
    },
    margin: { left: 14, right: 14 },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      normalizeText(`Página ${i} de ${pageCount}`),
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: "center" }
    );
  }

  doc.save(`pendencias-${format(now, "yyyy-MM")}.pdf`);
}
