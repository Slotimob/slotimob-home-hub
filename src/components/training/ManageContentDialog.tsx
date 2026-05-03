import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { HELP_FEATURES, type FeatureKey } from '@/lib/help-features';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  category: z.string().min(1, 'Categoria é obrigatória'),
  content_type: z.enum(['video', 'external']),
  video_url: z.string().optional(),
  thumbnail_url: z.string().optional(),
  checkout_url: z.string().optional(),
  duration_minutes: z.coerce.number().optional(),
  display_order: z.coerce.number().min(0).default(0),
  is_premium: z.boolean().default(false),
  price: z.coerce.number().optional(),
  is_published: z.boolean().default(true),
  feature_key: z.string().optional(),
  short_description: z.string().max(200, 'Máximo 200 caracteres').optional(),
  body_markdown: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface TrainingContent {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_minutes: number | null;
  category: string | null;
  display_order: number;
  is_premium?: boolean;
  price?: number | null;
  checkout_url?: string | null;
  is_published?: boolean;
  feature_key?: string | null;
  short_description?: string | null;
  body_markdown?: string | null;
}

interface ManageContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content?: TrainingContent | null;
  onSuccess: () => void;
}

const CATEGORIES = [
  { value: 'primeiros-passos', label: 'Primeiros Passos' },
  { value: 'gestao', label: 'Gestão' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'vendas', label: 'Vendas' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'premium', label: 'Premium' },
];

export function ManageContentDialog({
  open,
  onOpenChange,
  content,
  onSuccess,
}: ManageContentDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [featureKeyOpen, setFeatureKeyOpen] = useState(false);
  const isEditing = !!content;

  // Fetch existing feature_key assignments
  const { data: existingKeys } = useQuery({
    queryKey: ['training-feature-keys'],
    queryFn: async () => {
      const { data } = await supabase
        .from('training_content')
        .select('id, feature_key, title, is_published')
        .not('feature_key', 'is', null);
      return (data || []) as { id: string; feature_key: string; title: string; is_published: boolean }[];
    },
    staleTime: 30_000,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'primeiros-passos',
      content_type: 'video',
      video_url: '',
      thumbnail_url: '',
      checkout_url: '',
      duration_minutes: undefined,
      display_order: 0,
      is_premium: false,
      price: undefined,
      is_published: true,
      feature_key: '',
      short_description: '',
      body_markdown: '',
    },
  });

  const contentType = form.watch('content_type');
  const isPremium = form.watch('is_premium');

  useEffect(() => {
    if (content) {
      form.reset({
        title: content.title,
        description: content.description || '',
        category: content.category || 'primeiros-passos',
        content_type: content.content_type as 'video' | 'external',
        video_url: content.video_url || '',
        thumbnail_url: content.thumbnail_url || '',
        checkout_url: content.checkout_url || '',
        duration_minutes: content.duration_minutes || undefined,
        display_order: content.display_order,
        is_premium: content.is_premium || false,
        price: content.price || undefined,
        is_published: content.is_published !== false,
        feature_key: content.feature_key || '',
        short_description: content.short_description || '',
        body_markdown: content.body_markdown || '',
      });
    } else {
      form.reset({
        title: '',
        description: '',
        category: 'primeiros-passos',
        content_type: 'video',
        video_url: '',
        thumbnail_url: '',
        checkout_url: '',
        duration_minutes: undefined,
        display_order: 0,
        is_premium: false,
        price: undefined,
        is_published: true,
        feature_key: '',
        short_description: '',
        body_markdown: '',
      });
    }
  }, [content, form]);

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      const payload = {
        title: values.title,
        description: values.description || null,
        category: values.category,
        content_type: values.content_type,
        video_url: values.video_url || null,
        thumbnail_url: values.thumbnail_url || null,
        checkout_url: values.checkout_url || null,
        duration_minutes: values.duration_minutes || null,
        display_order: values.display_order,
        is_premium: values.is_premium,
        price: values.price || null,
        is_published: values.is_published,
        feature_key: values.feature_key || null,
        short_description: values.short_description || null,
        body_markdown: values.body_markdown || null,
      };

      if (isEditing && content) {
        const { error } = await supabase
          .from('training_content')
          .update(payload)
          .eq('id', content.id);

        if (error) throw error;
        toast.success('Conteúdo atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('training_content')
          .insert(payload);

        if (error) throw error;
        toast.success('Conteúdo criado com sucesso!');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Erro ao salvar conteúdo', { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Conteúdo' : 'Novo Conteúdo'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as informações do conteúdo de treinamento.'
              : 'Adicione um novo vídeo ou curso à Slotimob Academy.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Como cadastrar seu primeiro imóvel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o que será abordado neste conteúdo..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Feature Key Combobox */}
            <FormField
              control={form.control}
              name="feature_key"
              render={({ field }) => {
                const featureEntries = Object.entries(HELP_FEATURES) as [FeatureKey, string][];
                const selectedLabel = field.value ? HELP_FEATURES[field.value as FeatureKey] || field.value : '';
                return (
                  <FormItem className="flex flex-col">
                    <FormLabel>Funcionalidade vinculada</FormLabel>
                    <Popover open={featureKeyOpen} onOpenChange={setFeatureKeyOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" role="combobox" className={cn('justify-between font-normal', !field.value && 'text-muted-foreground')}>
                            {field.value ? `${field.value} — ${selectedLabel}` : 'Nenhuma (opcional)'}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar funcionalidade..." />
                          <CommandList>
                            <CommandEmpty>Nenhuma encontrada.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem value="__none__" onSelect={() => { field.onChange(''); setFeatureKeyOpen(false); }}>
                                Nenhuma
                              </CommandItem>
                              {featureEntries.map(([key, label]) => {
                                const existing = existingKeys?.find(e => e.feature_key === key && e.is_published && e.id !== content?.id);
                                return (
                                  <CommandItem key={key} value={key} onSelect={() => { field.onChange(key); setFeatureKeyOpen(false); }}>
                                    <span className="font-mono text-xs mr-2">{key}</span>
                                    <span className="text-sm">{label}</span>
                                    {existing && <Check className="ml-auto h-3 w-3 text-muted-foreground" />}
                                    {field.value === key && <Check className="ml-auto h-4 w-4 text-primary" />}
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {/* Short Description */}
            <FormField
              control={form.control}
              name="short_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição curta (tooltip)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input placeholder="Texto exibido no ícone de ajuda (?)" maxLength={200} {...field} />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                        {(field.value || '').length}/200
                      </span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Body Markdown */}
            <FormField
              control={form.control}
              name="body_markdown"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Texto completo (markdown)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Conteúdo detalhado em markdown (opcional)..." rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Conteúdo *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="video">Vídeo (YouTube)</SelectItem>
                        <SelectItem value="external">Link Externo (Curso)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {contentType === 'video' && (
              <FormField
                control={form.control}
                name="video_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL do Vídeo YouTube</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://www.youtube.com/watch?v=..." 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {contentType === 'external' && (
              <>
                <FormField
                  control={form.control}
                  name="checkout_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link de Checkout (Hotmart/Eduzz)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://pay.hotmart.com/..." 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="thumbnail_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL do Banner</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://exemplo.com/banner.jpg" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duration_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração (minutos)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="15" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="display_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ordem de Exibição</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">Conteúdo Premium</p>
                <p className="text-sm text-muted-foreground">
                  Marque se este é um curso pago
                </p>
              </div>
              <FormField
                control={form.control}
                name="is_premium"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {isPremium && (
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço (R$)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="297.00" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">Publicado</p>
                <p className="text-sm text-muted-foreground">
                  Desmarque para salvar como rascunho
                </p>
              </div>
              <FormField
                control={form.control}
                name="is_published"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? 'Salvar Alterações' : 'Criar Conteúdo'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
