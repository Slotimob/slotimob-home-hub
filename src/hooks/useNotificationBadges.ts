import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface BadgeCounts {
  leads: number;
  pipeline: number;
  schedule: number;
  whatsapp: number;
}

interface NotificationPrefs {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

const NOTIFICATION_SOUND_URL = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQkWXqjY4LqFGgY/mNfkqXYLBFmu2+a0fx0DN5TV5ad0DQNZrd3ms38gBDiT1OamcQ0DWa3d5rN/IgQ6k9PmpnENBFmu3eayfyQFO5LT5qZxDgNYrd3ms34mBTyR0uamcQ8DVa3d5rF+KAU+kNHmpXESA1Ws3OWxfSoGQI/Q5aRxFANTq9zlsH0sBkGOz+SkcBYDUavb5K99LgdCjc7ko28YA0+q2uOufTAIQ4zN46NuGgNNqdnjrXwyCkWLzOKibRwDTKjY4ax7NAxGisvhoWwfA0qn1+GrezYNR4nK4KBrIQNIptbgqno4DkmIyN+faiQDRqXV36l5Og9Kh8fenGknA0Sk1N6oeDwRTIbG3ZtpKgNCoNPdp3c+Ek2FxdyaaCwDQJ/S3KZ2QBNOhMTbmGcvAz6e0dundjJUlMbbmWgyAz2c0NqldTYXUIPC2pZnNAM7m8/ZpHQ4GFKCwdmVZjcDOZrO2KNzOhlTgcDYkmU6AzaYzdelcjwbVYC/14tlPQM0l8zWo3E/HViAv9eJZD8DMpXL1aJwQR9af77WhWNBAzCUytWgcEQgXH692oNjRAMuk8nUn29GIl59vNuBY0cDLJHI0p5uSSRffrvbgGNKAyqQx9GdbEsmYX262n5jTQMoj8bQnGtNKGN8udl8Yk8DJ47Fz5pqUCllertcdFJQBiWNxM6ZaVIrZ3m52HthVAMjjMPNmGhVLWl4uNd5YVcDIYvCzJdnVzBrebfWd2FaAx+JwcuVZloybHi21nZhXQMdiL/KlGVdNW53tdV1YV8DHIe/yZNkYDdwdrTUc2FiAxqGvsiSY2I5cXWz03JhZQMYhL3IkGJlO3N0stJxYWgDFoO8x49haD50crHRcGFqAxSDvMaNYGs/dXGw0G9hbQMShLvGjGBtQXdwr89tYW8DEYW7xolgcEN4b67PbGFxAw+Fu8WIYHJFeG6tz2thcwMNhrrFh2B0R3ltrM5qYXUDC4a6xIZgdkl6bKvNaWF3AwmGusSFYHlLe2uqzGhhegMHhrnEhGB7TXxqqstnYXwDBYW5xINgfk9+aamLZmF/AwOFuMSCX4BRf2ioymVhgQMBhbjDgV+DVoBop8lkYYQD/4S3w4BfhViBaKbJY2GGA/2EtsOAXodag2emyGJhiAP7hLbCf16JXoRmp8dhYYsD+YO1wn5ejGCFZabGYGGNA/eDtcJ+XpBihmSmxl9hjwP1g7TBfl6SZIdkpcVeYZED84OzwX1el2WIY6TFXWGUAvGCs8F9Xppni2OjxFxhlgLvgrLAfV6daoxjo8NbYZkC7YKywH1eoGyOY6LDWWGZA+uCscB8XqNukWOhwlhhmwLogbHAe16mcdNioMFXYZ0C5oGwv3tfqXPVYp/AVmGfAuSAsL97XrR+3WGev1RhogLhgK6+el+7gOZhnL5SYaMC3oCuvntfvoP0YJq9UGGmAtx/rb59X8GG/GCZvE9hqALaf6y+fF/EiQRhlrtNYaoC2H+svnxfx4sNYZS6S2GtAtV+q718X8qNFWGTuUlhrwLTfqu8e1/OkB5hkbhHYbIC0X6qvHtf0pInYY+3RmG0As9+qrt7X9WUMGGNtURhtwLNfam7e1/YljlhirRCYboCy32ouXpf3JlBYYezQWG9Ash9p7h5X+CbSmGEsj5hvwLGfKa4eV/jnVNhgrE8YcICxHymt3lf5p9dYH+wOmHFAsJ8pbZ4X+qhZmB9rzhhxwLAfaW1d1/tomxge605YcsCvX2ks3Zf8KV0YHqsN2HOArp9o7J1X/OnfGB4qzVh0QK4fKKxc1/2qoRgdao0YdQCtn2irnJf+ayNYHKpM2HWAR==';

export function useNotificationBadges() {
  const { user } = useAuth();
  const [badges, setBadges] = useState<BadgeCounts>({
    leads: 0,
    pipeline: 0,
    schedule: 0,
    whatsapp: 0,
  });
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    soundEnabled: true,
    vibrationEnabled: true,
  });
  const previousBadges = useRef<BadgeCounts>(badges);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch notification preferences
  useEffect(() => {
    if (!user) return;

    const fetchPrefs = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('notification_sound_enabled, notification_vibration_enabled')
        .eq('id', user.id)
        .single();

      if (data) {
        setPrefs({
          soundEnabled: data.notification_sound_enabled ?? true,
          vibrationEnabled: data.notification_vibration_enabled ?? true,
        });
      }
    };

    fetchPrefs();

    // Listen for preference changes
    const channel = supabase
      .channel(`profile-prefs-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const newData = payload.new as any;
          setPrefs({
            soundEnabled: newData.notification_sound_enabled ?? true,
            vibrationEnabled: newData.notification_vibration_enabled ?? true,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const playNotificationSound = useCallback(() => {
    if (!prefs.soundEnabled) return;
    
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
        audioRef.current.volume = 0.3;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.error);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }, [prefs.soundEnabled]);

  const triggerVibration = useCallback(() => {
    if (!prefs.vibrationEnabled) return;
    
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  }, [prefs.vibrationEnabled]);

  const notifyNewData = useCallback(() => {
    playNotificationSound();
    triggerVibration();
  }, [playNotificationSound, triggerVibration]);

  const fetchBadgeCounts = useCallback(async () => {
    if (!user) return;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [leadsResult, pipelineResult, scheduleResult, whatsappResult] = await Promise.all([
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('broker_id', user.id)
        .gte('created_at', sevenDaysAgo.toISOString()),
      supabase
        .from('deals')
        .select('id', { count: 'exact', head: true })
        .eq('broker_id', user.id)
        .in('stage', ['new_lead', 'in_contact']),
      supabase
        .from('visits')
        .select('id', { count: 'exact', head: true })
        .eq('broker_id', user.id)
        .eq('status', 'scheduled')
        .gte('scheduled_at', new Date().toISOString()),
      supabase
        .from('whatsapp_conversations')
        .select('unread_count')
        .gt('unread_count', 0),
    ]);

    const totalUnread = whatsappResult.data?.reduce((acc, conv) => acc + conv.unread_count, 0) || 0;

    const newBadges = {
      leads: leadsResult.count || 0,
      pipeline: pipelineResult.count || 0,
      schedule: scheduleResult.count || 0,
      whatsapp: totalUnread,
    };

    setBadges(newBadges);
    return newBadges;
  }, [user]);

  useEffect(() => {
    if (!user) return;

    fetchBadgeCounts();

    // Set up realtime subscriptions
    const leadsChannel = supabase
      .channel(`leads-changes-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
          filter: `broker_id=eq.${user.id}`,
        },
        () => {
          fetchBadgeCounts().then((newBadges) => {
            if (newBadges && newBadges.leads > previousBadges.current.leads) {
              notifyNewData();
            }
            previousBadges.current = newBadges || previousBadges.current;
          });
        }
      )
      .subscribe();

    const dealsChannel = supabase
      .channel(`deals-changes-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deals',
          filter: `broker_id=eq.${user.id}`,
        },
        () => {
          fetchBadgeCounts().then((newBadges) => {
            if (newBadges && newBadges.pipeline > previousBadges.current.pipeline) {
              notifyNewData();
            }
            previousBadges.current = newBadges || previousBadges.current;
          });
        }
      )
      .subscribe();

    const visitsChannel = supabase
      .channel(`visits-changes-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'visits',
          filter: `broker_id=eq.${user.id}`,
        },
        () => {
          fetchBadgeCounts().then((newBadges) => {
            if (newBadges && newBadges.schedule > previousBadges.current.schedule) {
              notifyNewData();
            }
            previousBadges.current = newBadges || previousBadges.current;
          });
        }
      )
      .subscribe();

    const whatsappChannel = supabase
      .channel('whatsapp-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_conversations',
        },
        () => {
          fetchBadgeCounts().then((newBadges) => {
            if (newBadges && newBadges.whatsapp > previousBadges.current.whatsapp) {
              notifyNewData();
            }
            previousBadges.current = newBadges || previousBadges.current;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(dealsChannel);
      supabase.removeChannel(visitsChannel);
      supabase.removeChannel(whatsappChannel);
    };
  }, [user, fetchBadgeCounts, notifyNewData]);

  return badges;
}
