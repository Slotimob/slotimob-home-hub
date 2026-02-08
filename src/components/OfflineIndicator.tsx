import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useQueryClient } from '@tanstack/react-query';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        // Auto-sync when coming back online
        handleSync();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      // Invalidate all queries to force refresh
      await queryClient.invalidateQueries();
      setWasOffline(false);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isOnline && !wasOffline) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            {!isOnline ? (
              <Badge
                variant="outline"
                className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 gap-1.5 py-1"
              >
                <WifiOff className="h-3 w-3" />
                <span className="hidden sm:inline text-xs">Offline</span>
              </Badge>
            ) : wasOffline ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs text-primary"
                onClick={handleSync}
                disabled={isSyncing}
              >
                <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Sincronizar</span>
              </Button>
            ) : null}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {!isOnline ? (
            <p>Você está offline. Os dados em cache estão disponíveis.</p>
          ) : (
            <p>Clique para sincronizar dados após reconexão.</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
