import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Cookie } from 'lucide-react';
import {
  COOKIE_PREFERENCES_OPEN_EVENT,
  readCookieConsent,
  useCookieConsent,
} from '@/hooks/useCookieConsent';

export function CookieConsent() {
  const { consent, hasChoice, save } = useCookieConsent();
  const [visible, setVisible] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  // Show the bar only when there is no saved choice
  useEffect(() => {
    setVisible(!hasChoice);
  }, [hasChoice]);

  // Allow reopening the preferences dialog from anywhere (footer link)
  useEffect(() => {
    const handler = () => {
      const saved = readCookieConsent();
      setAnalytics(!!saved?.analytics);
      setMarketing(!!saved?.marketing);
      setDialogOpen(true);
    };
    window.addEventListener(COOKIE_PREFERENCES_OPEN_EVENT, handler);
    return () => window.removeEventListener(COOKIE_PREFERENCES_OPEN_EVENT, handler);
  }, []);

  const acceptAll = () => {
    save({ analytics: true, marketing: true });
    setVisible(false);
  };

  const rejectAll = () => {
    save({ analytics: false, marketing: false });
    setVisible(false);
  };

  const openCustomize = () => {
    setAnalytics(!!consent?.analytics);
    setMarketing(!!consent?.marketing);
    setDialogOpen(true);
  };

  const savePreferences = () => {
    save({ analytics, marketing });
    setDialogOpen(false);
    setVisible(false);
  };

  return (
    <>
      {visible && (
        <div
          role="region"
          aria-label="Aviso de cookies"
          className="fixed bottom-0 left-0 right-0 z-[100] border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-lg"
        >
          <div className="container max-w-5xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-start gap-3 flex-1">
              <Cookie className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Usamos cookies para o funcionamento do site e, mediante seu consentimento, para
                analytics (Google Analytics) e publicidade (Google Ads e Meta Ads).{' '}
                <Link to="/legal?tab=privacy" className="text-primary hover:underline font-medium">
                  Saiba mais
                </Link>
                .
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:shrink-0">
              <Button size="sm" onClick={acceptAll} className="flex-1 md:flex-none">
                Aceitar todos
              </Button>
              <Button size="sm" onClick={rejectAll} className="flex-1 md:flex-none">
                Rejeitar não essenciais
              </Button>
              <Button size="sm" variant="outline" onClick={openCustomize} className="flex-1 md:flex-none">
                Personalizar
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="h-5 w-5 text-primary" />
              Preferências de Cookies
            </DialogTitle>
            <DialogDescription>
              Escolha quais categorias de cookies você autoriza. Você pode alterar essa escolha a
              qualquer momento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Necessários</Label>
                <p className="text-xs text-muted-foreground">
                  Essenciais para o funcionamento do site (sessão, segurança, sua escolha de
                  cookies). Não podem ser desativados.
                </p>
              </div>
              <Switch checked disabled aria-label="Cookies necessários (sempre ativos)" />
            </div>

            <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
              <div className="space-y-1">
                <Label htmlFor="cookie-analytics" className="text-sm font-medium">
                  Analytics
                </Label>
                <p className="text-xs text-muted-foreground">
                  Google Analytics: entender como os visitantes navegam pelo site.
                </p>
              </div>
              <Switch
                id="cookie-analytics"
                checked={analytics}
                onCheckedChange={setAnalytics}
              />
            </div>

            <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
              <div className="space-y-1">
                <Label htmlFor="cookie-marketing" className="text-sm font-medium">
                  Marketing
                </Label>
                <p className="text-xs text-muted-foreground">
                  Google Ads e Meta Ads (Meta Pixel): mensuração de campanhas e remarketing.
                </p>
              </div>
              <Switch
                id="cookie-marketing"
                checked={marketing}
                onCheckedChange={setMarketing}
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={savePreferences} className="w-full sm:w-auto">
              Salvar preferências
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
