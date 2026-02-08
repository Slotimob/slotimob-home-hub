import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Volume2, Vibrate, Smartphone } from 'lucide-react';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export function NotificationSettings() {
  const { preferences, loading, updatePreference } = useNotificationPreferences();

  const handleToggle = async (key: 'soundEnabled' | 'vibrationEnabled' | 'pushEnabled', value: boolean) => {
    try {
      await updatePreference(key, value);
      toast.success('Preferência atualizada');
    } catch (error) {
      toast.error('Erro ao atualizar preferência');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  const isPushSupported = 'serviceWorker' in navigator && 'PushManager' in window;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notificações
        </CardTitle>
        <CardDescription>
          Configure como você deseja receber notificações
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Volume2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label htmlFor="sound" className="text-base">Som</Label>
              <p className="text-sm text-muted-foreground">
                Tocar som ao receber notificações
              </p>
            </div>
          </div>
          <Switch
            id="sound"
            checked={preferences.soundEnabled}
            onCheckedChange={(checked) => handleToggle('soundEnabled', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Vibrate className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label htmlFor="vibration" className="text-base">Vibração</Label>
              <p className="text-sm text-muted-foreground">
                Vibrar ao receber notificações (dispositivos móveis)
              </p>
            </div>
          </div>
          <Switch
            id="vibration"
            checked={preferences.vibrationEnabled}
            onCheckedChange={(checked) => handleToggle('vibrationEnabled', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label htmlFor="push" className="text-base">Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                {isPushSupported 
                  ? 'Receber notificações mesmo com o app fechado'
                  : 'Não suportado neste navegador'
                }
              </p>
            </div>
          </div>
          <Switch
            id="push"
            checked={preferences.pushEnabled}
            onCheckedChange={(checked) => handleToggle('pushEnabled', checked)}
            disabled={!isPushSupported}
          />
        </div>
      </CardContent>
    </Card>
  );
}
