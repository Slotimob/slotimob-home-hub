import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Link2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface UtmLinkRow {
  id: string;
  canal: string;
  formato: string;
  campanha: string;
  conteudo: string | null;
  full_url: string;
  created_by_email: string | null;
  created_at: string;
}

const FORMATOS: Record<string, { value: string; label: string }[]> = {
  youtube: [
    { value: 'video', label: 'Descrição do vídeo' },
    { value: 'comment', label: 'Comentário fixado' },
    { value: 'endscreen', label: 'Card / tela final' },
  ],
  instagram: [
    { value: 'bio', label: 'Link da bio' },
    { value: 'story', label: 'Stories' },
    { value: 'post', label: 'Legenda de post' },
    { value: 'reels', label: 'Reels' },
  ],
  tiktok: [
    { value: 'bio', label: 'Link da bio' },
    { value: 'video', label: 'Legenda do vídeo' },
  ],
  outro: [
    { value: 'message', label: 'Mensagem direta' },
    { value: 'email', label: 'Newsletter / e-mail' },
    { value: 'referral', label: 'Outro' },
  ],
};

const DESTINOS = [
  { label: 'Home', value: 'https://slotimob.com.br/' },
  { label: 'Planos', value: 'https://slotimob.com.br/planos' },
  { label: 'Blog', value: 'https://slotimob.com.br/blog' },
  { label: 'Apresentação', value: 'https://slotimob.com.br/apresentacao' },
  { label: 'Sobre', value: 'https://slotimob.com.br/sobre' },
  { label: 'Contato', value: 'https://slotimob.com.br/contato' },
  { label: 'Personalizado', value: 'custom' },
];

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function CockpitUtmTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [canal, setCanal] = useState('youtube');
  const [formato, setFormato] = useState(FORMATOS.youtube[0].value);
  const [outroSource, setOutroSource] = useState('whatsapp');
  const [campanha, setCampanha] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [destinoPreset, setDestinoPreset] = useState(DESTINOS[0].value);
  const [destinoCustom, setDestinoCustom] = useState('https://slotimob.com.br/');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: historico, isLoading } = useQuery({
    queryKey: ['utm-links'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('utm_links')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data as UtmLinkRow[]) || [];
    },
  });

  const source = canal === 'outro' ? (slugify(outroSource) || 'outro') : canal;
  const destinoBase = destinoPreset === 'custom' ? destinoCustom.trim() : destinoPreset;
  const campanhaSlug = slugify(campanha);
  const conteudoSlug = slugify(conteudo);

  const montarUrl = (): string => {
    if (!destinoBase) return '';
    let url: URL;
    try {
      url = new URL(destinoBase);
    } catch {
      return '';
    }
    url.searchParams.set('utm_source', source);
    url.searchParams.set('utm_medium', formato);
    if (campanhaSlug) url.searchParams.set('utm_campaign', campanhaSlug);
    if (conteudoSlug) url.searchParams.set('utm_content', conteudoSlug);
    return url.toString();
  };

  const urlGerada = montarUrl();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!urlGerada || !campanhaSlug) throw new Error('Preencha a campanha antes de salvar.');
      const { error } = await supabase.from('utm_links').insert({
        canal: source,
        formato,
        campanha: campanhaSlug,
        conteudo: conteudoSlug || null,
        destino_url: destinoBase,
        full_url: urlGerada,
        created_by: user?.id,
        created_by_email: user?.email,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Link salvo no histórico.');
      queryClient.invalidateQueries({ queryKey: ['utm-links'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Erro ao salvar link.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('utm_links').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utm-links'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Erro ao remover link.'),
  });

  const copiar = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Gerador de links UTM</h2>
        <p className="text-sm text-muted-foreground">
          Monta o link certo pra usar fora do site (YouTube, Instagram, TikTok, WhatsApp...), sempre no mesmo padrão, pra aparecer organizado no GA4. Nunca use UTM em link interno do site — só em links que saem pra fora.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Novo link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Canal</Label>
              <Select value={canal} onValueChange={(v) => { setCanal(v); setFormato(FORMATOS[v][0].value); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="outro">Outro (WhatsApp, newsletter...)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {canal === 'outro' && (
              <div className="space-y-2">
                <Label>Qual canal</Label>
                <Input value={outroSource} onChange={(e) => setOutroSource(e.target.value)} placeholder="whatsapp, newsletter..." />
              </div>
            )}

            <div className="space-y-2">
              <Label>Onde vai o link</Label>
              <Select value={formato} onValueChange={setFormato}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FORMATOS[canal].map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Página de destino</Label>
              <Select value={destinoPreset} onValueChange={setDestinoPreset}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DESTINOS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {destinoPreset === 'custom' && (
              <div className="space-y-2 sm:col-span-2">
                <Label>URL personalizada</Label>
                <Input value={destinoCustom} onChange={(e) => setDestinoCustom(e.target.value)} placeholder="https://slotimob.com.br/blog/nome-do-post" />
              </div>
            )}

            <div className="space-y-2 sm:col-span-2">
              <Label>Nome da campanha (obrigatório)</Label>
              <Input value={campanha} onChange={(e) => setCampanha(e.target.value)} placeholder="lancamento-planos-agosto" />
              {campanha && <p className="text-xs text-muted-foreground">vira: {campanhaSlug}</p>}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Variação (opcional)</Label>
              <Input value={conteudo} onChange={(e) => setConteudo(e.target.value)} placeholder="thumbnail-a, cta-topo..." />
            </div>
          </div>

          <div className="rounded-lg bg-muted p-4 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Link gerado</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm break-all">{urlGerada || 'preencha os campos acima'}</code>
                <Button variant="outline" size="sm" onClick={() => copiar(urlGerada, 'novo')} disabled={!urlGerada} className="gap-1 shrink-0">
                  {copiedId === 'novo' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedId === 'novo' ? 'copiado' : 'copiar'}
                </Button>
              </div>
            </div>
            <Button onClick={() => mutation.mutate()} disabled={!urlGerada || !campanhaSlug || mutation.isPending} size="sm" className="gap-2">
              <Link2 className="h-4 w-4" />
              {mutation.isPending ? 'Salvando...' : 'Salvar no histórico'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Histórico</CardTitle>
          <CardDescription className="text-xs">Links salvos por qualquer pessoa do time com acesso ao Cockpit</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Canal</TableHead>
                    <TableHead>Campanha</TableHead>
                    <TableHead>Link</TableHead>
                    <TableHead>Criado por</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(historico || []).map((h) => (
                    <TableRow key={h.id}>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">{h.canal}/{h.formato}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{h.campanha}</TableCell>
                      <TableCell className="max-w-xs">
                        <code className="text-xs truncate block">{h.full_url}</code>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{h.created_by_email || '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copiar(h.full_url, h.id)}>
                            {copiedId === h.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteMutation.mutate(h.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!historico || historico.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhum link gerado ainda.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
