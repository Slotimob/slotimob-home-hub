import { ReactNode, useEffect } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { BottomNavigation } from '@/components/BottomNavigation';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { useWhatsAppGlobalListener } from '@/hooks/useWhatsAppGlobalListener';
import { supabase } from '@/integrations/supabase/client';
import { ApprovalStatusBanner } from '@/components/approvals/ApprovalStatusBanner';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  titleExtra?: ReactNode;
  headerActions?: ReactNode;
  /** Full-height content without main padding/scroll (chat-like screens) */
  fullBleed?: boolean;
}

export function AppLayout({ children, title, titleExtra, headerActions, fullBleed = false }: AppLayoutProps) {

  useWhatsAppGlobalListener();

  // Sync theme from user profile — only inside authenticated pages
  useEffect(() => {
    let cancelled = false;

    const syncTheme = async (userId: string) => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('theme_preference')
          .eq('id', userId)
          .maybeSingle();

        if (!cancelled && data?.theme_preference) {
          localStorage.setItem('slotimob-theme', data.theme_preference);
          document.documentElement.setAttribute('data-theme', data.theme_preference);
        }
      } catch {
        // fail silently
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) {
        void syncTheme(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user?.id) {
          void syncTheme(session.user.id);
        }
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);
  return (
    <SidebarProvider>
      <div className="min-h-[100dvh] flex w-full bg-gradient-to-br from-primary/5 via-background to-accent/10 pb-16 md:pb-0">
        <AppSidebar />

        <div className="flex-1 min-w-0 flex flex-col">
          {/* Header */}
          <header className="border-b bg-card sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
            <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 gap-1 sm:gap-2">
              <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
                <SidebarTrigger className="flex-shrink-0" />
                {title && (
                  <h1 className="text-base sm:text-lg md:text-xl font-bold whitespace-nowrap truncate max-w-[120px] sm:max-w-[200px] md:max-w-none">
                    {title}
                  </h1>
                )}
                {titleExtra}
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 flex-shrink-0">
                <OfflineIndicator />
                {headerActions}
              </div>
            </div>
          </header>
          <ApprovalStatusBanner />
          {/* Main Content */}
          <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-4 py-6 pb-24 md:pb-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>

      <BottomNavigation />
    </SidebarProvider>
  );
}