import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

/**
 * A TabsList wrapper that enables horizontal scrolling on mobile
 * with a fade indicator when content overflows.
 */
const ScrollableTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, children, ...props }, ref) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [showFade, setShowFade] = React.useState(false);

  const checkOverflow = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth;
    const isAtEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    setShowFade(hasOverflow && !isAtEnd);
  }, []);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkOverflow();
    el.addEventListener("scroll", checkOverflow, { passive: true });
    const ro = new ResizeObserver(checkOverflow);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkOverflow);
      ro.disconnect();
    };
  }, [checkOverflow]);

  return (
    <div className="relative w-full">
      <div
        ref={scrollRef}
        className="overflow-x-auto scrollbar-hide"
      >
        <TabsPrimitive.List
          ref={ref}
          className={cn(
            "inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground w-max min-w-full",
            className,
          )}
          {...props}
        >
          {children}
        </TabsPrimitive.List>
      </div>
      {/* Fade indicator */}
      {showFade && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-muted/80 to-transparent pointer-events-none rounded-r-md" />
      )}
    </div>
  );
});
ScrollableTabsList.displayName = "ScrollableTabsList";

export { ScrollableTabsList };
