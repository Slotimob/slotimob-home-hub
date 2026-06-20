import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CalendarSync, Copy, RefreshCw, AlertCircle, Check } from "lucide-react";
import { toast } from "sonner";
import { ENV } from "@/config/env";

export function CalendarSyncDialog() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [justRegenerated, setJustRegenerated] = useState(false);

  // Fetch the user's ical_token from profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile-ical-token", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("ical_token")
        .eq("id", user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && open,
  });

  // Mutation to regenerate the token
  const regenerateToken = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("regenerate_ical_token", {
        user_id: user?.id,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile-ical-token"] });
      setJustRegenerated(true);
      toast.success("Link de acesso redefinido com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao redefinir o link de acesso");
    },
  });

  const feedUrl = profile?.ical_token
    ? `${ENV.SUPABASE_URL}/functions/v1/ical-feed?token=${profile.ical_token}`
    : "";

  const handleCopy = async () => {
    if (!feedUrl) return;
    
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      toast.success("Link copiado para a área de transferência!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar o link");
    }
  };

  const handleRegenerate = () => {
    regenerateToken.mutate();
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) setJustRegenerated(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CalendarSync className="h-4 w-4" />
          <span className="hidden sm:inline">Sincronizar</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarSync className="h-5 w-5" />
            Sincronize sua agenda
          </DialogTitle>
          <DialogDescription>
            Copie o link abaixo e adicione como "Assinatura de Calendário" no seu 
            Google Calendar, Outlook ou iPhone. Suas visitas e tarefas aparecerão 
            automaticamente lá.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* URL Input with Copy Button */}
          <div className="flex gap-2">
            <Input
              readOnly
              value={isLoading ? "Carregando..." : feedUrl}
              className="font-mono text-xs"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
              disabled={isLoading || !feedUrl}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          {justRegenerated && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Link renovado.</strong> Remova o link antigo dos seus apps de calendário e adicione o novo link acima.
              </AlertDescription>
            </Alert>
          )}

          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              A sincronização pode levar até 24h para atualizar dependendo do 
              serviço (Google/Apple). Eventos novos aparecerão automaticamente.
            </AlertDescription>
          </Alert>

          {/* Regenerate Token Section */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium mb-1">Segurança</p>
                <p className="text-sm text-muted-foreground">
                  Ao revogar, o link atual para de funcionar imediatamente em todos os dispositivos.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={regenerateToken.isPending}
                    className="text-destructive hover:text-destructive hover:bg-destructive/5 shrink-0"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${regenerateToken.isPending ? 'animate-spin' : ''}`} />
                    Revogar e gerar novo link
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Revogar link de sincronização?</AlertDialogTitle>
                    <AlertDialogDescription>
                      O link atual vai <strong>parar de funcionar imediatamente</strong> em todos os aplicativos de calendário onde foi adicionado (Google Calendar, Outlook, iPhone, etc.).<br /><br />
                      Após gerar o novo link, você precisará removê-lo dos seus apps e adicionar o novo manualmente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRegenerate}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Sim, revogar e gerar novo
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
