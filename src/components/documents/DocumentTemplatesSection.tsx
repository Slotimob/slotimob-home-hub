import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search } from 'lucide-react';
import { documentTemplates, CATEGORY_LABELS, getCategoryCounts, DocumentTemplate } from '@/utils/documentTemplates';
import { DocumentTemplateCard } from './DocumentTemplateCard';

export const DocumentTemplatesSection = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const navigate = useNavigate();

  const categoryCounts = getCategoryCounts();

  const filteredTemplates = documentTemplates.filter((template) => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Abre o editor em tela cheia (rota própria) em vez de popup.
  const handleEdit = (template: DocumentTemplate) => {
    navigate(`/documents/modelo/${template.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar modelos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all" className="text-xs">
            Todos ({documentTemplates.length})
          </TabsTrigger>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <TabsTrigger key={key} value={key} className="text-xs">
              {label} ({categoryCounts[key] || 0})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filteredTemplates.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          Nenhum modelo encontrado
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <DocumentTemplateCard
              key={template.id}
              template={template}
              onEdit={() => handleEdit(template)}
            />
          ))}
        </div>
      )}

    </div>
  );
};
