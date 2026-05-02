import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, FileSpreadsheet, Loader2, Download, FileType, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ReportRowProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  onGeneratePDF: () => Promise<void>;
  onDownloadCSV: () => Promise<void>;
  onDownloadDocx?: () => Promise<void>;
  onDownloadExcel?: () => Promise<void>;
  pdfDisabled?: boolean;
  csvDisabled?: boolean;
  docxDisabled?: boolean;
  excelDisabled?: boolean;
  warningMessage?: string;
}

export function ReportRow({
  title,
  description,
  icon,
  onGeneratePDF,
  onDownloadCSV,
  onDownloadDocx,
  onDownloadExcel,
  pdfDisabled = false,
  csvDisabled = false,
  docxDisabled = false,
  excelDisabled = false,
  warningMessage,
}: ReportRowProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isDownloadingCSV, setIsDownloadingCSV] = useState(false);
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);

  const handlePDF = async () => {
    setIsGeneratingPDF(true);
    try { await onGeneratePDF(); } catch (error) { console.error('Error generating PDF:', error); } finally { setIsGeneratingPDF(false); }
  };

  const handleCSV = async () => {
    setIsDownloadingCSV(true);
    try { await onDownloadCSV(); } catch (error) { console.error('Error downloading CSV:', error); } finally { setIsDownloadingCSV(false); }
  };

  const handleDocx = async () => {
    if (!onDownloadDocx) return;
    setIsDownloadingDocx(true);
    try { await onDownloadDocx(); } catch (error) { console.error('Error downloading DOCX:', error); } finally { setIsDownloadingDocx(false); }
  };

  const handleExcel = async () => {
    if (!onDownloadExcel) return;
    setIsDownloadingExcel(true);
    try { await onDownloadExcel(); } catch (error) { console.error('Error downloading Excel:', error); } finally { setIsDownloadingExcel(false); }
  };

  const hasExtraFormats = !!onDownloadDocx || !!onDownloadExcel;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors">
      {/* Icon and content */}
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {icon && (
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-sm sm:text-base">{title}</h4>
            {warningMessage && (
              <span className="inline-flex items-center gap-1 text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                {warningMessage}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-2">
            {description}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0 ml-11 sm:ml-0">
        {/* PDF - always visible */}
        <Button
          variant="default"
          size="sm"
          onClick={handlePDF}
          disabled={pdfDisabled || isGeneratingPDF}
          className="h-8 text-xs sm:text-sm"
        >
          {isGeneratingPDF ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <FileText className="h-3.5 w-3.5 mr-1.5" />
          )}
          PDF
        </Button>

        {/* Desktop: individual buttons for Word, Excel, CSV */}
        {onDownloadDocx && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDocx}
            disabled={docxDisabled || isDownloadingDocx}
            className="h-8 text-xs sm:text-sm hidden sm:inline-flex"
          >
            {isDownloadingDocx ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <FileType className="h-3.5 w-3.5 mr-1.5" />
            )}
            Word
          </Button>
        )}

        {onDownloadExcel && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleExcel}
            disabled={excelDisabled || isDownloadingExcel}
            className="h-8 text-xs sm:text-sm hidden sm:inline-flex"
          >
            {isDownloadingExcel ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
            )}
            Excel
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleCSV}
          disabled={csvDisabled || isDownloadingCSV}
          className="h-8 text-xs sm:text-sm hidden sm:inline-flex"
        >
          {isDownloadingCSV ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5 mr-1.5" />
          )}
          CSV
        </Button>

        {/* Mobile: dropdown for extra formats */}
        <div className="sm:hidden">
          {hasExtraFormats ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  Mais
                  <ChevronDown className="h-3.5 w-3.5 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onDownloadDocx && (
                  <DropdownMenuItem onClick={handleDocx} disabled={docxDisabled || isDownloadingDocx}>
                    <FileType className="h-4 w-4 mr-2" />
                    {isDownloadingDocx ? 'Gerando...' : 'Word (.docx)'}
                  </DropdownMenuItem>
                )}
                {onDownloadExcel && (
                  <DropdownMenuItem onClick={handleExcel} disabled={excelDisabled || isDownloadingExcel}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    {isDownloadingExcel ? 'Gerando...' : 'Excel (.xlsx)'}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleCSV} disabled={csvDisabled || isDownloadingCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  {isDownloadingCSV ? 'Baixando...' : 'CSV'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCSV}
              disabled={csvDisabled || isDownloadingCSV}
              className="h-8 text-xs"
            >
              {isDownloadingCSV ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5 mr-1.5" />
              )}
              CSV
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
