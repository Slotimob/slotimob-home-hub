import { HelpCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useHelpContent } from '@/hooks/useHelpContent';
import { HELP_FEATURES, type FeatureKey } from '@/lib/help-features';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface HelpTooltipProps {
  featureKey: FeatureKey;
  size?: 'sm' | 'md';
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

function HelpBody({
  featureKey,
  onNavigate,
}: {
  featureKey: FeatureKey;
  onNavigate: () => void;
}) {
  const { content, isLoading, hasContent } = useHelpContent(featureKey);
  const navigate = useNavigate();
  const label = HELP_FEATURES[featureKey];

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    );
  }

  const title = content?.title || label;
  const description =
    content?.short_description ||
    content?.description ||
    'Conteúdo em breve.';

  return (
    <div className="space-y-3">
      <p className="font-semibold text-sm">{title}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      {hasContent && content?.video_url ? (
        <Button
          size="sm"
          className="w-full gap-1.5"
          onClick={() => {
            onNavigate();
            navigate(`/training?feature=${featureKey}`);
          }}
        >
          Ver vídeo <ArrowRight className="h-3 w-3" />
        </Button>
      ) : !hasContent ? (
        <p className="text-[11px] text-muted-foreground italic">Conteúdo em breve.</p>
      ) : null}
    </div>
  );
}

export function HelpTooltip({ featureKey, size = 'sm', side = 'top', className }: HelpTooltipProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const label = HELP_FEATURES[featureKey];
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  const trigger = (
    <button
      type="button"
      aria-label={`Ajuda sobre ${label}`}
      className={cn(
        'inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors',
        className,
      )}
      onClick={() => setOpen(true)}
    >
      <HelpCircle className={iconSize} />
    </button>
  );

  if (isMobile) {
    return (
      <>
        {trigger}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>{label}</SheetTitle>
            </SheetHeader>
            <div className="py-4">
              <HelpBody featureKey={featureKey} onNavigate={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent side={side} className="w-80 p-4" align="start">
        <HelpBody featureKey={featureKey} onNavigate={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
