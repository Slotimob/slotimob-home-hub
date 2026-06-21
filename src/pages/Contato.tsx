import { useState } from 'react';
import { MessageCircle, Mail, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SEOHead } from '@/components/SEOHead';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { FooterSection } from '@/components/landing/FooterSection';

export default function Contato() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: 'Suporte',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }
    toast.success('Mensagem enviada! Retornaremos em breve.');
    setForm({ name: '', email: '', subject: 'Suporte', message: '' });
  };

  return (
    <>
      <SEOHead
        title="Contato - Slotimob"
        description="Fale com a equipe do Slotimob. WhatsApp, e-mail e formulário para suporte, parcerias e imprensa."
        path="/contato"
      />
      <div className="min-h-screen bg-background">
        <LandingHeader />

        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">
                Fale com a gente
              </h1>
              <p className="text-lg text-muted-foreground">
                Estamos aqui para ajudar. Escolha o canal que preferir.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-10">
              {/* Esquerda — formas de contato */}
              <div className="space-y-6">
                <div className="rounded-xl border border-border bg-card p-6">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-accent/10 text-accent">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">WhatsApp</h3>
                      <p className="text-sm text-muted-foreground">Resposta em até 2h</p>
                    </div>
                  </div>
                  <Button
                    asChild
                    className="bg-accent hover:bg-accent/90 text-accent-foreground w-full"
                  >
                    <a
                      href="https://wa.me/5511999999999"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" /> Falar no WhatsApp
                    </a>
                  </Button>
                </div>

                <div className="rounded-xl border border-border bg-card p-6">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-accent/10 text-accent">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">E-mail</h3>
                      <a
                        href="mailto:contato@slotimob.com.br"
                        className="text-sm text-accent hover:underline"
                      >
                        contato@slotimob.com.br
                      </a>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Para parcerias, suporte técnico e imprensa.
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-card p-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-accent/10 text-accent">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Horário</h3>
                      <p className="text-sm text-muted-foreground">
                        Seg-Sex, 9h–18h (horário de Brasília)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Direita — formulário */}
              <form
                onSubmit={handleSubmit}
                className="rounded-xl border border-border bg-card p-6 space-y-4"
              >
                <div>
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="subject">Assunto</Label>
                  <Select
                    value={form.subject}
                    onValueChange={(v) => setForm({ ...form, subject: v })}
                  >
                    <SelectTrigger id="subject">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Suporte">Suporte</SelectItem>
                      <SelectItem value="Parceria">Parceria</SelectItem>
                      <SelectItem value="Imprensa">Imprensa</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="message">Mensagem *</Label>
                  <Textarea
                    id="message"
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
                >
                  Enviar mensagem
                </Button>
              </form>
            </div>
          </div>
        </main>

        <FooterSection />
      </div>
    </>
  );
}
