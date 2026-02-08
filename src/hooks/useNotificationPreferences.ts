import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface NotificationPreferences {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  pushEnabled: boolean;
}

export function useNotificationPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    soundEnabled: true,
    vibrationEnabled: true,
    pushEnabled: false,
  });
  const [loading, setLoading] = useState(true);

  const fetchPreferences = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('notification_sound_enabled, notification_vibration_enabled, push_subscription')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setPreferences({
        soundEnabled: data?.notification_sound_enabled ?? true,
        vibrationEnabled: data?.notification_vibration_enabled ?? true,
        pushEnabled: !!data?.push_subscription,
      });
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updatePreference = useCallback(async (key: keyof NotificationPreferences, value: boolean) => {
    if (!user) return;

    const columnMap: Record<string, string> = {
      soundEnabled: 'notification_sound_enabled',
      vibrationEnabled: 'notification_vibration_enabled',
    };

    if (key === 'pushEnabled') {
      // Handle push subscription separately
      if (value) {
        await subscribeToPush();
      } else {
        await unsubscribeFromPush();
      }
      return;
    }

    const column = columnMap[key];
    if (!column) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [column]: value })
        .eq('id', user.id);

      if (error) throw error;

      setPreferences(prev => ({ ...prev, [key]: value }));
    } catch (error) {
      console.error('Error updating preference:', error);
    }
  }, [user]);

  const subscribeToPush = useCallback(async () => {
    if (!user || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications not supported');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      const vapidKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
      const applicationServerKey = urlBase64ToUint8Array(vapidKey);
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });

      const subscriptionJson = subscription.toJSON();
      const subscriptionData = {
        endpoint: subscriptionJson.endpoint,
        keys: subscriptionJson.keys,
        expirationTime: subscriptionJson.expirationTime,
      };

      const { error } = await supabase
        .from('profiles')
        .update({ push_subscription: subscriptionData })
        .eq('id', user.id);

      if (error) throw error;

      setPreferences(prev => ({ ...prev, pushEnabled: true }));
      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      return false;
    }
  }, [user]);

  const unsubscribeFromPush = useCallback(async () => {
    if (!user) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }

      const { error } = await supabase
        .from('profiles')
        .update({ push_subscription: null })
        .eq('id', user.id);

      if (error) throw error;

      setPreferences(prev => ({ ...prev, pushEnabled: false }));
      return true;
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      return false;
    }
  }, [user]);

  return {
    preferences,
    loading,
    updatePreference,
    subscribeToPush,
    unsubscribeFromPush,
  };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
