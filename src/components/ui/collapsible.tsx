import * as React from "react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { useAriaControlsGuard } from "@/hooks/useAriaControlsGuard";

const Collapsible = CollapsiblePrimitive.Root;

const CollapsibleTrigger = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.CollapsibleTrigger>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleTrigger>
>((props, forwardedRef) => {
  const innerRef = useAriaControlsGuard<HTMLButtonElement>();
  const setRef = (node: HTMLButtonElement | null) => {
    innerRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
  };
  return <CollapsiblePrimitive.CollapsibleTrigger ref={setRef} {...props} />;
});
CollapsibleTrigger.displayName = CollapsiblePrimitive.CollapsibleTrigger.displayName;

const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent;

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
