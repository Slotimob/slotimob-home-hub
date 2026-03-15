import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Edit, FileText, ClipboardList, Receipt, ClipboardCheck, Key } from 'lucide-react';
import { DocumentTemplate, CATEGORY_LABELS, CATEGORY_COLORS } from '@/utils/documentTemplates';
import { generateBlankTemplatePDF } from '@/utils/pdfGenerator';
import { usePermissions } from '@/hooks/usePermissions';

interface DocumentTemplateCardProps {
  template: DocumentTemplate;
  onEdit: () => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  captacao: <ClipboardList className="h-5 w-5" />,
  recibos: <Receipt className="h-5 w-5" />,
  vistorias: <ClipboardCheck className="h-5 w-5" />,
  diversos: <FileText className="h-5 w-5" />,
  locacao: <Key className="h-5 w-5" />,
};

export const DocumentTemplateCard = ({ template, onEdit }: DocumentTemplateCardProps) => {
  const { isOwner, hasPermission } = usePermissions();
  const canCreate = isOwner || hasPermission('documents', 'create');
  const canEditDoc = isOwner || hasPermission('documents', 'edit');
  const canUse = canCreate || canEditDoc;

  const handleDownloadBlank = () => {
    generateBlankTemplatePDF(template);
  };

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={canUse ? onEdit : undefined}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${CATEGORY_COLORS[template.category]} text-white`}>
              {categoryIcons[template.category]}
            </div>
            <div>
              <CardTitle className="text-sm leading-tight">{template.name}</CardTitle>
              <Badge variant="outline" className="mt-1 text-xs">
                {CATEGORY_LABELS[template.category]}
              </Badge>
            </div>
          </div>
        </div>
        <CardDescription className="line-clamp-2 text-xs mt-2">
          {template.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs text-muted-foreground">
          {template.fields.length} campos para preencher
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              handleDownloadBlank();
            }}
          >
            <Download className="mr-1 h-3 w-3" />
            Original
          </Button>
          {canUse && (
            <Button
              size="sm"
              className="flex-1 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Edit className="mr-1 h-3 w-3" />
              {canEditDoc ? 'Editar' : 'Usar'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
