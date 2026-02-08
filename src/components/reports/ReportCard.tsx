import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface ReportCardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  onGeneratePDF: () => Promise<void>;
  onDownloadCSV: () => Promise<void>;
  pdfDisabled?: boolean;
  csvDisabled?: boolean;
  warningMessage?: string;
}

export const ReportCard = ({
  title,
  description,
  icon,
  onGeneratePDF,
  onDownloadCSV,
  pdfDisabled = false,
  csvDisabled = false,
  warningMessage,
}: ReportCardProps) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isDownloadingCSV, setIsDownloadingCSV] = useState(false);

  const handlePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      await onGeneratePDF();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleCSV = async () => {
    setIsDownloadingCSV(true);
    try {
      await onDownloadCSV();
    } finally {
      setIsDownloadingCSV(false);
    }
  };

  return (
    <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {icon && (
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold leading-tight">
              {title}
            </CardTitle>
            <CardDescription className="mt-1.5 text-sm leading-relaxed">
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 mt-auto">
        {warningMessage && (
          <p className="text-xs text-destructive mb-3 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
            {warningMessage}
          </p>
        )}
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={handlePDF}
            disabled={pdfDisabled || isGeneratingPDF}
          >
            {isGeneratingPDF ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-1.5" />
            )}
            Gerar PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleCSV}
            disabled={csvDisabled || isDownloadingCSV}
          >
            {isDownloadingCSV ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 mr-1.5" />
            )}
            Baixar CSV
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
