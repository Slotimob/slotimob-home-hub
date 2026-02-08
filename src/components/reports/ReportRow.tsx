import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, FileSpreadsheet, Loader2 } from 'lucide-react';

interface ReportRowProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  onGeneratePDF: () => Promise<void>;
  onDownloadCSV: () => Promise<void>;
  pdfDisabled?: boolean;
  csvDisabled?: boolean;
  warningMessage?: string;
}

export function ReportRow({
  title,
  description,
  icon,
  onGeneratePDF,
  onDownloadCSV,
  pdfDisabled = false,
  csvDisabled = false,
  warningMessage,
}: ReportRowProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isDownloadingCSV, setIsDownloadingCSV] = useState(false);

  const handlePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      await onGeneratePDF();
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleCSV = async () => {
    setIsDownloadingCSV(true);
    try {
      await onDownloadCSV();
    } catch (error) {
      console.error('Error downloading CSV:', error);
    } finally {
      setIsDownloadingCSV(false);
    }
  };

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
          <span className="hidden xs:inline">Gerar</span> PDF
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCSV}
          disabled={csvDisabled || isDownloadingCSV}
          className="h-8 text-xs sm:text-sm"
        >
          {isDownloadingCSV ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
          )}
          CSV
        </Button>
      </div>
    </div>
  );
}
