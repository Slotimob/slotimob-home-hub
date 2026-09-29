import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md border border-border/60 bg-muted/80 p-1 text-muted-foreground",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, forwardedRef) => {
  // O Radix aponta aria-controls para o painel mesmo quando ele não está montado
  // (aba inativa). Remove o atributo enquanto a aba estiver inativa.
  const innerRef = React.useRef<HTMLButtonElement | null>(null);
  React.useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const sync = () => {
      const id = el.getAttribute("aria-controls") || el.dataset.ariaControls;
      if (!id) return;
      el.dataset.ariaControls = id;
      const exists = !!document.getElementById(id);
      if (exists && !el.hasAttribute("aria-controls")) el.setAttribute("aria-controls", id);
      if (!exists && el.hasAttribute("aria-controls")) el.removeAttribute("aria-controls");
    };
    sync();
    const obs = new MutationObserver(() => requestAnimationFrame(sync));
    obs.observe(el, { attributes: true, attributeFilter: ["data-state", "aria-controls"] });
    return () => obs.disconnect();
  }, []);
  const setRef = (node: HTMLButtonElement | null) => {
    innerRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
  };
  return (
  <TabsPrimitive.Trigger
    ref={setRef}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:ring-1 data-[state=active]:ring-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  />
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
