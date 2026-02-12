import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, HelpCircle } from 'lucide-react';

export interface FaqItem {
  question: string;
  answer: string;
}

interface BlogFaqEditorProps {
  faqs: FaqItem[];
  onChange: (faqs: FaqItem[]) => void;
}

export function BlogFaqEditor({ faqs, onChange }: BlogFaqEditorProps) {
  const addFaq = () => {
    onChange([...faqs, { question: '', answer: '' }]);
  };

  const updateFaq = (index: number, field: keyof FaqItem, value: string) => {
    const updated = [...faqs];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeFaq = (index: number) => {
    onChange(faqs.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5">
          <HelpCircle className="h-3.5 w-3.5" />
          FAQs (Rich Snippets)
        </Label>
        <Button type="button" variant="outline" size="sm" onClick={addFaq} className="h-7 text-xs gap-1">
          <Plus className="h-3 w-3" /> Adicionar
        </Button>
      </div>

      {faqs.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Adicione perguntas frequentes para gerar o schema FAQPage e aparecer nos Rich Snippets do Google.
        </p>
      )}

      {faqs.map((faq, i) => (
        <Card key={i} className="border-dashed">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-2">
                <Input
                  value={faq.question}
                  onChange={(e) => updateFaq(i, 'question', e.target.value)}
                  placeholder="Pergunta..."
                  className="text-sm"
                />
                <Textarea
                  value={faq.answer}
                  onChange={(e) => updateFaq(i, 'answer', e.target.value)}
                  placeholder="Resposta..."
                  rows={2}
                  className="text-sm"
                />
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0"
                onClick={() => removeFaq(i)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
