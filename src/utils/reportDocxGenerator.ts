import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface ReportDocxColumn {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  width?: number; // percentage of table width
}

export interface ReportDocxOptions {
  title: string;
  subtitle?: string;
  generatedAt?: Date;
  summary?: Array<{ label: string; value: string }>;
  columns: ReportDocxColumn[];
  rows: Record<string, string | number | null | undefined>[];
  footer?: string;
  fileName: string;
}

const TABLE_WIDTH = 9360; // US Letter 1" margins

function getAlignment(align?: string) {
  if (align === 'right') return 'right';
  if (align === 'center') return 'center';
  return 'left';
}

export async function generateReportDocx(options: ReportDocxOptions): Promise<void> {
  const docx = await import('docx');
  const {
    Document,
    Packer,
    Paragraph,
    Table,
    TableRow,
    TableCell,
    HeadingLevel,
    AlignmentType,
    WidthType,
    BorderStyle,
    TextRun,
    Header,
    Footer,
    PageNumber,
  } = docx;

  const BORDER = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
  const CELL_BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
  const CELL_MARGINS = { top: 60, bottom: 60, left: 80, right: 80 };
  const {
    title, subtitle, generatedAt = new Date(), summary, columns, rows, footer, fileName,
  } = options;

  const children: (Paragraph | Table)[] = [];

  // Title
  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
    children: [new TextRun({ text: title.toUpperCase(), bold: true, font: 'Arial', size: 28 })],
  }));

  // Subtitle
  if (subtitle) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: subtitle, font: 'Arial', size: 20, color: '666666', italics: true })],
    }));
  }

  // Generated at
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({
      text: `Gerado em ${format(generatedAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} por SLOTIMOB`,
      font: 'Arial', size: 16, color: '999999',
    })],
  }));

  // Summary KPIs
  if (summary && summary.length > 0) {
    children.push(new Paragraph({
      spacing: { before: 100, after: 100 },
      children: [new TextRun({ text: 'Resumo', bold: true, font: 'Arial', size: 22 })],
    }));

    const summaryColWidth = Math.floor(TABLE_WIDTH / 2);
    const summaryRows = summary.map(s => new TableRow({
      children: [
        new TableCell({
          borders: CELL_BORDERS, margins: CELL_MARGINS,
          width: { size: summaryColWidth, type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun({ text: s.label, font: 'Arial', size: 18, bold: true })] })],
        }),
        new TableCell({
          borders: CELL_BORDERS, margins: CELL_MARGINS,
          width: { size: summaryColWidth, type: WidthType.DXA },
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: s.value, font: 'Arial', size: 18 })],
          })],
        }),
      ],
    }));

    children.push(new Table({
      width: { size: TABLE_WIDTH, type: WidthType.DXA },
      columnWidths: [summaryColWidth, summaryColWidth],
      rows: summaryRows,
    }));

    children.push(new Paragraph({ spacing: { after: 200 }, children: [] }));
  }

  // Main data table
  if (rows.length > 0) {
    const colCount = columns.length;
    const defaultColWidth = Math.floor(TABLE_WIDTH / colCount);
    const colWidths = columns.map(c => c.width ? Math.floor(TABLE_WIDTH * c.width / 100) : defaultColWidth);
    // Adjust last column to fill remainder
    const usedWidth = colWidths.slice(0, -1).reduce((a, b) => a + b, 0);
    colWidths[colWidths.length - 1] = TABLE_WIDTH - usedWidth;

    // Header row
    const headerRow = new TableRow({
      tableHeader: true,
      children: columns.map((col, i) => new TableCell({
        borders: CELL_BORDERS, margins: CELL_MARGINS,
        width: { size: colWidths[i], type: WidthType.DXA },
        shading: { fill: '374151', type: 'clear' as any },
        children: [new Paragraph({
          alignment: getAlignment(col.align),
          children: [new TextRun({ text: col.label, font: 'Arial', size: 16, bold: true, color: 'FFFFFF' })],
        })],
      })),
    });

    // Data rows
    const dataRows = rows.map((row, rowIdx) => new TableRow({
      children: columns.map((col, i) => new TableCell({
        borders: CELL_BORDERS, margins: CELL_MARGINS,
        width: { size: colWidths[i], type: WidthType.DXA },
        shading: rowIdx % 2 === 1 ? { fill: 'F8FAFC', type: 'clear' as any } : undefined,
        children: [new Paragraph({
          alignment: getAlignment(col.align),
          children: [new TextRun({ text: String(row[col.key] ?? '-'), font: 'Arial', size: 16 })],
        })],
      })),
    }));

    children.push(new Table({
      width: { size: TABLE_WIDTH, type: WidthType.DXA },
      columnWidths: colWidths,
      rows: [headerRow, ...dataRows],
    }));
  } else {
    children.push(new Paragraph({
      spacing: { before: 200 },
      children: [new TextRun({ text: 'Nenhum dado encontrado para o período selecionado.', font: 'Arial', size: 18, color: '999999', italics: true })],
    }));
  }

  const footerText = footer || 'SLOTIMOB · Gestão Imobiliária';

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: 'Arial', size: 20 } },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({ children: [new Paragraph({ children: [] })] }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `${footerText} | Página `, font: 'Arial', size: 14, color: '999999' }),
              new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 14, color: '999999' }),
            ],
          })],
        }),
      },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
